App({
  globalData: {
    // Configure this to the approved customer API origin before importing into DevTools.
    // The private coach Sites URL is intentionally not a customer endpoint.
    apiBaseUrl: 'https://YOUR_CUSTOMER_API_ORIGIN',
    reminderTemplateId: 'YOUR_TEMPLATE_ID',
    // Local-only escape hatch while a WeChat AppID is unavailable. Keep this
    // false for every exported or production configuration.
    devMode: false,
    devOpenid: 'openid-local-sandbox',
    sessionToken: ''
  },
  onLaunch() {
    this.globalData.sessionToken = wx.getStorageSync('fit_plan_session') || '';
  }
});
