const { request } = require('../../utils/api');
Page({
  data: { client: {}, consents: [] },
  onShow() { request('/api/me').then(result => this.setData({ client: result.client || {}, consents: result.consents || [] })).catch(() => {}); },
  async requestDelete() {
    const result = await wx.showModal({ title: '确认删除', content: '提交后会进入 30 天恢复期，之后清除身份和健康资料。', confirmText: '确认删除' });
    if (!result.confirm) return;
    try { await request('/api/me', { method: 'DELETE' }); wx.showToast({ title: '已提交申请', icon: 'success' }); }
    catch (error) { wx.showToast({ title: error?.error?.message || '提交失败', icon: 'none' }); }
  }
});
