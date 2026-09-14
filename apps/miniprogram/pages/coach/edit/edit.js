const { request } = require('../../../utils/api');
const characters = require('../../../utils/characters');

const MEAL_LABELS = { breakfast: '早餐', lunch: '午餐', snack: '加餐', dinner: '晚餐' };
const MOVE_GROUPS = [
  { key: 'all', label: '全部', patterns: null },
  { key: 'lower', label: '下肢', patterns: ['squat', 'lunge', 'hinge', 'bridge', 'calf'] },
  { key: 'upper', label: '上肢', patterns: ['row', 'pushup', 'bench', 'overhead', 'raise', 'curl', 'dip'] },
  { key: 'core', label: '核心', patterns: ['crunch', 'deadbug', 'plank', 'climber'] },
  { key: 'cardio', label: '有氧与拉伸', patterns: ['jack', 'walk', 'stretch'] }
];
const FOOD_GROUPS = [
  { key: 'staple', label: '主食' }, { key: 'protein', label: '蛋白质' }, { key: 'dairy', label: '奶和豆' },
  { key: 'vegetable', label: '蔬菜' }, { key: 'fruit', label: '水果' }, { key: 'fat', label: '坚果油脂' }
];
// Starting amounts when a move of a different kind is swapped in.
const DEFAULTS = { reps: { sets: 3, reps: 12, restSeconds: 60 }, seconds: { sets: 3, reps: 30, restSeconds: 30 }, minutes: { sets: 1, reps: 20, restSeconds: 0 } };
const LIMITS = { sets: [1, 10, 1], reps: [1, 100, 1], restSeconds: [0, 600, 15], grams: [10, 2000, 10] };

const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));

