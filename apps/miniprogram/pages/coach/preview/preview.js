const { request } = require('../../../utils/api');
const dates = require('../../../utils/date');

// The coach walks the draft day by day through the same plan-day component the client uses.
Page({
  data: { badge: '', eyebrow: '', heading: '', preview: false, status: 'loading', draftId: '', draft: null, date: '', day: null, strip: [], busy: false, scrollInto: '', emptyDone: {} },

  onLoad(query) {
    this.setData({ preview: getApp().globalData.preview, draftId: query.draftId });
  },

  // Reloads after returning from the day editor so the preview shows what was saved.
  onShow() { this.load(this.data.date); },

  async load(date) {
    try {
      const result = await request(`/api/coach/plan-drafts/${this.data.draftId}/preview${date ? `?date=${date}` : ''}`);
      const strip = result.draft.dates.map((value, index) => {
        const p = dates.parts(value);
        return { date: value, key: `d${index}`, index: index + 1, weekday: p.weekday, day: p.day, selected: value === result.date };
      });
      const current = strip.find(cell => cell.selected);
      this.setData({ status: result.status, draft: result.draft, date: result.date, day: result.plan ? result.plan.day : null, strip, scrollInto: current ? current.key : '' });
      const revision = result.draft.revision;
      const from = revision ? dates.parts(revision.effectiveFrom) : null;
      this.setData({ badge: revision ? '调整预览 · 客户还看不到' : '草案预览 · 客户还看不到', eyebrow: revision ? `${result.draft.clientName} · 计划调整` : `${result.draft.clientName} · 30 天计划草案`, heading: revision ? `从 ${from.month}月${from.day}日 起` : '逐天看一遍' });
      wx.setNavigationBarTitle({ title: `${result.draft.clientName} 的计划` });
    } catch (error) { this.setData({ status: 'error' }); }
  },

  pick(e) {
    const date = e.currentTarget.dataset.date;
    if (date !== this.data.date) this.load(date);
  },

  editDay() {
    wx.navigateTo({ url: `/pages/coach/edit/edit?draftId=${this.data.draftId}&date=${this.data.date}&name=${encodeURIComponent(this.data.draft.clientName)}` });
  },

  async publish() {
    const revision = this.data.draft.revision;
    const confirm = await wx.showModal(revision
      ? { title: '确认调整', content: `从 ${revision.effectiveFrom} 起 TA 看到调整后的安排，之前的日子和打卡记录不变。`, confirmText: '确认' }
      : { title: '发布给客户', content: '发布后客户马上能看到。已发布的内容不会被覆盖，之后调整会从未来某天开始生效。', confirmText: '发布' });
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
    if (this.data.draft.revision) {
      const discard = await wx.showModal({ title: '放弃这次调整？', content: 'TA 会继续按原来的计划进行。', confirmText: '放弃' });
      if (!discard.confirm) return;
      try {
        await request(`/api/coach/plan-drafts/${this.data.draftId}/reject`, { method: 'POST', data: { reason: '教练放弃调整' } });
        wx.showToast({ title: '已放弃', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 800);
      } catch (error) { wx.showToast({ title: '没操作成功', icon: 'none' }); }
      return;
    }
    const result = await wx.showModal({ title: '需要重新准备', editable: true, placeholderText: '哪里要改，比如 第 3 天动作太多', confirmText: '打回' });
    if (!result.confirm) return;
    try {
      await request(`/api/coach/plan-drafts/${this.data.draftId}/reject`, { method: 'POST', data: { reason: result.content || '教练要求调整' } });
      wx.showToast({ title: '已打回', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (error) { wx.showToast({ title: '没打回成功', icon: 'none' }); }
  }
});
