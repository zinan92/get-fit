const { request } = require('../../utils/api');
const characters = require('../../utils/characters');
const dates = require('../../utils/date');

const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', snack: '下午加餐', dinner: '晚餐' };

function progressLabel(progress) {
  if (progress === 0) return '还没开始';
  if (progress === 100) return '全部完成';
  if (progress < 34) return '开始了';
  if (progress < 67) return '进行中';
  return '快完成了';
}

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
    exercises: [],
    meals: [],
    done: {},
    pulse: '',
    cheer: '',
    openId: '',
    progress: 0,
    progressText: '还没开始',
    ringDeg: 0
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

  buildStrip(selected) {
    const today = this.data.today;
    return [-2, -1, 0, 1, 2].map(offset => {
      const date = dates.addDays(today, offset);
      const p = dates.parts(date);
      return { date, weekday: offset === 0 ? '今' : p.weekday, day: p.day, selected: date === selected };
    });
  },

  async load() {
    const date = this.data.date;
    const p = dates.parts(date);
    this.setData({
      eyebrow: `${p.month}月${p.day}日 · 星期${p.weekday}`,
      greeting: dates.greeting(),
      strip: this.buildStrip(date)
    });
    try {
      const [me, result] = await Promise.all([request('/api/me'), request(`/api/plan/today?date=${date}`)]);
      const day = result.plan ? result.plan.day : null;
      const done = {};
      (result.checkins || []).forEach(item => { done[item.itemId] = true; });
      const exercises = day ? day.exercises.map((item, index) => ({
        id: item.catalogId,
        index: String(index + 1).padStart(2, '0'),
        name: item.name,
        kind: (characters.exercise[item.catalogId] || []).length ? item.catalogId : '',
        detail: dates.numberParts(`${item.sets} 组 × ${item.reps} 次`),
        cue: dates.numberParts(item.restSeconds ? `组间休息 ${item.restSeconds} 秒` : (item.cues[0] || '')),
        target: item.target,
        equipment: item.equipment,
        steps: item.steps.map(step => dates.numberParts(step)),
        cues: item.cues
      })) : [];
      const meals = day ? day.meals.map(meal => ({
        id: meal.mealType,
        label: MEAL_LABELS[meal.mealType] || meal.mealType,
        kcal: meal.mealKcal,
        foods: meal.foods.map(food => ({
          id: food.foodCatalogId,
          name: food.name,
          portion: `${food.grams}${food.unit === 'item' ? '份' : food.unit}`,
          kcal: food.kcal,
          image: characters.food[food.foodCatalogId] || ''
        }))
      })) : [];
      this.setData({
        status: result.status,
        name: (me.client && me.client.displayName) || '',
        planId: result.plan ? result.plan.id : '',
        day,
        exercises,
        meals,
        done,
        openId: exercises.length ? exercises[0].id : ''
      });
      this.refreshProgress();
    } catch (error) {
      const code = error && error.error && error.error.code;
      if (code === 'AUTH_REQUIRED') { wx.reLaunch({ url: '/pages/onboarding/onboarding' }); return; }
      this.setData({ status: 'error' });
    }
  },

  refreshProgress() {
    const total = this.data.exercises.length + this.data.meals.length;
    const completed = this.data.exercises.filter(item => this.data.done[item.id]).length + this.data.meals.filter(item => this.data.done[item.id]).length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    this.setData({ progress, progressText: progressLabel(progress), ringDeg: Math.round(progress * 3.6) });
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    if (date === this.data.date) return;
    this.setData({ date, status: 'loading' });
    this.load();
  },

  toggleDetail(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ openId: this.data.openId === id ? '' : id });
  },

  async toggleExercise(e) { await this.toggle(e.currentTarget.dataset.id, 'exercise'); },
  async toggleMeal(e) { await this.toggle(e.currentTarget.dataset.id, 'meal'); },

  async toggle(itemId, itemType) {
    const wasDone = Boolean(this.data.done[itemId]);
    const done = { ...this.data.done, [itemId]: !wasDone };
    this.setData({ done });
    this.refreshProgress();
    if (!wasDone) {
      if (itemType === 'exercise') { this.setData({ pulse: itemId }); setTimeout(() => { if (this.data.pulse === itemId) this.setData({ pulse: '' }); }, 650); }
      else { this.setData({ cheer: itemId }); setTimeout(() => { if (this.data.cheer === itemId) this.setData({ cheer: '' }); }, 850); }
      wx.vibrateShort && wx.vibrateShort({ type: 'light' });
    }
    try {
      await request('/api/checkins', { method: 'PUT', data: { localDate: this.data.date, planDayId: `${this.data.planId}:${this.data.date}`, itemId, itemType, status: wasDone ? 'not_completed' : 'completed' } });
    } catch (error) {
      this.setData({ done: { ...this.data.done, [itemId]: wasDone } });
      this.refreshProgress();
      wx.showToast({ title: '没存上，再点一次试试', icon: 'none' });
    }
  },

  openCalendar() { wx.switchTab({ url: '/pages/calendar/calendar' }); },
  retry() { this.setData({ status: 'loading' }); this.load(); }
});