// The coach edits one day of a pending draft. The whole plan goes back through the server's
// validator on save; this page never decides on its own what is safe for the client.
Page({
  data: { preview: false, status: 'loading', draftId: '', date: '', clientName: '', dayIndex: 0, title: '', reminder: '', exercises: [], meals: [], dayKcal: 0, sheet: null, sheetGroups: [], sheetGroup: '', sheetItems: [], busy: false, dirty: false },

  onLoad(query) {
    this.setData({ preview: getApp().globalData.preview, draftId: query.draftId, date: query.date, clientName: decodeURIComponent(query.name || '') });
    this.load();
  },

  async load() {
    try {
      const [detail, options] = await Promise.all([request(`/api/coach/plan-drafts/${this.data.draftId}`), request(`/api/coach/plan-drafts/${this.data.draftId}/options`)]);
      this.payload = detail.draft.payload;
      this.moves = new Map(options.exercises.map(item => [item.id, item]));
      this.foods = new Map(options.foods.map(item => [item.id, item]));
      this.options = options;
      const day = this.payload.days.find(item => item.localDate === this.data.date) || this.payload.days[0];
      this.day = JSON.parse(JSON.stringify(day));
      this.setData({ status: 'ready', date: day.localDate, dayIndex: day.dayIndex, title: day.title, reminder: day.reminders[0] || '' });
      this.render();
    } catch (error) { this.setData({ status: 'error' }); }
  },

  // A move or food already in the draft may no longer be on the allowed list; it still shows, and the validator has the last word.
  moveInfo(id) { return this.moves.get(id) || { id, name: id, unit: 'reps', equipment: '', target: '' }; },
  foodInfo(id) { return this.foods.get(id) || { id, name: id, kcalPer100g: 0, unit: 'g' }; },

  render() {
    const exercises = this.day.exercises.map((item, index) => {
      const info = this.moveInfo(item.catalogId);
      return { key: `${index}-${item.catalogId}`, index, catalogId: item.catalogId, name: info.name, unit: info.unit, sets: item.sets, reps: item.reps, restSeconds: item.restSeconds, unitLabel: info.unit === 'minutes' ? '分钟' : info.unit === 'seconds' ? '秒' : '次', allowed: this.moves.has(item.catalogId) };
    });
    let dayKcal = 0;
    const meals = this.day.meals.map((meal, mealIndex) => {
      let kcal = 0;
      const foods = meal.foods.map((food, foodIndex) => {
        const info = this.foodInfo(food.foodCatalogId);
        const foodKcal = Math.round(info.kcalPer100g * food.grams / 100);
        kcal += foodKcal;
        return { key: `${foodIndex}-${food.foodCatalogId}`, foodIndex, id: food.foodCatalogId, name: info.name, grams: food.grams, unit: info.unit === 'ml' ? 'ml' : 'g', kcal: foodKcal, image: characters.food[food.foodCatalogId] || '', allowed: this.foods.has(food.foodCatalogId) };
      });
      dayKcal += kcal;
      return { key: meal.mealType, mealIndex, label: MEAL_LABELS[meal.mealType] || meal.mealType, kcal, foods, single: foods.length === 1 };
    });
    this.setData({ exercises, meals, dayKcal });
  },

  touch() { if (!this.data.dirty) this.setData({ dirty: true }); },

  onTitle(e) { this.day.title = e.detail.value; this.setData({ title: e.detail.value }); this.touch(); },
  onReminder(e) { this.day.reminders = e.detail.value ? [e.detail.value].concat(this.day.reminders.slice(1)) : this.day.reminders.slice(1); this.setData({ reminder: e.detail.value }); this.touch(); },

  stepMove(e) {
    const { index, field, delta } = e.currentTarget.dataset;
    const move = this.day.exercises[index];
    const [, , step] = LIMITS[field];
    move[field] = clamp(move[field] + Number(delta) * step, LIMITS[field]);
    this.render(); this.touch();
  },

  removeMove(e) {
    this.day.exercises.splice(e.currentTarget.dataset.index, 1);
    this.render(); this.touch();
  },

  stepFood(e) {
    const { meal, food, delta } = e.currentTarget.dataset;
    const item = this.day.meals[meal].foods[food];
    item.grams = clamp(item.grams + Number(delta) * LIMITS.grams[2], LIMITS.grams);
    this.render(); this.touch();
  },

  removeFood(e) {
    const { meal, food } = e.currentTarget.dataset;
    const foods = this.day.meals[meal].foods;
    if (foods.length === 1) { wx.showToast({ title: '每餐至少留一样，可以换成别的', icon: 'none' }); return; }
    foods.splice(food, 1);
    this.render(); this.touch();
  },

  // Sheet: pick a move or food to swap in or add.
  openMoveSheet(e) {
    const index = e.currentTarget.dataset.index;
    this.sheetTarget = { kind: 'move', index: index === undefined ? -1 : Number(index) };
    this.setData({ sheet: { title: index === undefined ? '加一个动作' : '换成' }, sheetGroups: MOVE_GROUPS.map(({ key, label }) => ({ key, label })) });
    this.pickGroup({ currentTarget: { dataset: { key: 'all' } } });
  },

  openFoodSheet(e) {
    const { meal, food } = e.currentTarget.dataset;
    this.sheetTarget = { kind: 'food', meal: Number(meal), food: food === undefined ? -1 : Number(food) };
    const current = food === undefined ? null : this.foodInfo(this.day.meals[meal].foods[food].foodCatalogId);
    this.setData({ sheet: { title: food === undefined ? `${MEAL_LABELS[this.day.meals[meal].mealType]}加一样` : '换成' }, sheetGroups: FOOD_GROUPS });
    this.pickGroup({ currentTarget: { dataset: { key: current && current.category ? current.category : 'staple' } } });
  },

  pickGroup(e) {
    const key = e.currentTarget.dataset.key;
    let items;
    if (this.sheetTarget.kind === 'move') {
      const group = MOVE_GROUPS.find(item => item.key === key);
      items = this.options.exercises.filter(item => !group.patterns || group.patterns.includes(item.pattern)).map(item => ({ id: item.id, name: item.name, sub: `${item.target} · ${item.equipment}${item.level === 'intermediate' ? ' · 进阶' : ''}` }));
    } else {
      items = this.options.foods.filter(item => item.category === key).map(item => ({ id: item.id, name: item.name, sub: `${item.kcalPer100g} kcal / 100${item.unit === 'ml' ? 'ml' : 'g'}`, image: characters.food[item.id] || '' }));
    }
    this.setData({ sheetGroup: key, sheetItems: items });
  },

  choose(e) {
    const id = e.currentTarget.dataset.id;
    const target = this.sheetTarget;
    if (target.kind === 'move') {
      const next = this.moveInfo(id);
      if (target.index < 0) this.day.exercises.push({ catalogId: id, ...DEFAULTS[next.unit], cues: [] });
      else {
        const current = this.day.exercises[target.index];
        const sameKind = this.moveInfo(current.catalogId).unit === next.unit;
        // Coach cues belong to the old move.
        this.day.exercises[target.index] = sameKind ? { ...current, catalogId: id, cues: [] } : { catalogId: id, ...DEFAULTS[next.unit], cues: [] };
      }
    } else {
      const foods = this.day.meals[target.meal].foods;
      if (target.food < 0) foods.push({ foodCatalogId: id, grams: 100 });
      else foods[target.food] = { ...foods[target.food], foodCatalogId: id };
    }
    this.closeSheet();
    this.render(); this.touch();
  },

  closeSheet() { this.setData({ sheet: null, sheetItems: [] }); },
  noop() {},

  async save() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    const payload = { ...this.payload, days: this.payload.days.map(day => day.localDate === this.day.localDate ? this.day : day) };
    try {
      await request(`/api/coach/plan-drafts/${this.data.draftId}`, { method: 'PATCH', data: { payload } });
      this.payload = payload;
      this.setData({ dirty: false });
      wx.showToast({ title: '这一天改好了', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 700);
    } catch (error) {
      const details = error && error.error && error.error.details;
      const messages = details && details.messages && details.messages.length ? details.messages : ['没保存成功，再试一次'];
      wx.showModal({ title: '还不能保存', content: messages.join('\n'), showCancel: false, confirmText: '去改' });
    } finally { this.setData({ busy: false }); }
  },

  async cancel() {
    if (this.data.dirty) {
      const result = await wx.showModal({ title: '放弃这次修改？', content: '改动还没保存。', confirmText: '放弃', cancelText: '继续改' });
      if (!result.confirm) return;
    }
    wx.navigateBack();
  }
});
