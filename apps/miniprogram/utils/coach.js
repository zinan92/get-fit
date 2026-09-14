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

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '待我处理' },
  { key: 'active', label: '执行中' },
  { key: 'ending', label: '快结课' },
  { key: 'archived', label: '已归档' }
];

// Archived members only appear under 已归档; every other filter is about the active list.
function inFilter(row, key) {
  if (key === 'archived') return row.archived;
  if (row.archived) return false;
  if (key === 'todo') return row.stageView.tone === 'action' || row.openAlerts > 0 || row.attention.some(item => item.kind === 'quiet');
  if (key === 'active') return row.stage === 'published';
  if (key === 'ending') return row.attention.some(item => item.kind === 'ending' || item.kind === 'ended');
  return true;
}

/** One workbench row: the single most useful line under the member's name. */
function memberRow(item) {
  const attention = item.attention || [];
  let hint = '';
  let hintTone = '';
  if (item.openAlerts) { hint = '有未处理的身体提醒'; hintTone = 'warn'; }
  else if (attention.length) { hint = attention.map(entry => entry.text).join(' · '); hintTone = attention[0].kind === 'quiet' ? 'warn' : 'train'; }
  else if (item.course && item.course.dayNumber > 0) hint = `第 ${item.course.dayNumber}/${item.course.totalDays} 天`;
  else if (item.course && item.course.dayNumber === 0) hint = `${item.course.startDate.slice(5).replace('-', '月')}日开始`;
  if (item.note) hint = hint ? `${hint}  ·  ${item.note}` : item.note;
  const stageView = item.stage === 'draft_ready' && item.draft && item.draft.revision ? { label: '调整待确认', tone: 'action' } : stage(item.stage);
  return { ...item, id: item.client.id, stageView, initial: item.client.displayName.slice(0, 1), attention, hint, hintTone };
}

module.exports = { stage, FILTERS, inFilter, memberRow };
