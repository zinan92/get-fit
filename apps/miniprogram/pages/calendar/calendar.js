const { request } = require('../../utils/api');
const dates = require('../../utils/date');

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

function monthOf(date, offset) {
  const [year, month] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1 + offset, 1));
  return value.toISOString().slice(0, 7);
}

Page({
  data: {
    preview: false,
    status: 'loading',
    eyebrow: '',
    cells: [],
    trainingPerWeek: 0,
    mealsPerDay: 0,
    weekLabel: '',
    selected: null,
    detail: null
  },

  onLoad() { this.setData({ preview: getApp().globalData.preview }); },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().setData({ selected: 1 });
    this.load();
  },

  async load() {
    const today = dates.today();
    try {
      // A 30-day plan can straddle months; the calendar endpoint is per month.
      const months = [monthOf(today, -1), monthOf(today, 0), monthOf(today, 1)];
      const results = await Promise.all(months.map(month => request(`/api/plans/calendar?month=${month}`)));
      const days = results.flatMap(result => result.days || []).sort((a, b) => a.date.localeCompare(b.date));
      if (!days.length) { this.setData({ status: 'empty' }); return; }
      const first = days[0].date;
      const offset = dates.parts(first).weekdayIndex;
      const blanks = Array.from({ length: offset }, (_, index) => ({ key: `blank-${index}`, blank: true }));
      const cells = blanks.concat(days.map((day, index) => ({
        key: day.date,
        date: day.date,
        dayIndex: index + 1,
        dayNumber: dates.parts(day.date).day,
        title: day.title,
        rest: !day.hasTraining,
        isToday: day.date === today
      })));
      const firstWeek = days.slice(0, 7);
      const selectedDate = (days.find(day => day.date === today) || days[0]).date;
      this.setData({
        status: 'ready',
        eyebrow: `${MONTHS[dates.parts(selectedDate).month - 1]} · ${selectedDate.slice(0, 4)}`,
        cells,
        trainingPerWeek: firstWeek.filter(day => day.hasTraining).length,
        mealsPerDay: days[0].mealCount
      });
      this.select(selectedDate);
    } catch (error) {
      const code = error && error.error && error.error.code;
      if (code === 'AUTH_REQUIRED') { wx.reLaunch({ url: '/pages/onboarding/onboarding' }); return; }
      this.setData({ status: 'error' });
    }
  },

  pick(e) { if (e.currentTarget.dataset.date) this.select(e.currentTarget.dataset.date); },

  async select(date) {
    const cell = this.data.cells.find(item => item.date === date);
    if (!cell) return;
    const p = dates.parts(date);
    this.setData({
      selected: { ...cell, tag: `DAY ${String(cell.dayIndex).padStart(2, '0')}`, heading: `${p.month}月${p.day}日 · 星期${p.weekday}` },
      weekLabel: `第 ${Math.floor((cell.dayIndex - 1) / 7) + 1} 周`,
      detail: null
    });
    try {
      const result = await request(`/api/plan/today?date=${date}`);
      if (!this.data.selected || this.data.selected.date !== date || !result.plan) return;
      const day = result.plan.day;
      this.setData({
        detail: {
          kcal: day.dailyKcal,
          exercises: day.exercises.map((item, index) => ({ key: item.catalogId, index: String(index + 1).padStart(2, '0'), name: item.name, sets: `${item.sets} × ${item.reps}` })),
          note: day.reminders[0] || ''
        }
      });
    } catch (error) { /* the grid still works without the preview detail */ }
  },

  goToDay() {
    if (!this.data.selected) return;
    getApp().globalData.pendingDate = this.data.selected.date;
    wx.switchTab({ url: '/pages/today/today' });
  },

  retry() { this.setData({ status: 'loading' }); this.load(); }
});
