# 轻练 V1：单客户真实闭环试用规格

## Problem Statement

健身教练已经可以在视觉 mockup 中展示“今天练什么、吃什么、注意什么”，但这还没有证明一名真实客户能从邀请、建档和计划发布走到连续执行。当前网页预览是教练工作台和产品方向的证据，不是客户可直接使用的微信小程序闭环；真实微信登录、客户 API、持久化数据和七天执行反馈仍需要在一个受控试用中验证。

客户的核心问题是：计划容易散落在聊天记录里，每天不知道该做什么，也无法把完成情况和身体反馈持续交给教练。教练的核心问题是：重复编写和发送月计划耗时，发布之后又很难看到客户是否执行、是否出现需要人工介入的信号。

## Solution

轻练第一阶段服务一名教练和一名低风险成年客户。教练在线下完成买课后，通过教练工作台邀请客户；客户使用微信登录、接受分开的数据说明并完成结构化建档。教练确认资料后，明确触发一次本机 Codex CLI 生成 30 天草案。草案经过结构、日期、动作、风险、过敏和热量规则校验，教练检查并发布后，客户每天在“今天”页看到当日训练、餐次、可食用份量、每项 kcal、注意事项和完成打卡。

客户的疼痛、精力和饥饿反馈进入教练告警列表，不会自动诊断、自动替换动作或自动改写计划。已发布计划版本不可覆盖；教练的调整从未来生效日创建新版本。第一阶段先观察七天真实使用，再决定是否扩大客户数量或接入提醒。

## Outcome and Acceptance Contract

### Outcome

让一名低风险成年客户在教练审核的 30 天计划下，完成从微信邀请到连续七天执行与反馈的最小真实闭环。

### Acceptance criteria

1. 单一教练可以为单一客户创建一次性邀请；客户完成微信登录、必要同意和结构化建档，未完成必要条件时不能进入计划生成。
2. 教练确认资料后可以明确触发本机 Codex CLI 生成；生成结果只能引用已发布动作/食物条目，并通过 `plan.v1`、日期连续性、禁忌、过敏和 kcal 校验。
3. 教练可以查看草案、修改训练/餐次/注意事项并显式确认发布；客户侧只返回当前有效的已发布版本，不返回草案、原始 prompt、completion 或 provider 信息。
4. 客户在“今天”和 30 天日历中看到正确的计划日；每个动作可查看 GIF、目标肌群、器械和中文动作要领；每项食物显示可食用份量与 kcal，并显示餐次和当天合计。
5. 训练、餐次和饮水打卡具备幂等性；客户提交疼痛/精力/饥饿反馈后，疼痛为“有”会产生教练告警，系统不自动替换动作。
6. 已发布计划和历史打卡不可被未来版本覆盖；删除请求可追踪，经过 30 天冻结窗口后清除身份映射、健康档案和草案快照；未授权身份无法读取或写入他人数据。
7. 一名低风险成年客户完成七天试用，至少打开五天、完成至少三次训练或饮食打卡；教练从资料确认到发布不超过 15 分钟，且所有结果可由教练和测试记录回读。

### In scope

- 单教练、单客户、单个 30 天计划和前七天试用。
- 微信邀请、微信登录、分步同意、结构化建档和风险分流。
- 教练工作台中的资料确认、Codex CLI 交接、草案校验、审核、发布和未来版本。
- 独立客户 API，支持已发布计划读取、日历、打卡、反馈、告警和删除申请。
- 精选动作/食物目录、确定性 kcal、GIF 与中文动作要领展示。
- 本地内存适配器与持久化 D1 适配器的同一页面服务契约。
- 自动化测试、密钥扫描、审计记录、沙盒登录和一名真实客户的人工试用。

### Out of scope

- 支付、套餐、优惠券、自动续费和公开注册。
- 多教练、多组织、多租户、角色矩阵和客户批量运营。
- 社区、排行榜、社交分享、聊天、照片上传和自由文本病历。
- 自动诊断、药物/治疗建议、自动替换动作或自动调整客户计划。
- 客户自行编辑教练计划、自动食物替换和库存/商城能力。
- 第一阶段的自动订阅提醒投递、复杂行为画像、跨客户排名和营销自动化。

### Forbidden boundary

- 不把教练私有工作台或其 owner-only 地址当作客户 API。
- 不把未经教练确认的草案、模型身份、原始 prompt/completion 返回客户。
- 不让模型发明动作、食物或热量事实；不把模型自由文本当作 kcal 来源。
- 不把健康资料、微信密钥、Codex 登录凭证、环境身份、客户身份或完整私有目标写入源码、issue、日志或截图。
- 不因 GIF 或动作库缺失而放开不受控的远程媒体；缺失媒体时保留文字要领和明确降级状态。
- 不把技术权限、已登录状态、模拟器结果、HTTP 可达或服务器日志当作真实微信/真机/真实客户证据。
- 不在没有新合同的情况下扩大范围，不覆盖已经发布的历史计划日。

