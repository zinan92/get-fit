App({
  globalData: {
    // Configure this to the approved customer API origin before importing into DevTools.
    // The private coach Sites URL is intentionally not a customer endpoint.
    apiBaseUrl: 'https://YOUR_CUSTOMER_API_ORIGIN',
    reminderTemplateId: 'YOUR_TEMPLATE_ID',
    sessionToken: ''
  },
  onLaunch() {
    this.globalData.sessionToken = wx.getStorageSync('fit_plan_session') || '';
  }
});
