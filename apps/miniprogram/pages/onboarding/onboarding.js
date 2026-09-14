const { request } = require('../../utils/api');

Page({
  data: {
    step: 0, inviteToken: '', consents: [], targetIndex: 0, experienceIndex: 0,
    targets: ['减脂', '增肌', '保持体能'], experiences: ['新手', '有训练经验', '进阶'], heightCm: '', weightKg: ''
  },
  onToken(e) { this.setData({ inviteToken: e.detail.value }); },
  onConsentChange(e) { this.setData({ consents: e.detail.value }); },
  onTarget(e) { this.setData({ targetIndex: Number(e.detail.value) }); },
  onExperience(e) { this.setData({ experienceIndex: Number(e.detail.value) }); },
  onHeight(e) { this.setData({ heightCm: e.detail.value }); },
  onWeight(e) { this.setData({ weightKg: e.detail.value }); },
  async acceptInvite() {
    try {
      // The cloud function knows who is calling from the WeChat OPENID; the invitation only links that account.
      await request('/api/invitations/accept', { method: 'POST', data: { token: this.data.inviteToken } });
      await request('/api/wx/auth/login', { method: 'POST', data: { invitationToken: this.data.inviteToken } });
      this.setData({ step: 1 });
    }
    catch (error) { wx.showToast({ title: '邀请口令无效或已被使用', icon: 'none' }); }
  },
  async saveConsents() {
    if (!this.data.consents.includes('health_processing') || !this.data.consents.includes('third_party_model')) return wx.showToast({ title: '请先同意两项说明', icon: 'none' });
    try { await request('/api/me/consents', { method: 'POST', data: { types: this.data.consents } }); this.setData({ step: 2 }); }
    catch (error) { wx.showToast({ title: error?.error?.message || '提交失败', icon: 'none' }); }
  },
  async saveProfile() {
    try {
      await request('/api/me/profile', { method: 'PUT', data: {
        target: ['fat_loss', 'muscle_gain', 'general_fitness'][this.data.targetIndex], ageBand: '25_34',
        heightCm: Number(this.data.heightCm), weightKg: Number(this.data.weightKg), trainingExperience: ['beginner', 'intermediate', 'advanced'][this.data.experienceIndex],
        sessionsPerWeek: 3, minutesPerSession: 45, equipment: ['dumbbell'], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: 'Asia/Shanghai'
      } });
      wx.showModal({
        title: '已提交',
        content: '等教练确认后，你就能看到完整的 30 天计划。',
        showCancel: false,
        success: () => wx.switchTab({ url: '/pages/today/today' })
      });
    } catch (error) { wx.showToast({ title: error?.error?.message || '资料不完整', icon: 'none' }); }
  }
});
