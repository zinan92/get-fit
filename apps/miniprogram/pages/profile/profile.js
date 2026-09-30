const { request } = require('../../utils/api');

Page({
  data: { preview: false, status: 'loading', client: {}, initial: '', hasProfile: false, deletion: null, isCoach: false, accountId: '' },
  onLoad() { this.setData({ preview: getApp().globalData.preview }); },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().setData({ selected: 2 });
    // Only WeChat accounts on the coach list see the workbench entry; the server enforces it either way.
    request('/api/me/account-id').then(result => this.setData({ accountId: result.accountId })).catch(() => {});
    request('/api/coach/overview').then(() => this.setData({ isCoach: true })).catch(() => this.setData({ isCoach: false }));
    this.load();
  },
  load() {
    request('/api/me')
      .then(result => {
        const client = result.client || {};
        const purge = result.deletion ? new Date(Date.parse(result.deletion.purgeAt) + 8 * 60 * 60 * 1000).toISOString() : '';
        this.setData({
          status: 'ready', client, initial: (client.displayName || '').slice(0, 1), hasProfile: Boolean(result.profile),
          deletion: purge ? { day: `${Number(purge.slice(5, 7))}月${Number(purge.slice(8, 10))}日` } : null
        });
      })
      .catch(() => this.setData({ status: 'guest', client: {} }));
  },
  // The coach sends this id to the operator to be added to the coach list.
  copyAccountId() { if (this.data.accountId) wx.setClipboardData({ data: this.data.accountId }); },
  openPrivacy() { wx.navigateTo({ url: '/pages/privacy/privacy' }); },
  openCoach() { wx.navigateTo({ url: '/pages/coach/home/home' }); },
  editProfile() { wx.navigateTo({ url: '/pages/onboarding/onboarding?edit=1' }); },
  async requestDelete() {
    const result = await wx.showModal({ title: '申请删除资料', content: '提交后有 30 天冷静期，到期会清除你的资料、计划和打卡记录。冷静期内想恢复，告诉教练就行。', confirmText: '提交申请' });
    if (!result.confirm) return;
    try { await request('/api/me', { method: 'DELETE' }); this.load(); }
    catch (error) { wx.showToast({ title: '提交失败，稍后再试', icon: 'none' }); }
  }
});
