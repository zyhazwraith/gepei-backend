#!/usr/bin/env bash

set -euo pipefail

log() {
  echo "[release-pack] $*"
}

die() {
  echo "[release-pack] ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  scripts/release-pack.sh [git-ref] [--type source|binary|both] [--out-dir DIR] [--no-fetch] [--strict-clean]

Examples:
  scripts/release-pack.sh origin/release --type binary
  scripts/release-pack.sh v1.0.3 --type both --out-dir /opt/releases/gepei
  scripts/release-pack.sh --no-fetch --type source

Notes:
  - Version comes from repo root VERSION file.
  - Package metadata is injected into release-manifest.json.
  - Default output dir is /tmp/gepei-releases (outside project folder).
EOF
}

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO_ROOT" ]] || die "Not inside a git repository."

REF="HEAD"
PACKAGE_TYPE="binary"
OUT_DIR="${RELEASE_OUTPUT_DIR:-/tmp/gepei-releases}"
DO_FETCH=1
STRICT_CLEAN=0
POSITIONAL_REF_SET=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type)
      [[ $# -ge 2 ]] || die "--type requires a value."
      PACKAGE_TYPE="$2"
      shift 2
      ;;
    --out-dir)
      [[ $# -ge 2 ]] || die "--out-dir requires a value."
      OUT_DIR="$2"
      shift 2
      ;;
    --no-fetch)
      DO_FETCH=0
      shift
      ;;
    --strict-clean)
      STRICT_CLEAN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "Unknown option: $1"
      ;;
    *)
      if [[ "$POSITIONAL_REF_SET" -eq 1 ]]; then
        die "Only one positional git ref is supported."
      fi
      REF="$1"
      POSITIONAL_REF_SET=1
      shift
      ;;
  esac
done

case "$PACKAGE_TYPE" in
  source|binary|both) ;;
  *)
    die "--type must be one of: source, binary, both"
    ;;
esac

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  if [[ "$STRICT_CLEAN" -eq 1 ]]; then
    die "Working tree is not clean. Commit/stash changes or remove --strict-clean."
  fi
  log "Warning: working tree is dirty. Packaging still uses committed ref ${REF} only."
fi

if [[ "$DO_FETCH" -eq 1 ]]; then
  log "Fetching latest refs..."
  git -C "$REPO_ROOT" fetch --all --prune --tags
fi

COMMIT="$(git -C "$REPO_ROOT" rev-parse --verify "${REF}^{commit}" 2>/dev/null || true)"
[[ -n "$COMMIT" ]] || die "Cannot resolve ref: $REF"
SHORT_COMMIT="$(git -C "$REPO_ROOT" rev-parse --short=12 "$COMMIT")"

WORKTREE_DIR="$(mktemp -d /tmp/gepei-pack-worktree-XXXXXX)"
STAGE_DIR="$(mktemp -d /tmp/gepei-pack-stage-XXXXXX)"

cleanup() {
  git -C "$REPO_ROOT" worktree remove --force "$WORKTREE_DIR" >/dev/null 2>&1 || true
  rm -rf "$STAGE_DIR" >/dev/null 2>&1 || true
}
trap cleanup EXIT

git -C "$REPO_ROOT" worktree add --detach "$WORKTREE_DIR" "$COMMIT" >/dev/null

VERSION_FILE="$WORKTREE_DIR/VERSION"
[[ -f "$VERSION_FILE" ]] || die "VERSION file not found at repo root in ref $REF."
VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
[[ -n "$VERSION" ]] || die "VERSION file is empty."

BUILD_TIME_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
STAMP_UTC="$(date -u +"%Y%m%dT%H%M%SZ")"

mkdir -p "$OUT_DIR"

write_manifest() {
  local target_dir="$1"
  local artifact_type="$2"
  cat > "${target_dir}/release-manifest.json" <<EOF
{
  "version": "${VERSION}",
  "commit": "${COMMIT}",
  "shortCommit": "${SHORT_COMMIT}",
  "ref": "${REF}",
  "builtAtUtc": "${BUILD_TIME_UTC}",
  "artifactType": "${artifact_type}"
}
EOF
}

copy_if_exists() {
  local from="$1"
  local to="$2"
  if [[ -e "$from" ]]; then
    cp -a "$from" "$to"
  fi
}

pack_source() {
  local package_root="${STAGE_DIR}/source"
  local artifact="${OUT_DIR}/gepei-v${VERSION}-${SHORT_COMMIT}-${STAMP_UTC}-source.tar.gz"

  mkdir -p "$package_root"
  git -C "$REPO_ROOT" archive --format=tar "$COMMIT" | tar -xf - -C "$package_root"
  write_manifest "$package_root" "source"

  tar -czf "$artifact" -C "$package_root" .
  sha256sum "$artifact" > "${artifact}.sha256"
  echo "$artifact"
}

pack_binary() {
  local package_root="${STAGE_DIR}/binary"
  local artifact="${OUT_DIR}/gepei-v${VERSION}-${SHORT_COMMIT}-${STAMP_UTC}-binary.tar.gz"

  log "Installing dependencies and building in isolated worktree..."
  (
    cd "$WORKTREE_DIR"
    npm ci
    npm run build
  )

  mkdir -p "$package_root"

  copy_if_exists "${WORKTREE_DIR}/dist" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/package.json" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/package-lock.json" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/.npmrc" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/.env.example" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/VERSION" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/drizzle" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/drizzle.config.ts" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/DEPLOY.md" "$package_root/"
  copy_if_exists "${WORKTREE_DIR}/README.md" "$package_root/"

  write_manifest "$package_root" "binary"

  tar -czf "$artifact" -C "$package_root" .
  sha256sum "$artifact" > "${artifact}.sha256"
  echo "$artifact"
}

log "Packaging ref=${REF} commit=${SHORT_COMMIT} version=${VERSION} type=${PACKAGE_TYPE}"

ARTIFACTS=()
if [[ "$PACKAGE_TYPE" == "source" || "$PACKAGE_TYPE" == "both" ]]; then
  ARTIFACTS+=("$(pack_source)")
fi

if [[ "$PACKAGE_TYPE" == "binary" || "$PACKAGE_TYPE" == "both" ]]; then
  ARTIFACTS+=("$(pack_binary)")
fi

log "Done. Generated artifacts:"
for artifact in "${ARTIFACTS[@]}"; do
  log "  - ${artifact}"
  log "  - ${artifact}.sha256"
done
