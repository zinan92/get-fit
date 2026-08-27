# 轻练 V1 实施路线图

规则：一条 user story = 一张 GitHub issue = 一个 branch = 一个 PR；每个 milestone 完成后从最新 main 开始下一环。以下是规划合同，不代表已开工。

## M0：合同、目录与安全基线

### Story 0.1 · 数据流与风险门

- Goal：冻结数据最小化、同意、删除、特殊风险分流和“未审核不显示”规则。
- Success criteria：数据流图、同意文案版本、删除回执格式、风险 allowlist 和 blocker 清单完成；本机 Codex 数据落盘/回传边界仍未知时标记 blocked。
- In：数据字段、retention、审计、威胁模型。
- Out：任何真实模型调用、真实客户数据。
- 禁区：读取或提交 API key；宣称合规或 production-ready。

### Story 0.2 · 工程骨架与 secrets gate

- Goal：建立 mini-program、coach-web、Worker API、shared contracts、D1 migrations、CI/gitleaks。
- Success criteria：本地假数据可启动；secret 只从环境/Worker Secrets 注入；测试和 schema 检查在 CI 通过。
- In：目录、环境示例、错误码、日志脱敏。
- Out：业务页面和 provider 调用。
- 禁区：secret 写入 `vars`、前端 bundle、日志或测试 fixture。

## M1：身份、邀请与建档

### Story 1.1 · 教练邀请

- Goal：教练创建一次性短期邀请，客户可安全接受。
- Success criteria：token 只存 hash；过期、撤销、重复使用均有明确错误；接受后绑定单一 client。
- In：单教练、邀请列表、审计。
- Out：公开注册、多角色、多租户。
- 禁区：用可猜 ID 代替 token；把邀请放在公开页面。

### Story 1.2 · 微信登录与会话

- Goal：客户通过微信登录建立服务端会话。
- Success criteria：`wx.login` code 只发服务端；openid/session_key 不到前端；过期/轮换/登出可测。
- In：微信 code exchange、会话 hash、CORS/CSRF。
- Out：手机号授权、支付。
- 禁区：AppSecret 进入小程序包。

### Story 1.3 · 建档、双重同意与风险分流

- Goal：收集生成所需最小资料，并在首次 Codex CLI 导出前完成同意和教练确认。
- Success criteria：健康处理同意、第三方模型同意、订阅消息同意分开记录；特殊风险进入 manual 状态。
- In：分步表单、撤回、删除入口、字段版本。
- Out：自由文本病历、照片、自动诊断。
- 禁区：拒绝同意仍发送模型；把隐私说明写成“纯人工服务”。

### Story 1.4 · 教练确认资料

- Goal：教练确认资料完整、可用于生成。
- Success criteria：未确认 profile 不能创建 generation job；修改后旧确认失效并留痕。
- In：profile review、风险标记。
- Out：自动批准。
- 禁区：跳过伤病/过敏确认。

## M2：目录、生成、审核与版本发布

### Story 2.1 · 动作/食物目录与确定性 kcal

- Goal：建立可审计的动作和食物事实源。
- Success criteria：每个 food 有单位、kcal/100g、来源版本；每个 exercise 有禁忌；模型只能引用已发布 ID。
- In：种子目录、目录版本、计算器。
- Out：营养商城、自动抓取。
- 禁区：把模型自由文本当作热量事实。

### Story 2.2 · Codex CLI 生成任务

- Goal：从已确认 profile 生成 30 天结构化草案。
- Success criteria：一次性 token、脱敏输入包、Codex CLI 本机运行、trace/error 记录；不存 raw prompt/completion。
- In：server-side handoff API、CLI runbook、JSON schema。
- Out：客户端直连、自动发布。
- 禁区：API key 前端化；未同意调用。

### Story 2.3 · 双层校验与失败关闭

- Goal：阻止 malformed、缺日、动作冲突、过敏冲突、异常 kcal 的草案流入审核/客户端。
- Success criteria：所有拒绝原因可复验；任何失败保持旧 approved 版本；草案状态清晰。
- In：schema、业务规则、risk result。
- Out：自动修复危险内容。
- 禁区：用低温或 JSON mode 替代校验。

### Story 2.4 · 教练审核与发布

