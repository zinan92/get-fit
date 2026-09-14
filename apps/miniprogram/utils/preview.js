// Preview data for DevTools runs without a real AppID. A tourist-AppID project cannot be
// uploaded as a 体验版, so none of this can reach a real client.
const data = require('./preview-data');

const checkins = {};
let editedDraft = null;

// DevTools reports an empty AppID (or 'touristappid') for a tourist project; any build that
// runs on a phone reports its real AppID.
function isPreview() {
  try {
    const appId = wx.getAccountInfoSync().miniProgram.appId;
    return appId === '' || appId === 'touristappid';
  } catch (error) { return false; }
}

function parse(path) {
  const [pathname, query = ''] = path.split('?');
  const params = {};
  query.split('&').filter(Boolean).forEach(pair => { const [key, value] = pair.split('='); params[key] = decodeURIComponent(value || ''); });
  return { pathname, params };
}

function respond(path, method, body) {
  const { pathname, params } = parse(path);
  const reply = value => new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(value))), 120));
  if (method === 'GET' && pathname === '/api/me') return reply(data.me);
  if (method === 'GET' && pathname === '/api/plan/today') {
    const date = params.date || data.today;
    const day = data.days[date] || { status: 'waiting_for_coach', date, plan: null, checkins: [] };
    const local = Object.values(checkins[date] || {}).filter(item => item.status === 'completed').map(({ itemId, itemType, status }) => ({ itemId, itemType, status }));
    return reply({ ...day, checkins: local });
  }
  if (method === 'GET' && pathname === '/api/me/week') return reply(data.week);
  if (method === 'GET' && pathname === '/api/plans/calendar') return reply(data.calendar[params.month] || { month: params.month, days: [] });
  if (method === 'PUT' && pathname === '/api/checkins') {
    checkins[body.localDate] = { ...(checkins[body.localDate] || {}), [body.itemId]: body };
    return reply({ checkin: body });
  }
  if (method === 'PUT' && pathname === '/api/wellness-feedback') return reply({ feedback: body, alert: body.pain === 'present' ? { type: 'pain', status: 'open' } : null });
  if (method === 'GET' && pathname === '/api/me/account-id') return reply({ accountId: 'preview0000000000000000000000000000000000000000000000000000000000', isCoach: true });
  // Coach screens.
  if (method === 'GET' && pathname === '/api/coach/overview') return reply(data.coach.overview);
  if (method === 'GET' && pathname === '/api/coach/alerts') return reply(data.coach.alerts);
  let match = pathname.match(/^\/api\/coach\/clients\/([^/]+)\/(profile|summary)$/);
  if (method === 'GET' && match) return reply((match[2] === 'profile' ? data.coach.profiles : data.coach.summaries)[match[1]] || { summary: null });
  // The day editor works on a local copy of the pending draft; saves stay on this device.
  const revision = data.coach.revision;
  const draftIdOf = pathname.split('/')[4];
  if (method === 'POST' && /^\/api\/coach\/clients\/[^/]+\/plan-revisions$/.test(pathname)) {
    return pathname.split('/')[4] === revision.clientId ? reply({ draft: { id: revision.draft.id } }) : Promise.reject({ error: { code: 'PREVIEW_UNSUPPORTED' } });
  }
  if (method === 'GET' && /^\/api\/coach\/plan-drafts\/[^/]+$/.test(pathname)) return reply({ draft: draftIdOf === revision.draft.id ? revision.draft : (editedDraft || data.coach.draft) });
  if (method === 'GET' && /^\/api\/coach\/plan-drafts\/[^/]+\/options$/.test(pathname)) return reply(draftIdOf === revision.draft.id ? revision.options : data.coach.draftOptions);
  if (method === 'PATCH' && /^\/api\/coach\/plan-drafts\/[^/]+$/.test(pathname)) { editedDraft = { ...data.coach.draft, payload: body.payload }; return reply({ draft: editedDraft }); }
  match = pathname.match(/^\/api\/coach\/plan-drafts\/([^/]+)\/preview$/);
  if (method === 'GET' && match) {
    const pool = match[1] === revision.draft.id ? revision.days : data.coach.draftDays;
    const first = Object.keys(pool)[0];
    return reply(pool[params.date || first] || pool[first]);
  }
  if (method === 'PATCH' && /^\/api\/coach\/clients\/[^/]+$/.test(pathname)) return reply({ note: body.note !== undefined ? body.note : '', message: body.message !== undefined ? body.message : '', archived: Boolean(body.archived) });
  if (method === 'POST' && pathname === '/api/coach/invitations') return reply({ invitation: { token: 'preview-invite-code', client: { displayName: body.displayName } } });
  if (method === 'POST' && /^\/api\/coach\//.test(pathname)) return reply({ ok: true });
  // Onboarding can be walked through in DevTools with ?preview=onboarding.
  if (method === 'POST' && pathname === '/api/invitations/accept') return reply({ client: data.me.client });
  if (method === 'POST' && pathname === '/api/wx/auth/login') return reply({ client: data.me.client });
  if (method === 'POST' && pathname === '/api/me/consents') return reply({ consents: body.types, modelReady: true });
  if (method === 'PUT' && pathname === '/api/me/profile') return reply({ ok: true, status: 'pending_profile_review' });
  return Promise.reject({ error: { code: 'PREVIEW_UNSUPPORTED', message: '预览模式不支持这个操作' } });
}

module.exports = { isPreview, respond, previewToday: () => data.today };
