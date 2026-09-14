# 轻练 Registry

> 当前快照，可整体替换。历史依据见 `decision-log.md` 与 GitHub issue/PR。截至 2026-09-14。

## 现在在哪里

**开发执行权**：2026-09-14 起由 Codex 移交 Claude。开发事实源为 GitHub `zinan92/get-fit`（issue 即合同，一 issue 一 PR）。

**线上**：https://fit-plan-mockup.parkzz.chatgpt.site（ChatGPT Sites 私有托管，owner-only，未登录请求返回 401）

| 位置 | 提交 | 说明 |
|---|---|---|
| Sites 线上 v23 | `4676b96` | v3 视觉已上线 |
| GitHub `main` | 领先线上 3 个提交 | 含 #1 构建修复、#2 日期条修复、#5 本文档 |

**差距原因**：部署远端是 Sites 的 git（`git.chatgpt-team.site`），接手方机器没有它的凭据，无法推送。

**已具备的能力**

- 单教练闭环 API：邀请 → 登录 → 同意/建档 → 计划生成交接 → 草案编辑 → 发布 → 版本化；打卡、疼痛告警、提醒授权、30 天删除清扫。
- 计划校验器：只允许目录内动作/食物 ID，拒绝未知字段，kcal 由服务端按目录与克数重算。
- 客户端只读已发布计划；草案、生成原始输出不进入客户端响应。
- Web 客户三页（今天 / 月计划 / 我的）为 v3 视觉：手绘带脸的食物与动作角色（含循环动画）、歪斜待命点击弹正的打卡框、实时进度环、只保留训练橙/饮食绿两个语义色。设计源：`design/fit-plan-v3.html`。
- 原生小程序页面骨架（`apps/miniprogram/`），尚未采用 v3 视觉，未部署。
- 安全：dev 身份（`dev-coach`、`devClientId`、`devOpenid`）只认服务端 `DEV_MODE`，不认请求 Host；两条回归测试锁定。

**验证**：全新 clone 下 `npm test` 7 渲染 + 21 API 全过，`tsc`、`lint`、`gitleaks` 通过。`tests/miniprogram-contract.test.mjs` 与 `tests/pilot-preflight.test.mjs` 未纳入 `npm test`。

**状态**：代码闭环 `verified`；微信登录 / 真实 D1 读写 / 首位客户验收 `partial/unknown`；健康数据上线合规评估 `blocked`。

## 下一步

**需要 Park 决策（阻塞）**

1. **部署通路**：Sites 远端无凭据 → GitHub 上的修复无法上线。选项：给接手方 Sites 推送权限 / 保留 Codex 只做部署同步 / 迁出 Sites。
2. **客户 API 落点**：Sites 是 owner-only 私有托管，永远服务不了小程序。公开客户 API 可部署到 Park 自有 Cloudflare 账号（会是独立的新应用与新 D1，不是更新现有部署）；小程序正式环境还受 ICP 备案域名约束，微信云开发可能绕开，需调研后决定。

**已知产品 / 架构缺口（未开票）**

- 内容：动作库只有 3 个真动作 + 快走，食物 12 种；30 天计划必然高度重复。需教练本人扩库。
- 生成：计划生成需要教练在自己电脑上运行 `codex exec` 再回传 JSON，真实教练无法操作。
- 风控：`hasManualRisk` 对任何非空伤病/过敏 flag 都返回 true，导致生成直接 409，普通小伤忌口的客户生不出计划。
- 存储：全部数据存为 D1 单行加密快照，每个请求整读整写，`revision` 不参与比较 → 并发写入会静默丢失。
- 统计：审计日志只保留最后 500 条，而"客户打开天数"从审计日志反推 → 试用成功标准的核心数字会被截断。
- 校验：热量下限为固定 800 kcal，不随客户体征变化；不校验训练频率与休息日。

**首客试用成功标准**（沿用）：打开 ≥ 5 天、打卡 ≥ 3 次、教练资料确认到发布 ≤ 15 分钟、所有疼痛告警有人工处理。
