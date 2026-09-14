# Decision Log

## 2026-08-11 · 首版客户端 mockup

- 首版只解决客户每天打开后知道练什么、吃什么、注意什么。
- 计划生命周期为 AI 生成 30 天草案、教练一次性审核修改、客户仅看到已确认内容。
- 示例客户为每周训练三次的减脂新手。
- 饮食展示到具体食物、可食用克数与单项 kcal，并配原创可爱插画。
- 打卡仅记录完成或未完成，不要求图片或文字。

## 2026-09-14 · v3 视觉方向、开发移交与 dev 身份边界

- 产品的核心价值是情绪价值（Park）：要可爱、smooth、从头到尾一致。此前版本被评为"工具人版本"。
- 视觉统一为一套手绘角色语言：食物与动作演示都是带脸、带腮红的角色，脸画在主体上；动作演示用循环动画。页面不使用任何 emoji 或 Unicode 装饰字符。
- 打卡框静止时歪斜，点击后弹正、填色、勾线画出——"失序到归位"是打卡的情绪反馈。
- 颜色只承担分类语义：训练橙 `#D85C28`、饮食绿 `#4F9D6E`；数字用 Fredoka，中文保持系统字体。
- 设计源 `design/fit-plan-v3.html` 是唯一真相；实现以截图对照设计源验收，不以测试通过代替。
- 开发执行由 Codex 移交 Claude；GitHub `zinan92/get-fit` 为开发事实源。
- dev 身份只认服务端 `DEV_MODE`，不认请求 Host：Host 由客户端控制，挂在它上面的鉴权在客户 API 公开后即成旁路。

## 2026-09-14 · 首客最短路径：云开发 + 个人主体体验版

- Park 批准 `docs/specs/2026-09-14-first-customer-shortest-path.md` 全部推荐项（D1–D4）。
- 后端迁到微信云开发；领域逻辑与 `plan-schema` 抽成共享代码，Sites 网页和云函数两个入口消费同一份，只有存储与身份适配器不同。
- 新注册个人主体小程序「轻练」，首客在体验版试点；不等个体户执照、不做小程序备案（两者只卡正式上架）。
- 试点期生成由操作员在 Mac mini 上运行（ADR 0002 修订）；教练在小程序内教练模式审阅和发布（ADR 0003 修订）。
- 更正：此前"域名备案 + 主体资质是首客前置门"的判断是错的，已在规格中留痕。

## 2026-09-14 · 云函数以打包产物承载同一份 API 源码（#9）

- 云函数产物由 rolldown 从 `server/cloudfunction/entry.ts` 打包，领域逻辑与 Worker 共用 `server/api`、`packages/*`；不在 `cloudfunctions/` 下手写第二份。
- 入口把 `callFunction` 事件适配为 `Request` 交给 `handleApi`，返回前等待所有 `waitUntil` 任务——云函数实例返回后可能被冻结。
- 入口在构造环境时强制 `DEV_MODE: undefined`，与 Worker 的 dev 身份边界一致且更严：云函数永远不是本地沙盒。
- 语法降级目标写死为 CloudBase 运行时 `node20.19`，不跟随本机 Node 版本。

## 2026-09-14 · 云函数身份与存储：平台 OPENID、教练白名单、比较写入（#10）

- `ApiContext.platform` 存在时是唯一身份来源：客户由 OPENID 哈希映射到 clientId，教练由环境变量 `COACH_OPENIDS` 白名单判定；Bearer 会话、`x-coach-token`、Sites 边缘头、请求体里的 openid/clientId 一律不参与。Worker 不传 `platform`，行为不变。
- 云函数入口只转发 `idempotency-key` 头；传给 handlers 的环境只含加密密钥和提醒模板 ID，拿不到 DEV_MODE、COACH_TOKEN、AppSecret。
- 快照存储抽象为 `SnapshotBackend`（读 + 按修订号比较写入）。云开发实现：首次写用固定 `_id` 插入（并发插入报重复即冲突），之后 `where({_id, revision}).update` 只在修订号未变时生效。
- 冲突时整次请求在重新读取的状态上重跑（默认最多 3 次），仍失败返回 409 `STATE_CONFLICT`；从不在旧状态上覆盖别人的写入。
- 「打开天数」改为一等数据 `openedDays`（每客户每本地日期一条），教练摘要和日历只读它，不再依赖只保留 500 条的审计日志。
- D1 路径仍是无条件覆盖写，只服务 Sites 演示，不在试点数据链路上；多客户前再统一。

