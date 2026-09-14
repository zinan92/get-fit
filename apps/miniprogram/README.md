# 轻练微信小程序

客户端（今天 / 计划 / 我的）与后续的教练模式都在这个小程序里。视觉唯一真相源是 `design/fit-plan-v3.html`。

## 数据与身份

- 所有数据都经 `wx.cloud.callFunction({ name: 'api' })` 进入云函数（源码 `server/cloudfunction/entry.ts`，打包 `npm run build:cloudfunction`）。
- 身份只来自平台注入的 OPENID；小程序不保存 token、不传 clientId，也不使用 `wx.request`。
- 仓库里的 `project.config.json` 固定为 `touristappid`。真实 AppID 只写在本机 `project.private.config.json`（已 gitignore）。

## 本地预览

没有真实 AppID 时（DevTools 游客模式），小程序自动使用 `utils/preview-data.js`：一份由真实 API 代码生成的演示计划，页面顶部会显示「本地预览数据」。能在手机上运行的构建都带真实 AppID，不会进入预览模式。

## 角色与图标

`assets/characters`、`assets/icons`、`styles/numerals.wxss`、`utils/characters.js`、`utils/preview-data.js` 都由 `npm run build:miniprogram-assets` 从 `packages/illustrations` 生成，不要手改；`npm test` 会检查它们没有漂移。

动作角色拆成多层图片叠放，动的那层用 WXSS 循环动画，支点与网页版 SVG 分组一致。

## 截图

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli auto --project apps/miniprogram --auto-port 9420
node scripts/capture-miniprogram.mjs outputs/miniprogram
```
