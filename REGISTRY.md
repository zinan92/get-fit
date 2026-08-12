# Fit Plan Mockup Registry

## 现在在哪里

- M0 已合并：共享 `plan.v1`/目录/kcal/同意契约、19 张 Drizzle/D1 表、3 份迁移、原生小程序边界与 secret runbook。
- M1 已合并：单教练闭环 API、教练 Web `/coach`、客户今日/30 天日历/资料页、DeepSeek JSON adapter、双层计划校验、教练审核发布、版本化、打卡/疼痛告警、提醒授权和 30 天删除清扫。
- 客户端只读 published plan；draft/provider/raw prompt/completion 不会进入客户端响应。食物 kcal 由本地目录按份量计算。
- Codex CLI 仅为教练明确点击后的一次性本机 fallback；同一校验器、仍需审核，Worker 不会自动执行。
- 本地 HTTP flow 已验证：`/api/health`、邀请、登录、同意/建档、DeepSeek 未配置 fail-closed、fallback 导入、发布、客户端 today kcal；`npm test` 8 tests、lint、tsc、gitleaks 均通过。
- 私有 Sites 版本已部署成功：https://fit-plan-mockup.parkzz.chatgpt.site（owner-only/custom 访问策略；外部未登录请求返回 401，页面/生产 API 未做匿名可见性宣称）。
- 状态：代码闭环 `verified`；真实 Cloudflare D1/Worker secret/微信登录/DeepSeek 线上调用 `unknown`；DeepSeek 数据驻留/保留与健康数据上线合规评估 `blocked`。

## 下一步

- 配置并验证生产 Worker secrets：`DATA_ENCRYPTION_KEY`、DeepSeek key/model、WeChat AppID/AppSecret、教练认证；应用 `drizzle/` migrations，完成一次 D1 恢复演练。
- 用低风险成年真实客户完成 7 天验收：打开 ≥5 天、打卡 ≥3 次、教练发布 ≤15 分钟；逐项留审计证据。
- 在确认 DeepSeek 供应商数据保留/地域/训练条款与微信审核要求前，不声称 production-ready；未通过时保持 `partial/unknown` 并允许教练手工计划。
