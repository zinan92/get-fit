const { request } = require('../../utils/api');

const CONSENT_LABELS = { health_processing: '处理必要的健康与饮食资料', third_party_model: '去身份化资料用于辅助生成', subscription_message: '接收每日计划提醒' };

Page({
  data: { preview: false, client: {}, consents: [] },
  onLoad() { this.setData({ preview: getApp().globalData.preview }); },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().setData({ selected: 2 });
    request('/api/me')
      .then(result => this.setData({ client: result.client || {}, consents: (result.consents || []).map(item => CONSENT_LABELS[item] || item) }))
      .catch(error => { if (error && error.error && error.error.code === 'AUTH_REQUIRED') wx.reLaunch({ url: '/pages/onboarding/onboarding' }); });
  },
  async requestDelete() {
    const result = await wx.showModal({ title: '确认删除', content: '提交后会进入 30 天恢复期，之后清除身份和健康资料。', confirmText: '确认删除' });
    if (!result.confirm) return;
    try { await request('/api/me', { method: 'DELETE' }); wx.showToast({ title: '已提交申请', icon: 'success' }); }
    catch (error) { wx.showToast({ title: '提交失败，稍后再试', icon: 'none' }); }
  }
});
