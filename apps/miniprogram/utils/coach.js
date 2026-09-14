// Coach-facing labels. Stages come from /api/coach/overview.
const STAGES = {
  invited: { label: '已邀请', tone: 'muted' },
  onboarding: { label: '正在填写', tone: 'muted' },
  profile_pending: { label: '正在填写资料', tone: 'muted' },
  profile_submitted: { label: '资料待你确认', tone: 'action' },
  needs_conversation: { label: '需要先沟通', tone: 'warn' },
  confirmed: { label: '可以安排计划', tone: 'action' },
  generating: { label: '计划准备中', tone: 'muted' },
  draft_ready: { label: '计划待你审阅', tone: 'action' },
  published: { label: '执行中', tone: 'diet' }
};

function stage(value) { return STAGES[value] || { label: value, tone: 'muted' }; }

module.exports = { stage };
