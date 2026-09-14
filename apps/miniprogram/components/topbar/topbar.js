// Custom navigation bar that lines up with the WeChat capsule button.
Component({
  options: { multipleSlots: true },
  data: { top: 44, height: 32, right: 100 },
  lifetimes: {
    attached() {
      try {
        const capsule = wx.getMenuButtonBoundingClientRect();
        const { windowWidth } = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        this.setData({ top: capsule.top, height: capsule.height, right: windowWidth - capsule.left + 8 });
      } catch (error) { /* keep defaults */ }
    }
  }
});
