const { request } = require('../../../utils/api');
const coach = require('../../../utils/coach');

Page({
  data: { preview: false, status: 'loading', clients: [], visible: [], filters: [], filter: 'all', query: '', alerts: [], waiting: 0, inviteName: '', invite: null, busy: false },

  onLoad() { this.setData({ preview: getApp().globalData.preview }); },
  onShow() { this.load(); },

  async load() {
    try {
      const [overview, alerts] = await Promise.all([request('/api/coach/overview'), request('/api/coach/alerts')]);
      const clients = overview.clients.map(item => coach.memberRow(item));
      const openAlerts = alerts.alerts.filter(alert => alert.status === 'open');
      const waiting = clients.filter(item => !item.archived && item.stageView.tone === 'action').length + openAlerts.length;
      this.setData({ status: 'ready', clients, alerts: openAlerts, waiting });
      this.applyFilter();
    } catch (error) {
      this.setData({ status: error && error.error && error.error.code === 'COACH_AUTH_REQUIRED' ? 'denied' : 'error' });
    }
  },

  applyFilter() {
    const { clients, filter, query } = this.data;
    const filters = coach.FILTERS.map(item => ({ ...item, count: clients.filter(row => coach.inFilter(row, item.key)).length }));
    const needle = query.trim();
    const visible = clients.filter(row => coach.inFilter(row, filter) && (!needle || row.client.displayName.includes(needle)));
    this.setData({ filters, visible });
  },

  pickFilter(e) { this.setData({ filter: e.currentTarget.dataset.key }); this.applyFilter(); },
  onQuery(e) { this.setData({ query: e.detail.value }); this.applyFilter(); },

  onInviteName(e) { this.setData({ inviteName: e.detail.value }); },

  async createInvite() {
    const name = this.data.inviteName.trim();
    if (!name) { wx.showToast({ title: '先写会员的称呼', icon: 'none' }); return; }
    this.setData({ busy: true });
    try {
      const result = await request('/api/coach/invitations', { method: 'POST', data: { displayName: name } });
      this.setData({ invite: { name, token: result.invitation.token }, inviteName: '' });
      this.load();
    } catch (error) { wx.showToast({ title: '没创建成功，再试一次', icon: 'none' }); }
    finally { this.setData({ busy: false }); }
  },

  copyInvite() {
    wx.setClipboardData({ data: this.data.invite.token });
  },

  // The share card opens onboarding with the code already filled in.
  onShareAppMessage() {
    const invite = this.data.invite;
    return {
      title: invite ? `${invite.name}，你的 30 天训练和饮食计划从这里开始` : '轻练',
      path: invite ? `/pages/onboarding/onboarding?invite=${encodeURIComponent(invite.token)}` : '/pages/today/today'
    };
  },

  async ackAlert(e) {
    const id = e.currentTarget.dataset.id;
    try { await request(`/api/coach/alerts/${id}/ack`, { method: 'POST' }); this.load(); }
    catch (error) { wx.showToast({ title: '没标记成功', icon: 'none' }); }
  },

  openClient(e) { wx.navigateTo({ url: `/pages/coach/client/client?id=${e.currentTarget.dataset.id}` }); }
});