### Complexity and delivery mode

这是 L 级多阶段工作：它同时涉及客户体验、教练工作台、客户 API、身份、持久化、Codex CLI 交接、微信平台和真实试用。先按本规格拆成有阻塞关系的独立 tickets；每张 ticket 使用 TDD 驱动一个可验证切片，并在实现后进行标准与规格双轴 code review。

## User Stories

1. As a customer, I want to open a one-time invitation, so that I can enter the coach's service without public registration.
2. As a customer, I want to sign in with WeChat, so that I do not need a separate password.
3. As a customer, I want to see a clear explanation of health-data processing, automated generation, and reminders separately, so that I can choose what I consent to.
4. As a customer, I want to complete a short structured profile, so that the coach has enough information to prepare a safe plan without collecting an open-ended medical history.
5. As a customer, I want to know when my profile is waiting for coach confirmation, so that I do not mistake onboarding for plan readiness.
6. As a customer, I want to see a calm manual-review message when my profile contains a risk flag, so that the system does not pretend to automate a situation that needs a human.
7. As a coach, I want to create a short-lived single-use invitation, so that only the intended customer can join this service.
8. As a coach, I want to see whether a customer has accepted an invitation and completed a profile, so that I know when I can review it.
9. As a coach, I want to confirm a customer's profile explicitly, so that generation cannot start from incomplete or unreviewed health information.
10. As a coach, I want to see the customer's risk, injury, allergy, and dietary flags before generation, so that I can decide whether automated drafting is appropriate.
11. As a coach, I want to trigger a 30-day generation task deliberately, so that plan creation happens at the right moment after a customer buys a course.
12. As a coach, I want the generation task to hand off only de-identified structured inputs, so that unnecessary personal data does not enter the local model context.
13. As a coach, I want the local Codex CLI to return a versioned structured draft, so that the result can be checked before anyone sees it.
14. As a coach, I want malformed, incomplete, unsafe, or kcal-inconsistent drafts to remain unpublished, so that a generation success cannot bypass review.
15. As a coach, I want to see the generation state and a safe failure reason, so that I can retry or edit manually without exposing provider internals to the customer.
16. As a coach, I want to review each plan day, meal, exercise, and reminder, so that I can correct content before release.
17. As a coach, I want to select only published action and food entries, so that the plan stays grounded in the curated catalogs.
18. As a coach, I want to edit sets, repetitions, rest, portions, and reminders, so that the final plan reflects my professional judgment.
19. As a coach, I want to confirm and publish a draft explicitly, so that I remain responsible for the client-visible plan.
20. As a coach, I want to record an optional review note and timestamp, so that later review of the pilot has a clear responsibility trail.
21. As a customer, I want to see only a coach-confirmed published plan, so that unfinished or unsafe draft content never appears in my app.
22. As a customer, I want to know the current plan day and days remaining, so that a 30-day plan feels continuous rather than like unrelated messages.
23. As a customer, I want to see today's training, meals, and reminders together, so that I can start without searching through chat history.
24. As a customer, I want each exercise to show its GIF, target muscle, equipment, sets, repetitions, and rest, so that the instruction is actionable.
25. As a customer, I want to expand Chinese step-by-step exercise guidance under the GIF, so that the animation is supported by readable form cues.
26. As a customer, I want a text fallback when exercise media cannot load, so that I can still understand the action and its safety note.
27. As a customer, I want every food item to show its edible portion and kcal, so that I can prepare the meal concretely.
28. As a customer, I want meal totals and a daily kcal total, so that I can understand the plan without calculating it myself.
29. As a customer, I want the app to distinguish cooked/as-served edible portions from unspecified weights, so that the numbers are not misleading.
30. As a customer, I want a 30-day read-only calendar, so that I can preview the month without changing the coach's plan.
31. As a customer, I want to mark an exercise, meal, or water item complete, so that I can record progress with minimal effort.
32. As a customer, I want repeated taps on a completion control to be idempotent, so that my progress count does not inflate accidentally.
33. As a customer, I want to record pain, energy, and hunger for a plan day, so that my coach can understand how execution feels.
34. As a customer, I want a pain response that tells me to stop the related action, so that the product does not encourage me to push through pain.
35. As a coach, I want pain feedback to create an open alert, so that I know which customer and day need attention.
36. As a coach, I want to acknowledge an alert without the system changing the plan, so that intervention remains a deliberate professional decision.
37. As a coach, I want to create a future-effective plan version, so that a correction does not rewrite what the customer already saw.
38. As a customer, I want my past plan days and check-ins to remain stable after a future change, so that my history stays understandable.
39. As a customer, I want to request deletion and receive a traceable result, so that I know what will happen to my data.
40. As a coach, I want deletion to retain only a non-identifying operational receipt during the recovery window, so that cleanup can be demonstrated without keeping a re-identifiable health record.
41. As a system owner, I want customer reads and writes to use a separate customer API boundary, so that the private coach workspace is never accidentally exposed.
42. As a system owner, I want unknown, expired, forged, or mismatched sessions to fail closed, so that one customer cannot access another customer's data.
43. As a system owner, I want memory and D1 adapters to expose the same page-facing result shapes, so that local tests exercise the same behavior as the persisted deployment.
44. As a system owner, I want the D1 snapshot and sensitive identity fields encrypted at rest, so that a storage read does not reveal customer health data.
45. As a system owner, I want the local Codex handoff to have a one-time token, bounded input, timeout, and output limit, so that generation cannot become an unbounded data or execution channel.
46. As a coach, I want the first pilot to be supported through my existing human communication channel, so that the product does not need in-app chat before the core loop is proven.
47. As a coach, I want to review a seven-day execution summary, so that I can decide whether to intervene or continue the plan.
48. As a system owner, I want the pilot to record opening days, check-ins, publication time, and alert handling, so that the outcome can be evaluated against the agreed success criteria.
49. As a human tester, I want to compile and observe the exact experience package in DevTools, so that an uploaded package is not mistaken for a reviewed or released product.
50. As a human tester, I want to run the customer journey on one real supported device after sandbox checks pass, so that simulator and HTTP evidence do not stand in for real customer experience.

