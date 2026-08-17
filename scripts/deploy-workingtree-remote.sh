#!/usr/bin/env bash

set -euo pipefail

log() {
  echo "[deploy-workingtree-remote] $*"
}

die() {
  echo "[deploy-workingtree-remote] ERROR: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy-workingtree-remote.sh [options]

Options:
  --host <host>              Remote host (or $DEPLOY_HOST)
  --ssh-user <user>          SSH user (default: $DEPLOY_SSH_USER or root)
  --runtime-user <user>      Runtime user for app operations (default: $DEPLOY_RUNTIME_USER or admin)
  --ssh-key <path>           SSH private key path (or $DEPLOY_SSH_KEY)
  --app-dir <path>           Remote app dir (or $DEPLOY_APP_DIR)
  --pm2-app <name>           PM2 process name (default: $DEPLOY_PM2_APP or gepei-app)
  --health-url <url>         Health URL checked on remote (default: $DEPLOY_HEALTH_URL or http://127.0.0.1:3000/health)
  --out-dir <path>           Local temp output dir (default: /tmp)
  --keep-local-artifact      Keep local artifact after deployment
  -h, --help                 Show help

Notes:
  - Deploys the current local working tree snapshot.
  - Preserves remote runtime-managed paths: .env, uploads, node_modules.
  - Target host, SSH key, and app directory must be provided by env vars or CLI args.
EOF
}

HOST="${DEPLOY_HOST:-}"
SSH_USER="${DEPLOY_SSH_USER:-root}"
RUNTIME_USER="${DEPLOY_RUNTIME_USER:-admin}"
SSH_KEY="${DEPLOY_SSH_KEY:-}"
APP_DIR="${DEPLOY_APP_DIR:-}"
PM2_APP="${DEPLOY_PM2_APP:-gepei-app}"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3000/health}"
OUT_DIR="/tmp"
KEEP_LOCAL_ARTIFACT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --ssh-user) SSH_USER="$2"; shift 2 ;;
    --runtime-user) RUNTIME_USER="$2"; shift 2 ;;
    --ssh-key) SSH_KEY="$2"; shift 2 ;;
    --app-dir) APP_DIR="$2"; shift 2 ;;
    --pm2-app) PM2_APP="$2"; shift 2 ;;
    --health-url) HEALTH_URL="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --keep-local-artifact) KEEP_LOCAL_ARTIFACT=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$HOST" ]] || die "Missing --host or DEPLOY_HOST."
[[ -n "$SSH_KEY" ]] || die "Missing --ssh-key or DEPLOY_SSH_KEY."
[[ -n "$APP_DIR" ]] || die "Missing --app-dir or DEPLOY_APP_DIR."
[[ -f "$SSH_KEY" ]] || die "SSH key not found: $SSH_KEY"
chmod 600 "$SSH_KEY" || true

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ -n "$REPO_ROOT" ]] || die "Must run inside a git repository."

TS="$(date +%Y%m%d-%H%M%S)"
ARTIFACT="${OUT_DIR%/}/gepei-workingtree-${TS}.tar.gz"
ARTIFACT_BASENAME="$(basename "$ARTIFACT")"

mkdir -p "$OUT_DIR"

log "Preparing working-tree artifact..."
(
  cd "$REPO_ROOT"
  tar -czf "$ARTIFACT" \
    --exclude=.git \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=uploads \
    --exclude=.env \
    --exclude=.env.* \
    .
)
log "Artifact created: $ARTIFACT"

REMOTE_ARTIFACT="/home/${RUNTIME_USER}/${ARTIFACT_BASENAME}"

log "Uploading artifact to ${SSH_USER}@${HOST}:${REMOTE_ARTIFACT} ..."
scp -i "$SSH_KEY" "$ARTIFACT" "${SSH_USER}@${HOST}:${REMOTE_ARTIFACT}"

log "Running remote deployment as ${RUNTIME_USER} ..."
ssh -i "$SSH_KEY" "${SSH_USER}@${HOST}" \
  "sudo -iu ${RUNTIME_USER} env APP_DIR='${APP_DIR}' PM2_APP='${PM2_APP}' HEALTH_URL='${HEALTH_URL}' ARTIFACT='${REMOTE_ARTIFACT}' TS='${TS}' bash -s" <<'EOF'
set -euo pipefail

REL_DIR="/home/${USER}/releases/workingtree-${TS}"
BACKUP_DIR="/home/${USER}/releases/predeploy-backup-$(date +%Y%m%d-%H%M%S)"

mkdir -p "/home/${USER}/releases"
rm -rf "$REL_DIR"
mkdir -p "$REL_DIR"
tar -xzf "$ARTIFACT" -C "$REL_DIR"

mkdir -p "$BACKUP_DIR"
cp -a "$APP_DIR/dist" "$BACKUP_DIR/" 2>/dev/null || true
cp -a "$APP_DIR/package.json" "$BACKUP_DIR/" 2>/dev/null || true
cp -a "$APP_DIR/package-lock.json" "$BACKUP_DIR/" 2>/dev/null || true

rsync -a --delete \
  --exclude=.env \
  --exclude=uploads \
  --exclude=node_modules \
  --exclude=.git \
  "$REL_DIR"/ "$APP_DIR"/

cd "$APP_DIR"
npm install
npm run build
echo "[deploy-marker] deploy_start ts=$TS app=$PM2_APP artifact=$(basename "$ARTIFACT")"
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  pm2 start dist/server/server.js --name "$PM2_APP" --update-env
fi
echo "[deploy-marker] deploy_done ts=$TS app=$PM2_APP"
sleep 2
curl -fsS "$HEALTH_URL"
echo
pm2 list | sed -n '1,12p'
echo "backup_dir=$BACKUP_DIR"
echo "release_dir=$REL_DIR"
EOF

if [[ "$KEEP_LOCAL_ARTIFACT" -eq 0 ]]; then
  rm -f "$ARTIFACT"
fi

log "Deployment completed successfully."
