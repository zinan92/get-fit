// Preview data for DevTools runs without a real AppID. A tourist-AppID project cannot be
// uploaded as a 体验版, so none of this can reach a real client.
const data = require('./preview-data');

const checkins = {};

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
  if (method === 'GET' && pathname === '/api/plans/calendar') return reply(data.calendar[params.month] || { month: params.month, days: [] });
  if (method === 'PUT' && pathname === '/api/checkins') {
    checkins[body.localDate] = { ...(checkins[body.localDate] || {}), [body.itemId]: body };
    return reply({ checkin: body });
  }
  if (method === 'PUT' && pathname === '/api/wellness-feedback') return reply({ feedback: body, alert: body.pain === 'present' ? { type: 'pain', status: 'open' } : null });
  // Onboarding can be walked through in DevTools with ?preview=onboarding.
  if (method === 'POST' && pathname === '/api/invitations/accept') return reply({ client: data.me.client });
  if (method === 'POST' && pathname === '/api/wx/auth/login') return reply({ client: data.me.client });
  if (method === 'POST' && pathname === '/api/me/consents') return reply({ consents: body.types, modelReady: true });
  if (method === 'PUT' && pathname === '/api/me/profile') return reply({ ok: true, status: 'pending_profile_review' });
  return Promise.reject({ error: { code: 'PREVIEW_UNSUPPORTED', message: '预览模式不支持这个操作' } });
}

module.exports = { isPreview, respond, previewToday: () => data.today };