## Implementation Decisions

### Product and lifecycle

- The first target is one real coach, one low-risk adult customer, one 30-day plan, and a seven-day observation window.
- The existing cute “today” visual surface is the presentation baseline; more visual polish is deferred until the customer journey is runnable.
- The customer experience is centered on the current plan day, not a social feed or a chat timeline.
- The coach reviews a generated 30-day draft before publishing. There is no daily review obligation; weekly review is a summary/adjustment cadence.
- The first pilot does not require automatic reminder delivery. Reminder consent and delivery can be added after the core execution loop is proven.

### Domain and state

- The domain uses the glossary in `CONTEXT.md`: customer, coach, plan, plan version, plan day, draft, confirmed, published, completion, feedback, and alert have distinct meanings.
- A plan has exactly 30 consecutive calendar days in the first target. A plan version is immutable once published, and a future adjustment has an effective date.
- “Complete” is an explicit customer check-in. Opening a page, viewing a GIF, or a server-side inference is not completion.
- A coach confirmation is a responsibility transition; schema validation is necessary but never sufficient for publication.

### Customer journey service boundary

- The primary seam is one page-facing customer journey/API boundary. It accepts invitation, session, consent, profile, generation handoff, publication, plan-day, check-in, feedback, alert, and deletion operations and returns stable domain results/errors.
- The seam uses injected time, storage, WeChat exchange, and Codex runner adapters. Tests use deterministic fakes; production adapters are verified separately.
- Customer responses project only published data. Coach responses may include draft state and review controls, subject to coach authorization.
- The private coach workspace and the customer API have separate authentication and authorization policies even when they share backend code.

### Identity and access

- Customer identity begins with a consumed invitation and server-side WeChat code exchange; the WeChat code, OpenID, and session secrets never reach the client bundle.
- Coach access remains single-coach and private. No public registration or multi-role permission matrix is introduced.
- Unknown, expired, forged, cross-client, and mismatched plan-day references fail closed with stable error codes.
- A separate approved customer API origin is required for a real mini-program; the private owner-only Sites surface is not reused for that purpose.

### Generation and review

- Generation is an explicit coach action after profile confirmation and required consent.
- The local Codex CLI is the only generation path in this target. The Worker does not automatically invoke a model or silently choose a fallback provider.
- The handoff is one-time, de-identified, structured, bounded by timeout/output limits, and recorded by status/audit aliases rather than raw prompt/completion.
- The shared `plan.v1` contract, catalog membership, date continuity, injury/contraindication, allergy, and deterministic kcal validator run before a draft can be reviewed or published.
- A generation failure leaves the last published version unchanged. Manual coach editing is allowed; automatic publishing is not.

### Catalogs and content

