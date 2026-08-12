App({
  globalData: {
    apiBaseUrl: 'https://fit-plan-mockup.parkzz.chatgpt.site',
    reminderTemplateId: 'YOUR_TEMPLATE_ID',
    sessionToken: ''
  },
  onLaunch() {
    this.globalData.sessionToken = wx.getStorageSync('fit_plan_session') || '';
  }
});
