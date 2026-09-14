const { request } = require('../../../utils/api');
const coach = require('../../../utils/coach');
const OPTIONS = require('../../../utils/profile-options');
const dates = require('../../../utils/date');

function labels(list, values) {
  const names = (values || []).map(value => (list.find(item => item.value === value) || { label: value }).label);
  return names.length ? names.join('、') : '无';
}

Page({
  data: { preview: false, status: 'loading', clientId: '', item: null, stageView: null, profile: null, facts: [], flags: [], summary: null, alerts: [], startDate: '', busy: false },

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
      this.setData({
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

  openDraft() { wx.navigateTo({ url: `/pages/coach/preview/preview?draftId=${this.data.item.draft.id}` }); },

  async ackAlert(e) {
    try { await request(`/api/coach/alerts/${e.currentTarget.dataset.id}/ack`, { method: 'POST' }); this.load(); }
    catch (error) { wx.showToast({ title: '没标记成功', icon: 'none' }); }
  }
});
