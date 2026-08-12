# V1 runtime configuration

The Worker reads secrets only from its environment/Cloudflare Worker Secret
store. Never paste a key into source, the mini-program bundle, a browser form,
an issue, or a log.

Required before a real client run:

- `DATA_ENCRYPTION_KEY`: high-entropy key used for the encrypted D1 runtime snapshot and encrypted WeChat openid.
- `DEEPSEEK_API_KEY`: provider key. The provider retention/residency and model-processing terms remain an explicit launch check.
- `DEEPSEEK_MODEL`: current account-supported model (default is `deepseek-v4-flash`).
- `COACH_TOKEN` or private Sites/Cloudflare Access: single coach authentication.
- `COACH_ACCESS_USER_ID`: the exact owner account id injected by the private Sites
  access policy when using the owner-only path. Never accept this header without
  matching it to this configured value; do not configure it on a public site.
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET`: server-side WeChat login only.

Optional reminders:

- `WECHAT_TEMPLATE_ID`: public subscription template id used by the mini-program.
- `WECHAT_ACCESS_TOKEN` and `WECHAT_SEND_URL`: server-side delivery configuration. If either is absent, scheduled delivery is recorded as `skipped`, never silently claimed as sent.

Local development may use `DEV_MODE=true` and `x-coach-token: dev-coach` with a
throwaway `DATA_ENCRYPTION_KEY`; do not use that path for a real client.
