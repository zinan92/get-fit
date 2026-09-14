const { request } = require('../../utils/api');
const dates = require('../../utils/date');

Page({
  data: {
    preview: false,
    status: 'loading',
    today: '',
    date: '',
    eyebrow: '',
    greeting: '',
    name: '',
    strip: [],
    planId: '',
    day: null,
    done: {},
    feeling: { pain: '', energy: '', hunger: '' },
    feelingSent: '',
    feelingOptions: {
      pain: [{ value: 'none', label: '没有疼痛' }, { value: 'present', label: '有地方疼' }],
      energy: [{ value: 'low', label: '有点累' }, { value: 'normal', label: '还行' }, { value: 'good', label: '精神好' }],
      hunger: [{ value: 'low', label: '不太饿' }, { value: 'normal', label: '正常' }, { value: 'high', label: '很饿' }]
    }
  },

  onLoad(options) {
    const today = dates.today();
    this.setData({ preview: getApp().globalData.preview, today, date: (options && options.date) || today });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().setData({ selected: 0 });
    const app = getApp();
    if (app.globalData.pendingDate) { this.setData({ date: app.globalData.pendingDate, status: 'loading' }); app.globalData.pendingDate = ''; }
    this.load();
  },

  // Centered on the day being shown (so arriving from the calendar keeps a highlighted cell);
  // the real today is labelled 今 wherever it falls.
  buildStrip(selected) {
    const today = this.data.today;
    return [-2, -1, 0, 1, 2].map(offset => {
      const date = dates.addDays(selected, offset);
      const p = dates.parts(date);
      return { date, weekday: date === today ? '今' : p.weekday, day: p.day, selected: date === selected };
    });
  },

  async load() {
    const date = this.data.date;
    const p = dates.parts(date);
    this.setData({ eyebrow: `${p.month}月${p.day}日 · 星期${p.weekday}`, greeting: dates.greeting(), strip: this.buildStrip(date) });
    try {
      const [me, result] = await Promise.all([request('/api/me'), request(`/api/plan/today?date=${date}`)]);
      const done = {};
      (result.checkins || []).forEach(item => { done[item.itemId] = true; });
      this.setData({
        feeling: { pain: '', energy: '', hunger: '' },
        feelingSent: '',
        status: result.status,
        name: (me.client && me.client.displayName) || '',
        planId: result.plan ? result.plan.id : '',
        day: result.plan ? result.plan.day : null,
        done
      });
    } catch (error) {
      const code = error && error.error && error.error.code;
      if (code === 'AUTH_REQUIRED') {
        // A coach who is not also a client lands on the workbench instead of onboarding.
        request('/api/coach/overview')
          .then(() => wx.reLaunch({ url: '/pages/coach/home/home' }))
          .catch(() => wx.reLaunch({ url: '/pages/onboarding/onboarding' }));
        return;
      }
      this.setData({ status: 'error' });
    }
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    if (date === this.data.date) return;
    this.setData({ date, status: 'loading' });
    this.load();
  },

  async onToggle(e) {
    const { itemId, itemType, wasDone } = e.detail;
    this.setData({ [`done.${itemId}`]: !wasDone });
    try {
      await request('/api/checkins', { method: 'PUT', data: { localDate: this.data.date, planDayId: `${this.data.planId}:${this.data.date}`, itemId, itemType, status: wasDone ? 'not_completed' : 'completed' } });
    } catch (error) {
      this.setData({ [`done.${itemId}`]: wasDone });
      wx.showToast({ title: '没存上，再点一次试试', icon: 'none' });
    }
  },

  pickFeeling(e) {
    const { field, value } = e.currentTarget.dataset;
    this.setData({ [`feeling.${field}`]: value });
  },

  async sendFeeling() {
    const feeling = this.data.feeling;
    if (!feeling.pain || !feeling.energy || !feeling.hunger) { wx.showToast({ title: '三项都点一下', icon: 'none' }); return; }
    try {
      await request('/api/wellness-feedback', { method: 'PUT', data: { localDate: this.data.date, ...feeling } });
      // Pain never swaps a move automatically: the client stops and the coach decides.
      this.setData({ feelingSent: feeling.pain === 'present' ? 'pain' : 'ok' });
    } catch (error) { wx.showToast({ title: '没发出去，再试一次', icon: 'none' }); }
  },

  openCalendar() { wx.switchTab({ url: '/pages/calendar/calendar' }); },
  retry() { this.setData({ status: 'loading' }); this.load(); }
});
