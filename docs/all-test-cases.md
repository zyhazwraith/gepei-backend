# 全量测试用例清单

本文档汇总了当前代码库中维护的所有测试用例，涵盖端到端 (E2E) 测试和集成 (Integration) 测试。

## 1. 端到端测试 (E2E Tests)
*路径: `tests/e2e/*.spec.ts`*
*框架: Playwright*

| 测试套件 (Suite) | 测试用例 (Test Case) | 文件名 | 备注 |
| :--- | :--- | :--- | :--- |
| **Admin Dashboard Flow** | should login as admin | `admin.spec.ts` | 管理员登录 |
| | should view user list | `admin.spec.ts` | 查看用户列表 |
| | should view order list | `admin.spec.ts` | 查看订单列表 |
| **Authentication & User Profile** | should register a new user successfully | `auth.spec.ts` | 用户注册 |
| | should login with the new user | `auth.spec.ts` | 用户登录 |
| | should view and edit profile | `auth.spec.ts` | 查看/编辑个人资料 |
| **Guide Application Flow** | should apply to become a guide | `guide-application.spec.ts` | 申请成为地陪 (表单提交) |
| **Guides List Filtering** | should filter by city AND keyword combined | `guides-filter.spec.ts` | 列表筛选 (城市+关键词) |
| **Admin Login Interaction** | should send login request when clicking login button | `login-interaction.spec.ts` | 登录按钮交互 |
| **Order Flow** | should create a CUSTOM order via full flow | `order-flow.spec.ts` | 创建定制订单 |
| | should create a NORMAL order via mocked flow | `order-flow.spec.ts` | 创建普通订单 (Mock) |
| **Transaction Flow** | should register user first | `transaction.spec.ts` | 交易前注册 |
| | should complete the full booking flow | `transaction.spec.ts` | 完整预订流程 (首页->下单->支付) |

## 2. 集成测试 (Integration Tests)
*路径: `tests/integration/*.ts`*
*框架: 自研脚本 (Axios + Helper)*

| 功能模块 | 测试点 (Test Points) | 文件名 | 状态 |
| :--- | :--- | :--- | :--- |
| **Core API** | 1. 用户注册与登录 (Register & Login)<br>2. 获取个人信息 (Get Me)<br>3. 地陪认证提交 (Guide Verification) | `test-core-api.ts` | Active |
| **Booking Flow** | 1. 创建地陪与用户<br>2. 创建普通订单 (Normal Booking)<br>3. 创建定制订单 (Custom Booking)<br>4. 校验自预订拦截 (Self-booking check)<br>5. 校验无效地陪ID (Invalid Guide ID) | `test-booking-flow.ts` | Active |
| **Payment Flow** | 1. 创建订单<br>2. 验证初始状态 (Pending)<br>3. 支付订单 (Mock Wechat)<br>4. 验证支付后状态 (Paid) | `test-payment-flow.ts` | Active |
| **LBS Flow** | 1. 更新地陪坐标 (Update Coordinates)<br>2. 距离计算准确性 (Distance Calc)<br>3. 无坐标时的列表行为 (List w/o Coords) | `test-lbs-flow.ts` | Active |
| **Admin Flow** | 1. 获取用户列表 (Fetch User List)<br>2. 获取订单列表 (Fetch Order List) | `test-admin-flow.ts` | Active |
| **Admin Search** | 1. 按订单号搜索 (Search by Order Number)<br>2. 按手机号搜索 (Search by Phone) | `test-admin-search.ts` | Active |
| **Guide Assignment** | *[Deprecated]* 管理员指派地陪 (Assign Multiple Guides) | `test-guide-assignment.ts` | **Deprecated** (逻辑已移除) |

## 3. 单元/混合测试 (Unit/Hybrid Tests)
*路径: `tests/*.test.ts`*
*框架: Vitest + Supertest*

| 测试套件 | 测试用例 | 文件名 | 备注 |
| :--- | :--- | :--- | :--- |
| **Custom Order Feature** | should return 400 for invalid input (content length) | `custom_order.test.ts` | 校验内容长度 |
| | should return 400 for invalid date format | `custom_order.test.ts` | 校验日期格式 |
| | should create custom order successfully | `custom_order.test.ts` | 创建成功验证 (查DB) |
| | should pay for the order successfully | `custom_order.test.ts` | 支付成功验证 |

## 4. 维护建议
1.  **废弃清理**: 建议删除 `tests/integration/test-guide-assignment.ts`，因为 `assignGuide` 接口已从 Admin Controller 中移除。
2.  **V2 适配**: `test-core-api.ts` 和 `test-booking-flow.ts` 涉及地陪创建和订单创建，需重点关注其对 `guideId` (-> `userId`) 和 `hourlyPrice` (-> `expectedPrice`) 的适配情况。
3.  **技术栈统一**: 目前存在 `Axios 脚本` 和 `Vitest` 两种集成测试方式，建议长期看统一迁移到 `Vitest` 以获得更好的报告和并发支持。
