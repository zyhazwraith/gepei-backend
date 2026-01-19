
## 用户反馈修复任务

- [x] 删除登录页面的“验证码登录”Tab（符合MVP最简设计）
- [x] 在个人中心添加退出登录按钮
- [x] 测试退出登录功能

## UI视觉问题修复

- [x] 修复注册页面顶部横幅遮挡文字问题
- [x] 优化个人中心菜单卡片间距（mb-4 → mb-2）
- [x] 优化个人中心菜单项padding（py-3.5 → py-2.5）
- [x] 优化个人中心图标容器大小（w-10 → w-8）
- [x] 优化所有表单页面字段间距（space-y-6 → space-y-4）
- [x] 对照设计稿验证所有页面视觉效果

## FP-005: 地陪认证功能

### 后端任务
- [x] 设计guides表结构（id_number, nickname, city, avatar_url, photos, hourly_price, intro, tags）
- [x] 实现身份证号格式验证（18位，简单校验）
- [x] 实现PUT /api/v1/guides/profile API
- [x] 实现认证状态管理（id_verified_at字段）
- [ ] 编写单元测试

### 前端任务
- [x] 创建地陪资料编辑页面（/guide-edit）
- [x] 实现表单（身份证号、昵称、城市、头像、照片、价格、介绍、技能标签）
- [x] 实现身份证号验证
- [x] 实现照片上传（调用S3）
- [x] 实现API调用（PUT /guides/profile）
- [x] 实现成功提示和页面跳转

## FP-005修正任务（根据用户反馈）

### 第一步：固化现有文档
- [x] 将技术文档目录提交到git作为基线版本

### 第二步：修改补充技术文档
- [x] 修改API设计文档V1.2 → V1.3（PUT改POST，添加upload和users/profile接口）
- [x] 修改架构设计文档V1.0 → V1.1（补充文件上传方案）

### 第三步：修正后端代码
- [x] 实现POST /api/v1/upload接口（本地文件系统+Express静态服务）
- [x] 实现POST /api/v1/users/profile接口（更新用户资料）
- [x] 修改PUT /guides/profile → POST /guides/profile
- [x] 修正guides接口：nickname → name，删除avatar_url

### 第四步：修正前端代码
- [x] GuideEdit页面：删除头像上传（头像是用户公共功能）
- [x] GuideEdit页面：添加真实姓名输入框
- [x] GuideEdit页面：实现城市搜索功能
- [x] GuideEdit页面：修改API调用（PUT → POST）

## 紧急修复：登录接口404错误

- [x] 检查后端路由配置
- [x] 检查auth.routes是否正确注册
- [x] 测试登录接口
- [x] 修复__dirname问题（ES模块不支持）
