# 轻练微信小程序客户端

这是原生微信小程序客户端的 V1 代码表面。它只调用 `/api`，不保存任何模型/CLI 凭证，也不接触教练后台接口。

开发者工具中把 `apiBaseUrl` 配成已批准的客户 API origin；不要填教练私有 Sites 地址。本地联调时可使用 `http://localhost:3000` 并在 Worker 的 `DEV_MODE=true` 下使用开发登录。

如果暂时没有微信 AppID，可以在本地 DevTools 配置中把 `devMode` 改为 `true`，并保持 `apiBaseUrl` 为 `http://localhost...`。onboarding 会用邀请返回的客户 ID 生成 `openid-local-sandbox:<client.id>`，调用同一个 `/api/wx/auth/login`；这只在本地地址和显式开发开关同时满足时生效。提交、导出或部署小程序前必须恢复为 `devMode: false`。线上 API 不接受 `devOpenid`。

进入流程：邀请 → 微信登录 → 健康/第三方模型/提醒说明 → 建档 → 等待教练发布 → 今日/30 天日历 → 训练打卡/身体反馈 → 删除申请。

小程序可以不在计划卡片上突出“AI”字样，但同意页会说明自动化工具和第三方模型处理；用户永远只看到教练确认后的发布版本。提醒需要用户单独点击微信订阅授权，未授权不会发送。

首位客户沙盒、真机和七天试用步骤见 [`docs/runbooks/fit-plan-first-client-pilot.md`](../../docs/runbooks/fit-plan-first-client-pilot.md)。