- Goal：教练可按天/餐/动作修改草案并发布。
- Success criteria：发布必须显式 approve；客户端只读 published；审核人/时间/原因写审计。
- In：review UI、reject、publish transaction。
- Out：客户自改教练计划。
- 禁区：草案 URL 泄漏给客户。

### Story 2.5 · 未来版本复制

- Goal：支持只替换未来日期，保护历史执行记录。
- Success criteria：过去计划/打卡不变；新版本有 effective_from；发布失败旧版本仍生效。
- In：clone、版本历史、变更原因。
- Out：回溯覆盖历史。
- 禁区：直接 update 已发布行。

### Story 2.6 · Codex CLI 本机回传

- Goal：限制本机 Codex CLI 的运行边界并可受控回传结果。
- Success criteria：一次性 token、脱敏输入包、同一校验器、过期/重复/超时/超大输出可测；回传仍 pending_review。
- In：本机 wrapper、import endpoint、runbook。
- Out：生产 Worker 自动执行 CLI。
- 禁区：把客户 raw profile 写入 CLI 日志或命令历史。

## M3：客户每日执行闭环

### Story 3.1 · 今日页与 30 天日历

- Goal：客户 30 秒内找到今天的训练、餐次、注意事项。
- Success criteria：只显示当前 published version；本地日期正确；未发布显示等待教练，不显示草案。
- In：现有 mockup 视觉、mobile states、empty/error states。
- Out：社交、排行榜。
- 禁区：AI/provider 标识误导或未审核内容露出。

### Story 3.2 · 训练/饮食/饮水打卡

- Goal：客户能低成本记录完成情况。
- Success criteria：幂等；重复点击不重复计数；离线失败可重试且不伪造完成。
- In：item checkins、今日完成度。
- Out：照片识别、长日志。
- 禁区：把“打开页面”当作完成。

### Story 3.3 · 三项反馈与疼痛告警

- Goal：收集低负担反馈供教练判断。
- Success criteria：pain/energy/hunger 可重复提交；pain=present 立即提示停止相关动作并生成教练 alert；不自动替换动作。
- In：反馈页、告警、ack。
- Out：诊断、药物、治疗建议。
- 禁区：告诉客户“坚持就好”或自动给高风险替代。

## M4：教练运营与提醒

### Story 4.1 · 7 天执行摘要

- Goal：教练能看到是否需要介入。
- Success criteria：展示打开天数、打卡数、疼痛告警和未处理项；查询按 client session 鉴权。
- In：clients、alerts、checkins。
- Out：跨客户排名、自动评分。
- 禁区：小样本生成可识别的公开统计。

### Story 4.2 · 每日订阅消息

- Goal：客户明确授权后收到一条今日计划提醒。
- Success criteria：只在有效授权窗口发送；记录微信回执、幂等键和失败原因；未授权不骚扰。
- In：subscribe action、Cron、delivery log、手动单次提醒。
- Out：营销自动化、多渠道推送。
- 禁区：静默获取授权；循环重试骚扰。

### Story 4.3 · 删除与恢复演练

- Goal：客户可删除，系统可证明清理完成。
- Success criteria：请求后冻结 30 天；Cron 清理身份/健康/草案/provider 快照；生成不含健康值的 receipt；完成一次恢复/清理演练。
- In：deletion request、purge job、backup/TTL 记录。
- Out：保留可重识别个人统计。
- 禁区：只删 UI 记录而保留底层备份/日志。

## M5：真实闭环验收与上线

### Story 5.1 · 单客户端到端试用

- Goal：用 1 名低风险成年客户验证完整闭环。
- Success criteria：完成 4 个产品指标、安全门和提醒回执；所有证据可回读；任何 blocker 写回 issue。
- In：真实试用、教练在场、假/最小必要数据。
- Out：公开发布、收费。
- 禁区：未完成 provider 数据驻留/微信审核核验就宣称生产就绪。

### Story 5.2 · 发布与回滚

- Goal：把验证后的版本发布，并能回到上一个 approved 版本。
- Success criteria：构建、迁移、gitleaks、部署、健康检查和回滚演练通过。
- In：Cloudflare Worker/D1、WeChat test app、runbook。
- Out：多环境复杂编排。
- 禁区：没有 receipt 就报告已上线。
