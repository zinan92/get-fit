Component({
  data: {
    selected: 0,
    items: [
      { path: '/pages/today/today', text: '今天', icon: 'sun' },
      { path: '/pages/calendar/calendar', text: '计划', icon: 'calendar' },
      { path: '/pages/profile/profile', text: '我的', icon: 'person' }
    ]
  },
  methods: {
    go(e) {
      const index = Number(e.currentTarget.dataset.index);
      if (index === this.data.selected) return;
      wx.switchTab({ url: this.data.items[index].path });
    }
  }
});
