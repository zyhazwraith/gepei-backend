# O-8A 微信 OpenID 模块设计（JSAPI）

## 1. 目标与边界
目标:
- 在不改手机号账号体系前提下，为 JSAPI 支付提供“本次会话可用”的 `openid`。
- 将微信授权链路封装为独立模块，供支付模块调用。

边界:
- 不在 `users` 表强绑定 `openid`。
- 不承担支付下单、回调记账职责（由支付模块负责）。
- 仅处理 `authCode -> openid`、校验与错误映射。

## 2. 前置依赖
- 可用公众号 `appId` 与 `appSecret`（服务端配置）。
- 已配置网页授权域名（微信侧）。
- H5 页面运行于微信内置浏览器。

## 2.1 配置规范（AppID / AppSecret）
统一环境变量（后端）:
- `WECHAT_OAUTH_APP_ID`
- `WECHAT_OAUTH_APP_SECRET`
- `OPENID_PROVIDER=mock|wechat`

分环境策略:
- `dev/test`: 默认 `OPENID_PROVIDER=mock`，不要求真实 `APP_SECRET`
- `staging/prod`: 使用 `OPENID_PROVIDER=wechat`，必须配置真实 `APP_ID` 与 `APP_SECRET`

启动校验:
1. 当 `OPENID_PROVIDER=wechat` 时，若缺任一配置，服务启动失败（fail fast）
2. 当 `OPENID_PROVIDER=mock` 时，不强制校验微信密钥

运维要求:
- `APP_SECRET` 仅存放服务端环境变量，不进入前端构建，不写入仓库
- 轮换密钥通过环境变量发布，不改代码

## 3. 业务规则
1. 每次支付都必须重新提供 `authCode`。
2. `authCode` 为一次性短时凭证，不可复用。
3. 若 `authCode` 过期/无效，返回“需重新授权”。
4. 获取到的 `openid` 只用于当前支付请求，不与用户主账号绑定。

## 4. 模块接口定义
建议新增服务:
- `server/services/payment/openid.service.ts`

```ts
export interface OpenIdResolveResult {
  openid: string;
  appId: string;
}

export interface IOpenIdProvider {
  resolveOpenIdByCode(code: string): Promise<OpenIdResolveResult>;
}
```

默认实现:
- `MockOpenIdProvider`（本地开发）
- `WechatOpenIdProvider`（实网）

工厂:
- `OPENID_PROVIDER=mock|wechat`
- 使用统一入口 `openIdProvider.resolveOpenIdByCode(code)`

## 5. API 设计（对前端）
OpenID 模块不单独暴露“获取 openid 接口”，而是由支付接口内联调用。

`POST /api/v1/orders/:id/payment` 请求新增字段:
- `authCode: string`（必填）

后端处理顺序:
1. 验证订单与支付资格
2. 调 openid 模块换取 `openid`
3. 把 `openid` 传入支付模块下单

## 6. 微信交互（实网实现）
调用 OAuth 接口:
- `GET https://api.weixin.qq.com/sns/oauth2/access_token`
- 参数:
  - `appid`
  - `secret`
  - `code`
  - `grant_type=authorization_code`

成功响应关键字段:
- `openid`

失败响应关键字段:
- `errcode`
- `errmsg`

## 7. 错误码映射策略
模块内部统一抛业务错误（沿用现有 `ErrorCodes` 数字码体系），建议最小集:
- `WECHAT_REAUTH_REQUIRED`（授权码无效/过期/已使用，需要前端重走 OAuth）
- `WECHAT_CONFIG_ERROR`（appid/secret 等配置异常）
- `WECHAT_TEMP_UNAVAILABLE`（网络异常/超时/微信临时不可用，可短暂重试）
- `WECHAT_UPSTREAM_ERROR`（其余微信业务错误兜底）

微信 `errcode` 映射建议（初版）:
1. `40029/40163/41008` -> `WECHAT_REAUTH_REQUIRED`
2. `40013/40125/40164` -> `WECHAT_CONFIG_ERROR`
3. `-1`、HTTP 超时/5xx -> `WECHAT_TEMP_UNAVAILABLE`
4. 其他 -> `WECHAT_UPSTREAM_ERROR`

对前端返回文案建议:
- `授权已失效，请重新进入支付页面`

前端行为策略:
1. `WECHAT_REAUTH_REQUIRED` 时，自动重走一次 OAuth 授权
2. 自动重试仍失败时，提示用户手动重试
3. 不做无限自动重试

## 8. 安全与日志
- 不打印 `appSecret`、完整 `code`、完整 `openid`。
- 日志仅打印脱敏 `openid`（前3后3）。
- 失败日志记录 `errcode` 便于联调。

## 9. 测试用例
单元测试:
1. `authCode` 正常返回 `openid`
2. `authCode` 失效抛 `WECHAT_REAUTH_REQUIRED`
3. 微信接口超时抛 `WECHAT_TEMP_UNAVAILABLE`
4. provider 工厂按环境变量正确切换

集成测试:
1. `POST /orders/:id/payment` 缺 `authCode` 返回参数错误
2. `authCode` 无效时支付流程中止，不创建预支付单

## 10. 开发任务拆解
1. 新增 `IOpenIdProvider` 抽象与 `MockOpenIdProvider`
2. 新增 `WechatOpenIdProvider`（先写壳子，资质后联调）
3. 在 `payOrder` 入参中增加 `authCode` 校验
4. 在支付创建流程中接入 `openid` 解析调用
5. 补全错误码与日志脱敏

## 11. 已确认决策
1. 不做 `authCode` 短缓存（支付触发频次低，避免引入不必要复杂度）。
2. 失败后前端自动重走一次 OAuth，若仍失败再提示手动重试。
3. 不单独落库记录最近失败原因，依赖现有日志排查。
