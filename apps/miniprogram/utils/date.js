const preview = require('./preview');

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function shanghaiToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function today() {
  return getApp().globalData.preview ? preview.previewToday() : shanghaiToday();
}

function parts(date) {
  const value = new Date(`${date}T00:00:00Z`);
  return { month: value.getUTCMonth() + 1, day: value.getUTCDate(), weekday: WEEKDAYS[value.getUTCDay()], weekdayIndex: value.getUTCDay() };
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

/** Splits text so digits can use the numeral face. */
function numberParts(text) {
  return String(text).split(/(\d+(?:\.\d+)?)/g).filter(Boolean).map(value => ({ value, num: /\d/.test(value) }));
}

module.exports = { WEEKDAYS, today, parts, addDays, greeting, numberParts };
