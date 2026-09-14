const { request } = require('../../../utils/api');
const coach = require('../../../utils/coach');
const OPTIONS = require('../../../utils/profile-options');
const dates = require('../../../utils/date');

function labels(list, values) {
  const names = (values || []).map(value => (list.find(item => item.value === value) || { label: value }).label);
  return names.length ? names.join('、') : '无';
}

Page({
  data: { preview: false, status: 'loading', clientId: '', item: null, stageView: null, profile: null, facts: [], flags: [], summary: null, alerts: [], startDate: '', busy: false, course: null, renewal: false, note: '', noteDraft: '', message: '', messageDraft: '', archived: false, adjustFrom: '', adjustMin: '', adjustMax: '' },

  onLoad(query) {
    this.setData({ preview: getApp().globalData.preview, clientId: query.id, startDate: dates.addDays(dates.today(), 1) });
  },
  onShow() { this.load(); },

  async load() {
    const id = this.data.clientId;
    try {
      const [overview, detail, alerts] = await Promise.all([request('/api/coach/overview'), request(`/api/coach/clients/${id}/profile`), request('/api/coach/alerts')]);
      const item = overview.clients.find(entry => entry.client.id === id);
      const profile = detail.profile;
      const facts = profile ? [
        { k: '目标', v: labels(OPTIONS.target, [profile.target]) },
        { k: '年龄', v: labels(OPTIONS.ageBand, [profile.ageBand]) },
        { k: '身高体重', v: `${profile.heightCm} cm · ${profile.weightKg} kg` },
        { k: '经验', v: labels(OPTIONS.trainingExperience, [profile.trainingExperience]) },
        { k: '频率', v: `每周 ${profile.sessionsPerWeek} 次 · 每次 ${profile.minutesPerSession} 分钟` },
        { k: '器械', v: profile.equipment.length ? labels(OPTIONS.equipment, profile.equipment) : '徒手' }
      ] : [];
      const flags = profile ? [
        { k: '不舒服的部位', v: labels(OPTIONS.injury, profile.injuryFlags), tone: profile.injuryFlags.length ? 'train' : '' },
        { k: '过敏或不能吃', v: labels(OPTIONS.allergy, profile.allergyFlags), tone: profile.allergyFlags.length ? 'diet' : '' },
        { k: '需要先沟通', v: labels(OPTIONS.risk, profile.riskFlags) + (profile.ageBand === 'under_18' ? '、未满 18 岁' : ''), tone: item && item.manualReview ? 'warn' : '' }
      ] : [];
      const summary = item && item.stage === 'published' ? (await request(`/api/coach/clients/${id}/summary?days=7`)).summary : null;
      const course = item && item.course ? { ...item.course, percent: Math.round(item.course.dayNumber / item.course.totalDays * 100) } : null;
      // The next period is offered in the last five days, or once this one has ended, unless one is already set up.
      const renewal = Boolean(item && item.stage === 'published' && course && !course.nextStartDate && item.attention.some(entry => entry.kind === 'ending' || entry.kind === 'ended'));
      const today = overview.today || dates.today();
      const startDate = renewal ? [dates.addDays(course.endDate, 1), today].sort()[1] : this.data.startDate;
      const adjustMin = dates.addDays(today, 1);
      const adjustMax = course ? course.endDate : '';
      this.setData({
        adjustMin, adjustMax, adjustFrom: this.data.adjustFrom && this.data.adjustFrom >= adjustMin ? this.data.adjustFrom : adjustMin,
        course, renewal, startDate, note: item ? item.note : '', noteDraft: item ? item.note : '', message: item ? item.message : '', messageDraft: item ? item.message : '', archived: Boolean(item && item.archived),
        status: 'ready', item, stageView: coach.stage(item ? item.stage : ''), profile, facts, flags, summary,
        alerts: alerts.alerts.filter(alert => alert.clientId === id && alert.status === 'open')
      });
      wx.setNavigationBarTitle({ title: detail.client.displayName });
    } catch (error) { this.setData({ status: 'error' }); }
  },

  async confirmProfile() {
    this.setData({ busy: true });
    try {
      const result = await request(`/api/coach/clients/${this.data.clientId}/profile/confirm`, { method: 'POST' });
      wx.showToast({ title: result.safetyGate === 'manual' ? '已确认，需先和客户沟通' : '资料已确认', icon: 'none' });
      this.load();
    } catch (error) { wx.showToast({ title: '没确认成功', icon: 'none' }); }
    finally { this.setData({ busy: false }); }
  },

  pickStart(e) { this.setData({ startDate: e.detail.value }); },

  async requestPlan() {
    this.setData({ busy: true });
    try {
      await request(`/api/coach/clients/${this.data.clientId}/plan-generations`, { method: 'POST', data: { startDate: this.data.startDate } });
      wx.showToast({ title: '已开始准备，好了会出现在这里', icon: 'none' });
      this.load();
    } catch (error) { wx.showToast({ title: '没发起成功', icon: 'none' }); }
    finally { this.setData({ busy: false }); }
  },

  pickAdjust(e) { this.setData({ adjustFrom: e.detail.value }); },

  // Copies the live plan into a draft that takes over from the chosen day, then opens it for review.
  async startAdjust() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      const result = await request(`/api/coach/clients/${this.data.clientId}/plan-revisions`, { method: 'POST', data: { effectiveFrom: this.data.adjustFrom } });
      wx.navigateTo({ url: `/pages/coach/preview/preview?draftId=${result.draft.id}` });
    } catch (error) {
      const code = error && error.error && error.error.code;
      wx.showToast({ title: code === 'DRAFT_PENDING' ? '还有一份没处理完的计划' : code === 'PREVIEW_UNSUPPORTED' ? '预览里只有大卫可以试调整' : '没发起成功', icon: 'none' });
    } finally { this.setData({ busy: false }); }
  },

  onMessage(e) { this.setData({ messageDraft: e.detail.value }); },

  async saveMessage() {
    try {
      const result = await request(`/api/coach/clients/${this.data.clientId}`, { method: 'PATCH', data: { message: this.data.messageDraft } });
      this.setData({ message: result.message, messageDraft: result.message });
      wx.showToast({ title: result.message ? 'TA 下次打开就能看到' : '已清空', icon: 'none' });
    } catch (error) { wx.showToast({ title: '没发出去', icon: 'none' }); }
  },

  onNote(e) { this.setData({ noteDraft: e.detail.value }); },

  async saveNote() {
    try {
      const result = await request(`/api/coach/clients/${this.data.clientId}`, { method: 'PATCH', data: { note: this.data.noteDraft } });
      this.setData({ note: result.note, noteDraft: result.note });
      wx.showToast({ title: '记下了', icon: 'none' });
    } catch (error) { wx.showToast({ title: '没保存成功', icon: 'none' }); }
  },

  async toggleArchive() {
    const archived = !this.data.archived;
    if (archived) {
      const result = await wx.showModal({ title: '结课归档', content: 'TA 会移到「已归档」，不再出现在待处理里。TA 的计划和记录都保留，随时可以移回来。', confirmText: '归档' });
      if (!result.confirm) return;
    }
    try {
      await request(`/api/coach/clients/${this.data.clientId}`, { method: 'PATCH', data: { archived } });
      this.setData({ archived });
      wx.showToast({ title: archived ? '已归档' : '已移回列表', icon: 'none' });
    } catch (error) { wx.showToast({ title: '没改成功', icon: 'none' }); }
  },

  openDraft() { wx.navigateTo({ url: `/pages/coach/preview/preview?draftId=${this.data.item.draft.id}` }); },

  async ackAlert(e) {
    try { await request(`/api/coach/alerts/${e.currentTarget.dataset.id}/ack`, { method: 'POST' }); this.load(); }
    catch (error) { wx.showToast({ title: '没标记成功', icon: 'none' }); }
  }
});
