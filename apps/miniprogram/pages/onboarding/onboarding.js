const { request } = require('../../utils/api');
const OPTIONS = require('../../utils/profile-options');

const REQUIRED_CONSENTS = ['health_processing', 'third_party_model'];

function code(error) { return error && error.error && error.error.code; }

function chips(list, selected) {
  const chosen = Array.isArray(selected) ? selected : [selected];
  return list.map(item => ({ ...item, on: chosen.indexOf(item.value) >= 0 }));
}

Page({
  data: {
    preview: false,
    step: 'loading',
    inviteToken: '',
    busy: false,
    consents: { health_processing: false, third_party_model: false, subscription_message: false },
    form: { target: 'fat_loss', ageBand: '25_34', heightCm: '', weightKg: '', trainingExperience: 'beginner', sessionsPerWeek: 3, minutesPerSession: 45, equipment: [], injury: [], allergy: [], risk: [] },
    view: {},
    manualReview: false
  },

  onLoad(query) {
    const token = (query && (query.invite || (query.scene && decodeURIComponent(query.scene)))) || '';
    this.setData({ preview: getApp().globalData.preview, inviteToken: token });
    this.refreshView();
    if (query && query.preview === 'onboarding') { this.setData({ step: 'invite' }); return; }
    this.resume();
  },

  refreshView() {
    const form = this.data.form;
    this.setData({
      view: {
        target: chips(OPTIONS.target, form.target),
        ageBand: chips(OPTIONS.ageBand, form.ageBand),
        trainingExperience: chips(OPTIONS.trainingExperience, form.trainingExperience),
        equipment: chips(OPTIONS.equipment, form.equipment),
        injury: chips(OPTIONS.injury, form.injury),
        allergy: chips(OPTIONS.allergy, form.allergy),
        risk: chips(OPTIONS.risk, form.risk),
        minutes: chips([30, 45, 60, 90].map(value => ({ value, label: `${value} 分钟` })), form.minutesPerSession)
      }
    });
  },

  // Picks up wherever the client left off: invitation, consents, profile, or waiting for the coach.
  async resume() {
    try {
      const me = await request('/api/me');
      const status = me.client && me.client.status;
      if (status === 'active') { wx.switchTab({ url: '/pages/today/today' }); return; }
      const granted = me.consents || [];
      if (REQUIRED_CONSENTS.some(type => granted.indexOf(type) < 0)) { this.setData({ step: 'consent' }); return; }
      this.setData({ step: me.profile ? 'done' : 'profile' });
    } catch (error) {
      this.setData({ step: 'invite' });
      if (code(error) === 'AUTH_REQUIRED' && this.data.inviteToken) this.acceptInvite();
    }
  },

  onToken(e) { this.setData({ inviteToken: e.detail.value.trim() }); },

  async acceptInvite() {
    if (!this.data.inviteToken || this.data.busy) return;
    this.setData({ busy: true });
    try {
      await request('/api/invitations/accept', { method: 'POST', data: { token: this.data.inviteToken } });
      // The cloud function already knows who is calling; this links that WeChat account to the invitation.
      await request('/api/wx/auth/login', { method: 'POST', data: { invitationToken: this.data.inviteToken } });
      this.setData({ step: 'consent' });
    } catch (error) {
      wx.showToast({ title: '口令无效或已经用过，找教练要一个新的', icon: 'none' });
    } finally { this.setData({ busy: false }); }
  },

  toggleConsent(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ [`consents.${type}`]: !this.data.consents[type] });
  },

  async saveConsents() {
    const consents = this.data.consents;
    if (REQUIRED_CONSENTS.some(type => !consents[type])) { wx.showToast({ title: '前两项是生成计划必须的', icon: 'none' }); return; }
    this.setData({ busy: true });
    try {
      await request('/api/me/consents', { method: 'POST', data: { types: Object.keys(consents).filter(type => consents[type]) } });
      this.setData({ step: 'profile' });
    } catch (error) { wx.showToast({ title: '没存上，再试一次', icon: 'none' }); }
    finally { this.setData({ busy: false }); }
  },

  pickOne(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: field === 'minutesPerSession' ? Number(value) : value });
    this.refreshView();
  },

  pickMany(e) {
    const { field, value } = e.currentTarget.dataset;
    const current = this.data.form[field];
    let next = current.indexOf(value) >= 0 ? current.filter(item => item !== value) : current.concat(value);
    // A gym already has everything; picking it clears the individual tools and vice versa.
    if (field === 'equipment') next = value === 'gym' ? (next.indexOf('gym') >= 0 ? ['gym'] : []) : next.filter(item => item !== 'gym');
    this.setData({ [`form.${field}`]: next });
    this.refreshView();
  },

  onNumber(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }); },

  stepSessions(e) {
    const next = Math.min(6, Math.max(1, this.data.form.sessionsPerWeek + Number(e.currentTarget.dataset.delta)));
    this.setData({ 'form.sessionsPerWeek': next });
  },

  async saveProfile() {
    const form = this.data.form;
    const heightCm = Number(form.heightCm);
    const weightKg = Number(form.weightKg);
    if (!(heightCm >= 120 && heightCm <= 230)) { wx.showToast({ title: '身高填 120–230 之间的数字', icon: 'none' }); return; }
    if (!(weightKg >= 30 && weightKg <= 250)) { wx.showToast({ title: '体重填 30–250 之间的数字', icon: 'none' }); return; }
    this.setData({ busy: true });
    try {
      await request('/api/me/profile', { method: 'PUT', data: {
        target: form.target, ageBand: form.ageBand, heightCm, weightKg, trainingExperience: form.trainingExperience,
        sessionsPerWeek: form.sessionsPerWeek, minutesPerSession: form.minutesPerSession, equipment: form.equipment,
        injuryFlags: form.injury, allergyFlags: form.allergy, dietaryPreferences: [], riskFlags: form.risk, timezone: 'Asia/Shanghai'
      } });
      this.setData({ step: 'done', manualReview: form.risk.length > 0 || form.ageBand === 'under_18' });
    } catch (error) { wx.showToast({ title: '没存上，再试一次', icon: 'none' }); }
    finally { this.setData({ busy: false }); }
  },

  goToday() { wx.switchTab({ url: '/pages/today/today' }); }
});