## 2026-09-14 · 小程序今天/计划页落地 v3（#12）

- 角色插画的唯一源改为 `packages/illustrations`：网页把分层合成为一个 SVG（与原字符串逐字节一致），小程序每层一张图片叠放，动的层用 WXSS 循环，支点按网页 `fill-box` 分组换算成整框百分比。
- 小程序资源（角色、图标、数字字体、查表模块、预览数据）由 `scripts/build-miniprogram-assets.ts` 生成并提交；`npm test` 检查漂移。
- 数字字体用 Fredoka SemiBold 的数字子集（约 4 KB，SIL OFL），以 base64 写进 WXSS，不依赖网络域名。
- 预览数据由真实 API 代码跑一份演示计划生成，只在没有真实 AppID 时启用（DevTools 游客模式 AppID 为空或 `touristappid`），页面显示「本地预览数据」。
- 「打开天数」改记请求当天的真实日期，不再记客户翻看的计划日期——日期条和日历翻看未来日期会虚增七天验收指标。
- 与设计源的有意偏差：计划数据没有餐次时间和热身安排，因此不显示（不编造）；恢复日没有动作时显示恢复日卡片。

## Gotchas

- 热量必须绑定份量；只有食物名称的热量数字没有可信含义。
- 未经教练确认的 AI 草案不能进入客户端。
- 本 mockup 的训练和饮食数字不可直接用于真实客户；后续实现需要独立的健康信息、过敏、伤病和风险边界设计。
- `.openai/hosting.json` 是构建输入（`vite.config.ts` 静态 import、Sites 插件拷进部署产物），不能 gitignore；其内容只是项目标识与 binding 名，且早已在公开历史中，忽略它不换来任何隐私，只会让干净 clone 无法构建。验证构建时必须用全新 clone，不能复制工作树——被忽略的本地文件会让验证假绿。
- 设计稿里的 `<div>` 移植进 `<button>` 时会被改成 `<span>`（button 内只允许短语内容），span 是行内元素会横排；必须给容器补纵向布局（参照 `.calcell` 的 `display:flex; flex-direction:column`）。渲染测试只断言文本和类名，测不到这类布局回归，视觉移植必须截图对照设计源。
- 生产环境永远不能设置 `DEV_MODE`；dev 身份的全部防线都压在这一个环境变量上。
- `/sandbox` 页面里的 `window.location.hostname` 判断只是浏览器端提示，不是安全边界；真正的门在服务端 `DEV_MODE` 与邀请绑定校验。
- 小程序备案与域名 ICP 备案是两道不同的门：前者只卡上架，不卡体验版；后者卡所有 `wx.request` 服务器域名，体验版真机同样校验（仅手机开调试模式时跳过，不能拿来给真实客户用）。云开发 `callFunction` 两道都不经过。
- 打包产物目录 `dist-cloudfunctions/` 必须同时被 `.gitignore` 和 ESLint 忽略，否则 lint 会检查生成代码并报错。
- 本机 Homebrew `node@22` 缺 simdjson 动态库无法启动；运行时兼容性不能靠本机多版本验证，要以部署后健康检查回报为准。
- 云函数冲突重试会重跑整个 handler：handler 里对外的副作用（发消息、调外部 API）必须能容忍「执行了但没落库」，或放到落库成功之后。
- 平台模式下没有 OPENID 的调用（例如本机 CLI 直接 invoke 云函数）什么身份都不是；操作员生成流程（#15）需要单独设计授权，不能靠放宽教练判定。
- DevTools 游客模式下 `wx.getAccountInfoSync().miniProgram.appId` 是空字符串，不是 `touristappid`；两者都要当作预览模式。
- `miniprogram-automator` 0.12 在稳定版 DevTools 上 `Tool.getInfo` 不返回 SDKVersion，`connect` 会崩；需像 xingqiu 一样改写 `checkVersion` 读 `systemInfo()`。
- `<image>` 里的 SVG 不继承 CSS 颜色，`currentColor` 图标必须在生成时替换成具体色值；动画分组也必须拆层，SVG 内部的 class 动画不生效。
