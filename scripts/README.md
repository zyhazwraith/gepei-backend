# 脚本目录说明

该目录只保留少量可维护脚本，避免与 `tests/` 自动化体系重叠。

## 核心脚本（建议纳入交接测试路径）
- `test-idempotency-cas.ts`

## 运维工具脚本
- `tool-setup-admin.ts`
- `tool-reset-db.ts`
- `release-pack.sh`（按指定 Git ref 打包发布产物，自动注入版本与提交信息）
- `deploy-workingtree-remote.sh`（将当前工作区打包上传到远端服务器，并保留 `.env`、`uploads`、`node_modules` 等运行期目录）

## 交接建议
- 核心交接优先包含：
  - `tests/integration/*`（活跃回归）
  - `tests/e2e/*`（前端 E2E）
  - `scripts/test-idempotency-cas.ts`
- 运维初始化可按需执行 `tool-setup-admin.ts` 与 `tool-reset-db.ts`。

## `release-pack.sh` 快速说明

```bash
# 默认打 binary 包，输出到 /tmp/gepei-releases
./scripts/release-pack.sh origin/release

# 打 source 包（不构建）
./scripts/release-pack.sh origin/release --type source

# 同时打 source + binary
./scripts/release-pack.sh origin/release --type both --out-dir /tmp/gepei-releases

# 如需强制要求工作区干净（否则失败）
./scripts/release-pack.sh origin/release --strict-clean
```

说明：
- 版本号来源：仓库根目录 `VERSION`
- 元信息注入：`release-manifest.json`（包含 version / commit / build time / ref）
- 校验文件：每个产物会生成对应 `.sha256`
- 默认允许脏工作区，但产物只包含目标 ref 的已提交内容

## 部署自动化说明

仓库内保留了通用部署脚本：

```bash
DEPLOY_HOST=<host> \
DEPLOY_SSH_KEY=/path/to/key.pem \
DEPLOY_APP_DIR=/home/<runtime-user>/gepei-backend \
./scripts/deploy-workingtree-remote.sh
```

也可以用 CLI 参数传入目标：

```bash
./scripts/deploy-workingtree-remote.sh \
  --host <host> \
  --ssh-user root \
  --runtime-user <runtime-user> \
  --ssh-key /path/to/key.pem \
  --app-dir /home/<runtime-user>/gepei-backend \
  --pm2-app gepei-app
```

注意：目标机器 IP、SSH key 路径、生产 `.env`、证书、上传文件等运行期资产不写入 Git。
