const { isPreview } = require('./utils/preview');

App({
  globalData: {
    // Set when the project runs without a real AppID (DevTools tourist mode). Such a build can
    // never be uploaded as a 体验版, so preview data cannot reach a real client.
    preview: false,
    reminderTemplateId: 'YOUR_TEMPLATE_ID'
  },
  onLaunch() {
    this.globalData.preview = isPreview();
    if (!this.globalData.preview && wx.cloud) wx.cloud.init({ env: wx.cloud.DYNAMIC_CURRENT_ENV, traceUser: false });
  }
});
