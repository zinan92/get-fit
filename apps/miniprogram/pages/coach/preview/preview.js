const { request } = require('../../../utils/api');
const dates = require('../../../utils/date');

// The coach walks the draft day by day through the same plan-day component the client uses.
Page({
  data: { preview: false, status: 'loading', draftId: '', draft: null, date: '', day: null, strip: [], busy: false, scrollInto: '', emptyDone: {} },

  onLoad(query) {
    this.setData({ preview: getApp().globalData.preview, draftId: query.draftId });
    this.load('');
  },

  async load(date) {
    try {
      const result = await request(`/api/coach/plan-drafts/${this.data.draftId}/preview${date ? `?date=${date}` : ''}`);
      const strip = result.draft.dates.map((value, index) => {
        const p = dates.parts(value);
        return { date: value, key: `d${index}`, index: index + 1, weekday: p.weekday, day: p.day, selected: value === result.date };
      });
      const current = strip.find(cell => cell.selected);
      this.setData({ status: result.status, draft: result.draft, date: result.date, day: result.plan ? result.plan.day : null, strip, scrollInto: current ? current.key : '' });
      wx.setNavigationBarTitle({ title: `${result.draft.clientName} 的计划` });
    } catch (error) { this.setData({ status: 'error' }); }
  },

  pick(e) {
    const date = e.currentTarget.dataset.date;
    if (date !== this.data.date) this.load(date);
  },

  async publish() {
    const confirm = await wx.showModal({ title: '发布给客户', content: '发布后客户马上能看到。已发布的内容不会被覆盖，之后调整会从未来某天开始生效。', confirmText: '发布' });
    if (!confirm.confirm) return;
    this.setData({ busy: true });
    try {
      await request(`/api/coach/plan-drafts/${this.data.draftId}/publish`, { method: 'POST', data: { changeReason: '教练审阅后发布' } });
      wx.showToast({ title: '已发布', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (error) { wx.showToast({ title: '没发布成功', icon: 'none' }); }
    finally { this.setData({ busy: false }); }
  },

  async sendBack() {
    const result = await wx.showModal({ title: '需要重新准备', editable: true, placeholderText: '哪里要改，比如 第 3 天动作太多', confirmText: '打回' });
    if (!result.confirm) return;
    try {
      await request(`/api/coach/plan-drafts/${this.data.draftId}/reject`, { method: 'POST', data: { reason: result.content || '教练要求调整' } });
      wx.showToast({ title: '已打回', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (error) { wx.showToast({ title: '没打回成功', icon: 'none' }); }
  }
});
