# 轻练首位客户上线 Runbook

一名教练、一名低风险成年客户、个人主体小程序体验版、微信云开发。按顺序做，每一步都有「谁做」和「怎么算完成」。自动化测试和模拟器截图不算真机或真实客户证据。

## 0. 平台注册（Park，#8）

1. 在 mp.weixin.qq.com 用个人身份注册小程序「轻练」（名称被占可换），完成实名认证。
2. 小程序后台 → 开发 → 云开发，开通环境（免费体验环境即可），记下环境 ID。
3. 小程序后台 → 成员管理 → 体验成员：加教练朋友和首位客户的微信号（个人主体最多 15 人）。
4. 这台 Mac mini 上：`tcb login`（扫码授权 Park 的腾讯云账号）；微信开发者工具已登录。
5. 在 `apps/miniprogram/project.private.config.json`（已 gitignore）写入 `{ "appid": "<AppID>" }`。
6. 小程序后台 → 设置 → 服务内容声明 →「用户隐私保护指引」：按 `docs/privacy/user-privacy-guide.md` 第一部分勾选「剪切板」并填写用途和联系方式（不填的话复制口令/账号编号会被微信拦截）。

完成标志：后台截图回帖 #8，AppID 与环境 ID 打码。AppID、环境 ID、任何密钥都不进仓库、issue、日志。

## 1. 部署云函数（Wendy，#11）

```bash
export QINGLIAN_ENV_ID=<环境 ID>          # 只放在本机 shell，不写文件
node scripts/cloudbase-ops.mjs init       # 只做一次：生成存储密钥和操作员密钥到 ~/.config/qinglian（600）
```

`~/.config/qinglian/function-env.json` 里的 `DATA_ENCRYPTION_KEY` 一旦用过就不能换，换了旧数据无法解密；这台机器之外另找安全位置备份一份。

```bash
node scripts/cloudbase-ops.mjs deploy     # 第一次部署：还没有教练，会提示先加教练
```

上传体验版（第 2 步）后，教练打开小程序 →「我的」→ 底部「账号编号 · 点此复制」→ 发给 Wendy：

```bash
node scripts/cloudbase-ops.mjs add-coach <账号编号>
node scripts/cloudbase-ops.mjs deploy     # 带上教练名单重新部署，并跑健康检查
```

完成标志（分开记录，回帖 #11）：
- 部署命令成功；
- 健康检查 `ok: true`：Node 版本、`capabilities` 全为 true、`storage: ok`、`coaches ≥ 1`；
- 按 #11 评论再核对一次：固定 `_id` 重复插入的错误能被识别为冲突、`update` 返回的 `updated` 计数符合预期。

顺序：第一次部署（无教练）→ 上传体验版 → 教练复制账号编号 → add-coach → 再次部署。Park 的微信也可以先加进教练名单，方便真机走查。

### 定时清理（产品运行时任务）

- 契约：每天 03:00 云函数定时触发器 `daily-retention` 运行一次，只清除冷静期（30 天）已到的删除申请；客户调用不能触发。
- 证据：`npm run ops -- health` 里 `config.retentionJob: true`；云开发控制台函数日志里每天一条 `purge` 调用，返回 `{ purged: n }`。
- 停止：云开发控制台给 `api` 函数设置环境变量 `RETENTION_JOB_ENABLED=false`（或删除触发器），立即生效；恢复时改回或删掉该变量。

## 2. 上传体验版（Wendy）

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload --project apps/miniprogram -v 0.1.0 -d "首客试点"
```

小程序后台 → 版本管理 → 把该版本设为体验版，二维码发给教练和客户。

完成标志：版本号回帖。上传成功 ≠ 手机能用。

## 3. 真机走一遍（Park + 教练）

教练手机：
1. 打开体验版 →「我的」出现「教练工作台」。
2. 工作台 → 邀请新客户（写称呼）→「发给 TA」。

用 Park 的微信当测试客户（之后在工作台里申请删除这条测试数据）：
3. 点分享卡片 → 口令已带入 → 开始 → 两项必需同意 → 建档（勾一个轻微不适、一个过敏原）→ 交给教练。
4. 教练：客户详情 → 确认资料 → 选开始日期 → 开始准备计划。
5. Wendy：`npm run operator -- list`，`npm run operator -- run <jobId>`（本机 Codex 起草、本地校验、导入）。
6. 教练：客户详情 → 逐天查看 → 看「审阅时留意」→ 确认发布（或写原因打回，Wendy 重跑）。
7. 测试客户：今天页出现计划 → 打卡弹正 → 身体反馈选「有地方疼」→ 看到停止提示。
8. 教练：工作台出现身体提醒 →「已沟通」。

完成标志：两台手机各自的截图（不含真实健康信息）回帖；步骤 4 到 6 的教练操作时间记下来（验收要求 ≤ 15 分钟，不含 Wendy 起草时间）。

## 4. 首位客户七天

- 客户：成年、低风险，由教练确认；有「需要先沟通」情况的，教练先线下沟通。
- 每天 Wendy 看教练工作台里的「最近 7 天」：打开天数、训练打卡、餐次打卡、疼痛提醒；有疼痛提醒当天提醒教练处理。
- 第 7 天验收：打开 ≥ 5 天、打卡 ≥ 3 次、所有疼痛提醒已沟通。饮水不在试点范围。

| 日期 | 打开 | 训练打卡 | 餐次打卡 | 疼痛提醒 | 教练处理 | 客户卡住的地方 |
| --- | --- | ---: | ---: | --- | --- | --- |
| Day 1 |  |  |  |  |  |  |
| Day 2 |  |  |  |  |  |  |
| Day 3 |  |  |  |  |  |  |
| Day 4 |  |  |  |  |  |  |
| Day 5 |  |  |  |  |  |  |
| Day 6 |  |  |  |  |  |  |
| Day 7 |  |  |  |  |  |  |

## 停止条件

出现以下任一情况，教练暂停计划并线下沟通：客户报告明显或持续疼痛；客户透露未满 18 岁、怀孕、正在治疗的疾病或进食障碍；客户要求删除资料（「我的」→ 申请删除，30 天后清除）。

## 出问题时

| 现象 | 先查 |
| --- | --- |
| 小程序一直「暂时没连上」 | `node scripts/cloudbase-ops.mjs health`；云开发控制台函数日志 |
| 教练看不到工作台 | 账号编号是否已 `add-coach` 并重新 `deploy` |
| 操作员命令报 401 | `~/.config/qinglian/operator-key` 与已部署的 `OPERATOR_KEY_SHA256` 是否来自同一次 init |
| 起草被本地校验拦下 | 按报错看是哪个动作/食物被禁忌或过敏屏蔽，重跑；多次失败用 `--plan-file` 手写 |
| 频繁 409 STATE_CONFLICT | 见 #11 评论：改为只在状态变化时写回 |
