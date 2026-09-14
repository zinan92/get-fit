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

function exerciseView(item, index) {
  const amount = item.unit === 'minutes' ? `${item.reps} 分钟` : `${item.sets} 组 × ${item.reps} ${item.unit === 'seconds' ? '秒' : '次'}`;
  return {
    id: item.catalogId,
    index: String(index + 1).padStart(2, '0'),
    name: item.name,
    detail: dates.numberParts(amount),
    cue: dates.numberParts(item.restSeconds ? `组间休息 ${item.restSeconds} 秒` : (item.cues[0] || '')),
    target: item.target,
    equipment: item.equipment,
    steps: item.steps.map(step => dates.numberParts(step))
  };
}

function mealView(meal) {
  return {
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
  };
}

// One plan day exactly as the client sees it. The client's today page and the coach's draft
// preview both render this, so the coach approves what the client will get.
Component({
  // Uses the app-wide card, chip and check-in styles.
  options: { multipleSlots: true, styleIsolation: 'apply-shared' },
  properties: {
    day: { type: Object, value: null },
    done: { type: Object, value: {} },
    readonly: { type: Boolean, value: false },
    /** Replaces the "coach confirmed" chip, e.g. on the coach's review screen. */
    badge: { type: String, value: '' }
  },
  data: { exercises: [], meals: [], openId: '', pulse: '', cheer: '', progress: 0, progressText: '还没开始', ringDeg: 0 },
  observers: {
    day(day) {
      const exercises = day ? day.exercises.map(exerciseView) : [];
      this.setData({ exercises, meals: day ? day.meals.map(mealView) : [], openId: exercises.length ? exercises[0].id : '' });
      this.refreshProgress();
    },
    done() { this.refreshProgress(); }
  },
  methods: {
    refreshProgress() {
      const done = this.data.done || {};
      const items = this.data.exercises.map(item => item.id).concat(this.data.meals.map(item => item.id));
      const completed = items.filter(id => done[id]).length;
      const progress = items.length ? Math.round((completed / items.length) * 100) : 0;
      this.setData({ progress, progressText: progressLabel(progress), ringDeg: Math.round(progress * 3.6) });
    },
    toggleDetail(e) {
      const id = e.currentTarget.dataset.id;
      this.setData({ openId: this.data.openId === id ? '' : id });
    },
    tapExercise(e) { this.tap(e.currentTarget.dataset.id, 'exercise'); },
    tapMeal(e) { this.tap(e.currentTarget.dataset.id, 'meal'); },
    tap(itemId, itemType) {
      if (this.data.readonly) return;
      const wasDone = Boolean((this.data.done || {})[itemId]);
      if (!wasDone) {
        const key = itemType === 'exercise' ? 'pulse' : 'cheer';
        this.setData({ [key]: itemId });
        setTimeout(() => { if (this.data[key] === itemId) this.setData({ [key]: '' }); }, itemType === 'exercise' ? 650 : 850);
        if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
      }
      this.triggerEvent('toggle', { itemId, itemType, wasDone });
    }
  }
});
