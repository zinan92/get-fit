const { request } = require('../../utils/api');

Page({
  data: { month: '', days: [], loading: true },
  onShow() { this.load(); },
  load() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    request(`/api/plans/calendar?month=${month}`).then(result => this.setData({ month: result.month, days: (result.days || []).map(day => ({ ...day, dayNumber: day.date.slice(8) })), loading: false })).catch(() => this.setData({ loading: false }));
  },
  openDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    wx.navigateTo({ url: `/pages/today/today?date=${date}` });
  }
});