- The pilot uses a curated subset of action and food entries. The full external exercise dataset is not sent wholesale to the model and is not required for the first customer.
- Actions expose name, target muscle, equipment, GIF or text fallback, Chinese steps, sets, repetitions, rest, and safety reminder.
- Foods expose name, edible portion, kcal fact, meal membership, meal total, and daily total. The service calculates kcal from the curated catalog rather than model prose.
- Allergies are hard constraints. Ordinary preferences are soft constraints. Complex medical diets are routed to a human.
- Customers cannot substitute an action or food inside the app during the first pilot.

### Safety and data lifecycle

- Minors, pregnancy, acute pain, serious chronic disease, eating disorders, and coach-marked high-risk profiles do not enter automated generation.
- Pain feedback creates a coach alert and a stop instruction. It never diagnoses, recommends treatment, or silently swaps the action.
- Health processing, automated/third-party processing, and subscription reminders are separate consent types. Missing required consent blocks the relevant operation.
- Storage uses encrypted sensitive snapshots and a 30-day deletion recovery window. Deletion removes identity mapping, profile, drafts, provider snapshots, and related health records after the window.
- Logs and analytics contain minimal operational events, request identifiers, status, and redacted aliases; they do not contain raw health values or secrets.

### Platform and pilot gates

- Local and automated tests prove behavior at the customer journey seam; they do not prove WeChat account identity, DevTools upload, physical-device pixels, or production review.
- A test WeChat application/DevTools run must prove login, invitation, consent, profile, published plan read, check-in, and feedback before the real customer run.
- The real customer pilot is a human-supported seven-day trial. The coach owns consent confirmation, plan review, alert handling, and the decision to stop.
- Payment, public launch, automatic reminders, and multi-customer scaling remain future decisions and require new acceptance contracts.

## Testing Decisions

- Tests assert external behavior at the page-facing customer journey/API seam: request/response shapes, authorization results, state transitions, published projections, stable errors, and idempotent writes. They do not assert private helper names or storage implementation details.
- The main integration suite covers invitation acceptance, WeChat-login adapter behavior, consent gating, profile confirmation, local Codex handoff status, valid/invalid plan import, coach review/publish, customer today/calendar projections, check-ins, feedback/alerts, future versioning, deletion, and cross-client authorization.
- Contract tests compare memory and D1 adapters for the same page-facing operations and verify encrypted sensitive persistence plus hydration/purge behavior.
- Catalog/plan tests cover exactly 30 consecutive days, known action/food IDs, deterministic kcal, hard allergy/injury blocks, missing media fallback, and rejection of malformed or invented content.
- Render tests cover today-page information architecture: GIF references, action metadata, expandable Chinese steps, per-food kcal, meal totals, day totals, coach-confirmed status, and absence of draft/provider leakage.
- Security tests cover unknown identity, forged headers/tokens, expired invitations/sessions, mismatched plan-day IDs, consent revocation, deletion state, secret scan, and safe error output.
- CLI wrapper tests cover de-identified input, one-time token use, timeout, output-size cap, malformed JSON, validator rejection, and preservation of the last published version.
- DevTools and real-device observations are separate human evidence. A simulator, HTTP response, server log, or passing automated suite cannot mark the physical-device story complete.
- Pilot evaluation reads back the seven-day metrics: opened days, check-ins, coach publication time, alert response, customer-reported friction, and any stop condition.
- Prior art in the current codebase is the API integration suite, plan schema/validation tests, persistence encryption tests, rendered HTML tests, lint, type checking, and gitleaks; new tests should extend these seams rather than introduce a parallel test harness.

## Out of Scope

- Any payment or course-commerce flow.
- Any multi-coach, multi-organization, public registration, or role matrix.
- Any social, chat, leaderboard, photo, free-text medical record, or marketing automation feature.
- Any automatic diagnosis, treatment, medication, medical nutrition, or automatic action replacement.
- Any client-side plan editing or automatic food/action substitution.
- Any model provider other than the explicitly operated local Codex CLI path.
- Any claim that the private Sites URL is a customer-facing production API.
- Any production release or public WeChat launch before the sandbox, human, device, data, and review gates have separate evidence.

## Further Notes

- The current private web deployment is useful as the coach-facing visual baseline and demo, but it is not evidence of a real customer API or a real WeChat release.
- The existing PRD's “规划合同，未进入业务实现” status is stale relative to the current mockup and backend work; this spec supersedes that status for the next build queue.
- The current source and issue tracker contain older M2 tickets whose open/complete state should be reconciled separately; that reconciliation is not a reason to broaden this spec.
- The intended next workflow is `to-tickets`: split this L-level spec into ordered, independently verifiable stories with blocking edges. Implementation then proceeds one ticket/branch/PR at a time, with TDD and a final code review.
- Real WeChat credentials, customer API approval, D1 production state, and physical-device observations are operator-controlled gates. They must be requested or recorded through their own bounded workflow and never embedded in this issue.
