const { request } = require('../../utils/api');
Page({
  data: { status: 'loading', day: {}, done: {} },
  onShow() { this.loadToday(); },
  localDate() { return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10); },
  async loadToday() {
    try { const result = await request(`/api/plan/today?date=${this.localDate()}`); this.setData({ status: result.status, day: result.plan?.day || {} }); }
    catch (error) { this.setData({ status: 'error' }); wx.showToast({ title: error?.error?.message || '加载失败', icon: 'none' }); }
  },
  async toggleExercise(e) {
    const itemId = e.currentTarget.dataset.id; const done = { ...this.data.done, [itemId]: !this.data.done[itemId] }; this.setData({ done });
    await request('/api/checkins', { method: 'PUT', data: { localDate: this.localDate(), planDayId: this.data.day.localDate, itemId, itemType: 'exercise', status: done[itemId] ? 'completed' : 'not_completed' } });
  },
  async openFeedback() {
    try {
      const pain = await this.pick('今天有疼痛吗？', ['没有', '有']);
      const energy = await this.pick('今天精力如何？', ['低', '正常', '好']);
      const hunger = await this.pick('今天饥饿感如何？', ['低', '正常', '高']);
      await request('/api/wellness-feedback', { method: 'PUT', data: { localDate: this.localDate(), pain: pain === 1 ? 'present' : 'none', energy: ['low', 'normal', 'good'][energy], hunger: ['low', 'normal', 'high'][hunger] } });
      wx.showToast({ title: pain === 1 ? '已提醒教练，请停止相关动作' : '反馈已提交', icon: 'none' });
    } catch (error) { if (error?.errMsg?.includes('cancel')) return; wx.showToast({ title: '反馈提交失败', icon: 'none' }); }
  },
  requestReminder() {
    const templateId = getApp().globalData.reminderTemplateId;
    if (!templateId || templateId === 'YOUR_TEMPLATE_ID') return wx.showToast({ title: '提醒模板尚未配置', icon: 'none' });
    wx.requestSubscribeMessage({ tmplIds: [templateId], success: async result => {
      if (result[templateId] !== 'accept') return wx.showToast({ title: '你没有开启提醒', icon: 'none' });
      try { await request('/api/reminders/subscribe', { method: 'POST', data: { templateId } }); wx.showToast({ title: '每日提醒已开启', icon: 'none' }); }
      catch (error) { wx.showToast({ title: error?.error?.message || '提醒开启失败', icon: 'none' }); }
    } });
  },
  pick(title, itemList) { return new Promise((resolve, reject) => wx.showActionSheet({ itemList, success: result => resolve(result.tapIndex), fail: reject })); }
});
