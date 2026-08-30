# 轻练本地客户沙盒与小程序 DevTools 模式设计

状态：已获产品负责人确认，待实现
关联：GitHub Issue #29

## 1. 目标

微信 AppID 暂时不可用时，仍让一名教练在本地验证真实客户闭环：一次性邀请、开发身份登录、分项同意、结构化建档、等待教练发布、读取已发布计划、训练/饮食/饮水打卡、身体反馈和删除申请。

本次交付包含两个入口：

1. 浏览器本地客户沙盒 `/sandbox`，用于快速演示和 API 联调。
2. 原生微信小程序的显式 `devMode`，用于在 DevTools 中运行同一客户流程。

两个入口共用现有客户 API 和 `DEV_MODE` 服务端身份适配，不复制业务状态机。AppID 就绪后，只切换登录适配器到 `wx.login` + `code2Session`。

## 2. 不解决的问题

- 不实现真实微信 AppID、AppSecret、`code2Session`、微信审核或真机验收。
- 不把开发身份开放到生产 API；生产环境继续拒绝 `devOpenid`。
- 不改变教练确认、Codex CLI、计划校验、审核发布、版本化、打卡、反馈、告警或删除的业务规则。
- 不引入支付、多教练、多租户、客户公开注册、聊天或自动诊断。

## 3. 用户体验

### 3.1 浏览器沙盒

页面顶部固定显示“本地沙盒 · 非生产”，并显示当前 API 目标为 localhost。页面使用轻练现有暖色卡片视觉，但不伪装成微信正式页面。

状态流：

```text
输入邀请口令
  -> 接受邀请 + 本地开发身份登录
  -> 同意健康资料/第三方模型/提醒说明
  -> 填写结构化资料
  -> 等待教练确认或计划发布
  -> 读取已发布计划
  -> 今日训练/餐食/提醒 + 打卡
  -> 三项身体反馈；疼痛为“有”显示停止提示
```

沙盒需要提供：

- 邀请口令输入和清晰的错误状态（过期、已使用、无效）。
- 分步同意，必需项未完成时不能提交建档。
- 最小资料表单：目标、训练经验、身高、体重；其他风险字段保持安全默认值并明确“如有特殊情况联系教练”。
- 等待状态：资料待确认、计划待发布、尚无已发布计划，均不显示草案或 provider 信息。
- 已发布计划：当天动作（GIF/文字降级、目标肌群、器械、组数、次数、要领）、餐次及每项 kcal、提醒和当天合计。
- 至少一个训练/餐次/饮水完成控件，以及 pain/energy/hunger 反馈控件。
- 删除申请入口和本地会话清除入口；清除只移除浏览器本地 token，不伪造服务端删除结果。

### 3.2 小程序 DevTools 模式

`apps/miniprogram/app.js` 增加显式配置：

```js
devMode: false,
devOpenid: 'openid-local-sandbox'
```

仅当 `devMode === true` 且 `apiBaseUrl` 的主机为 `localhost` 或 `127.0.0.1` 时，onboarding 使用接受邀请返回的 `client.id` 生成作用域身份，并以以下请求调用 `/api/wx/auth/login`：

```json
{
  "devOpenid": "openid-local-sandbox:<client.id>",
  "devClientId": "<client.id>",
  "invitationToken": "<口令>"
}
```

服务端只在本地开发条件满足时读取这两个开发字段，并强制 `devClientId === invitation.clientId`、`devOpenid` 以该 `client.id` 结尾；任一不匹配都返回 `INVITATION_INVALID`（403），不得为请求中的任意客户 ID 建立会话。否则仍必须调用 `wx.login`，并不发送 `devOpenid`。

配置不通过任何线上环境变量自动开启。README 明确提醒：DevTools 结果不是微信身份或真机证据。

## 4. 组件与边界

### 4.1 Web 沙盒模块

- `app/sandbox/page.tsx`：只负责本地客户状态、表单和页面编排。
- `app/sandbox/sandbox.css`：复用全局 token，提供手机宽度和桌面预览布局。
- 小型 API client：带当前 client session 的请求、稳定错误转译、日期处理；不复制 `server/api/handlers.ts` 的业务规则。
- 子视图：`InviteStep`、`ConsentStep`、`ProfileStep`、`WaitingState`、`TodayView` 可留在同一页文件内，只有在测试或文件长度需要时再拆分。

### 4.2 小程序适配边界

