const { request } = require('../../utils/api');

const CONSENT_LABELS = { health_processing: '处理必要的健康与饮食资料', third_party_model: '去身份化资料用于辅助生成', subscription_message: '接收每日计划提醒' };

Page({
  data: { preview: false, client: {}, consents: [], isCoach: false, accountId: '' },
  onLoad() { this.setData({ preview: getApp().globalData.preview }); },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().setData({ selected: 2 });
    // Only WeChat accounts on the coach list see the workbench entry; the server enforces it either way.
    request('/api/me/account-id').then(result => this.setData({ accountId: result.accountId })).catch(() => {});
    request('/api/coach/overview').then(() => this.setData({ isCoach: true })).catch(() => this.setData({ isCoach: false }));
    request('/api/me')
      .then(result => this.setData({ client: result.client || {}, consents: (result.consents || []).map(item => CONSENT_LABELS[item] || item) }))
      .catch(error => { if (error && error.error && error.error.code === 'AUTH_REQUIRED' && !this.data.isCoach) this.setData({ client: {} }); });
  },
  // The coach sends this id to the operator to be added to the coach list.
  copyAccountId() { if (this.data.accountId) wx.setClipboardData({ data: this.data.accountId }); },
  openPrivacy() { wx.navigateTo({ url: '/pages/privacy/privacy' }); },
  openCoach() { wx.navigateTo({ url: '/pages/coach/home/home' }); },
  async requestDelete() {
    const result = await wx.showModal({ title: '确认删除', content: '提交后会进入 30 天恢复期，之后清除身份和健康资料。', confirmText: '确认删除' });
    if (!result.confirm) return;
    try { await request('/api/me', { method: 'DELETE' }); wx.showToast({ title: '已提交申请', icon: 'success' }); }
    catch (error) { wx.showToast({ title: '提交失败，稍后再试', icon: 'none' }); }
  }
});
