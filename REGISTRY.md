# Fit Plan Mockup Registry

## 现在在哪里

- M0 已合并：共享 `plan.v1`/目录/kcal/同意契约、19 张 Drizzle/D1 表、3 份迁移、原生小程序边界与 secret runbook。
- M1 已合并：单教练闭环 API、教练 Web `/coach`、客户今日/30 天日历/资料页、结构化计划校验、教练审核发布、版本化、打卡/疼痛告警、提醒授权和 30 天删除清扫。
- 客户端只读 published plan；draft/provider/raw prompt/completion 不会进入客户端响应。食物 kcal 由本地目录按份量计算。
- Codex CLI 是当前主生成路径：教练明确点击后才下载脱敏输入和一次性 token，本机生成结果经过同一校验器并仍需审核，Worker 不会自动执行。
- 今日训练卡已嵌入 3 个已核验动作 GIF（高脚杯深蹲、单臂哑铃划船支撑版、臀桥），并把动作库的中文分步要领、目标肌群和器械信息放进可展开的动作卡；`/exercise-preview` 仍可独立查看，素材保持 180×180 与 Gym visual attribution。
- `grill-with-docs` 已收敛首客目标、领域词汇与 4 个边界 ADR；L 级“单客户真实闭环试用”规格已发布为 GitHub Issue #17（`ready-for-agent`）。
- 本地 HTTP flow 已验证：`/api/health`、邀请、登录、同意/建档、Codex CLI handoff、fallback 导入、发布、客户端 today kcal；runtime tests、lint、tsc、gitleaks 均通过。
- 私有 Sites 版本已部署成功：https://fit-plan-mockup.parkzz.chatgpt.site（owner-only/custom 访问策略；外部未登录请求返回 401，页面/生产 API 未做匿名可见性宣称）。
- 状态：代码闭环 `verified`；Sites 已配置加密密钥和私有 owner 身份认证，主计划链路只使用教练本机 Codex CLI；微信登录/真实 D1 读写/首位客户验收尚未完成，保持 `partial/unknown`；健康数据上线合规评估仍 `blocked`。

## 下一步

- 基于 Issue #17 执行 `to-tickets`：按客户 API 主切口拆出有阻塞关系的独立 stories；每张 ticket 再单独实现、测试和 review。
- 配置并验证生产 Worker secrets：WeChat AppID/AppSecret；确认 D1 migrations 已应用并完成一次恢复演练；私有 Sites owner-only 认证已配置，若改为公开 API 需另行批准并增加边界防护。
- 用低风险成年真实客户完成 7 天验收：打开 ≥5 天、打卡 ≥3 次、教练发布 ≤15 分钟；逐项留审计证据。
- 媒体正式商用前仍需完成 Gym visual 授权确认；当前 GIF 仅作为私有预览/演示素材。
- Codex CLI 主链路仍不等于 production-ready：在微信审核、D1 恢复、真实客户验收和本机 Codex 运行边界完成前保持 `partial/unknown`；生产 Worker 不配置或调用外部模型 API。