- 只改 `apps/miniprogram/app.js`、`pages/onboarding/onboarding.js/.wxml/.wxss`，以及必要时的 `utils/api.js` 登录适配配置；不新增业务 API。
- `utils/api.js` 继续负责会话 header；不在客户端存 AppSecret、教练 token 或 Codex 凭证。
- 今日、日历、个人页继续调用现有 API，不新增一套 dev-only API。

### 4.3 服务端边界

本次不新增生产路由。服务端只保留当前已存在的本地条件：`DEV_MODE=true` 或 localhost 请求可使用 `devOpenid`，且仅接受与已消费邀请的 `client.id` 严格绑定的 `devClientId`/作用域 `devOpenid`；错绑返回 `INVITATION_INVALID`（403）。生产环境没有 `DEV_MODE` 时，缺少真实微信 code 仍返回 `WECHAT_LOGIN_REQUIRED`。新增测试锁定这些边界。

## 5. 数据流

### 浏览器沙盒

```text
localStorage: fit_plan_sandbox_session
      |
      v
/api/invitations/accept  -> /api/wx/auth/login(devOpenid, devClientId)
      |
      v
session token -> /api/me, /api/me/profile, /api/me/consents
      |
      v
/api/plan/today, /api/plans/calendar, /api/checkins, /api/wellness-feedback
```

开发 OpenID 使用固定的本地演示前缀加客户 ID 作用域，且服务端同时校验邀请归属，避免不同客户在同一内存 API 中意外共用身份。沙盒不把 token 写入 URL、日志或 issue。浏览器沙盒默认请求当前页面同源的 `/api`；不实现跨源 CORS，若 API origin 与页面不一致则显示本地沙盒不可用，不尝试发送开发身份。

### 小程序 DevTools

```text
devMode + localhost -> devOpenid path
otherwise          -> wx.login code path
```

两条路径在 `/api/wx/auth/login` 之后得到同一种客户 session 和同一页面响应形状。

## 6. 错误与安全

- 非 localhost 页面访问 `/sandbox` 时只展示“本地沙盒不可用”说明，不尝试开发登录，也不泄露 token。
- API 401/403/409/422 映射成用户可理解的中文状态；原始 provider、OpenID、健康值和堆栈不展示。
- 未登录、会话过期、邀请失效、无已发布计划分别显示对应下一步；不会把空数据伪装成“已完成”。
- 反馈提交失败时回滚本地乐观状态；疼痛提示只说明停止相关动作并联系教练，不做诊断或自动替换。
- 删除按钮只调用现有 `DELETE /api/me`；成功后清除本地 session，并明确这是服务端申请已记录，不宣称已立即清除。
- 生产测试必须证明 `devOpenid` 仍被拒绝；开发测试必须证明相同身份仅可绑定邀请返回的客户。

## 7. 验证计划

### 自动化

- 渲染测试：`/sandbox` 输出本地沙盒标识、邀请入口、非生产提示和主要状态文案；页面不包含真实密钥或私有 Sites 地址。
- 小程序合同测试：`devMode` 配置存在但默认关闭；生产配置路径仍要求 `wx.login`，API origin 仍使用占位符。
- API 集成测试：已有邀请/开发登录/同意/建档/发布/客户读取/打卡/反馈链路继续通过；新增开发 `devClientId`/作用域 `devOpenid` 错绑返回 `INVITATION_INVALID`，以及生产环境 `devOpenid` 拒绝断言。
- lint、TypeScript、build、gitleaks 全部通过。

### 人工浏览器检查

本地 server 启动后，在 `/coach` 创建邀请并完成一次发布，再用 `/sandbox` 粘贴口令验证：

1. 邀请接受和开发身份登录。
2. 必要同意与资料提交。
3. 未发布时的等待状态不泄露草案。
4. 发布后动作 GIF/文字降级、餐食 kcal、提醒和打卡。
5. 疼痛反馈提示及教练告警。
6. 清除会话后回到邀请入口。

小程序 DevTools 只记录编译/运行观察，不把它标记为真实微信或真机证据。

## 8. 完成定义

Issue #29 只有在两个入口都能复用同一 API 逻辑、自动化检查全绿、浏览器沙盒完成一次端到端本地流程、生产身份边界未放宽时才关闭。AppID、微信审核、D1 生产恢复和真实设备仍保留在 Issue #25，不因本地沙盒完成而改变 `partial/unknown` 状态。
