"use client";

import { useMemo, useState } from "react";

type Food = {
  name: string;
  portion: string;
  kcal: number;
  sprite: number;
};

type Meal = {
  id: string;
  label: string;
  time: string;
  tone: string;
  foods: Food[];
};

const meals: Meal[] = [
  {
    id: "breakfast",
    label: "早餐",
    time: "07:30",
    tone: "sunny",
    foods: [
      { name: "水煮蛋", portion: "2 个", kcal: 144, sprite: 0 },
      { name: "原味酸奶", portion: "200g", kcal: 126, sprite: 1 },
      { name: "全麦吐司", portion: "60g", kcal: 148, sprite: 2 },
    ],
  },
  {
    id: "lunch",
    label: "午餐",
    time: "12:00",
    tone: "green",
    foods: [
      { name: "香煎鸡胸", portion: "150g", kcal: 248, sprite: 3 },
      { name: "糙米饭", portion: "120g", kcal: 139, sprite: 4 },
      { name: "西兰花", portion: "200g", kcal: 68, sprite: 5 },
    ],
  },
  {
    id: "snack",
    label: "下午加餐",
    time: "15:30",
    tone: "purple",
    foods: [
      { name: "香蕉", portion: "120g", kcal: 107, sprite: 6 },
      { name: "低脂牛奶", portion: "250ml", kcal: 103, sprite: 10 },
      { name: "巴旦木", portion: "15g", kcal: 87, sprite: 11 },
    ],
  },
  {
    id: "dinner",
    label: "晚餐",
    time: "18:30",
    tone: "rose",
    foods: [
      { name: "香烤三文鱼", portion: "150g", kcal: 312, sprite: 7 },
      { name: "烤红薯", portion: "200g", kcal: 172, sprite: 8 },
      { name: "清炒菠菜", portion: "200g", kcal: 46, sprite: 9 },
    ],
  },
];

const exercises = [
  { id: "squat", number: "01", name: "高脚杯深蹲", detail: "4 组 × 12 次", rest: "组间休息 75 秒", gif: "/exercise-preview/dumbbell-goblet-squat.gif", sourceId: "1760", mediaNote: "站姿演示" },
  { id: "row", number: "02", name: "单臂哑铃划船", detail: "4 组 × 10 次 / 侧", rest: "背部收紧，慢慢放下", gif: "/exercise-preview/single-arm-dumbbell-row.gif", sourceId: "1330", mediaNote: "支撑版演示" },
  { id: "bridge", number: "03", name: "臀桥", detail: "3 组 × 15 次", rest: "顶端停留 2 秒", gif: "/exercise-preview/low-glute-bridge.gif", sourceId: "3013", mediaNote: "地面演示" },
];

const spritePosition = (index: number) => {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return `${(column / 3) * 100}% ${(row / 2) * 100}%`;
};

export default function Home() {
  const [doneExercises, setDoneExercises] = useState<string[]>(["squat"]);
  const [doneMeals, setDoneMeals] = useState<string[]>(["breakfast"]);
  const [waterDone, setWaterDone] = useState(false);

  const totalKcal = useMemo(
    () => meals.flatMap((meal) => meal.foods).reduce((sum, food) => sum + food.kcal, 0),
    [],
  );
  const completed = doneExercises.length + doneMeals.length + Number(waterDone);
  const progress = Math.round((completed / 8) * 100);

  const toggle = (id: string, items: string[], update: (next: string[]) => void) => {
    update(items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="phone" aria-label="轻练今日计划 mockup">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="轻练首页">
            <span className="brand-mark">轻</span>
            <span>轻练</span>
          </a>
          <button className="calendar-button" type="button" aria-label="查看完整月计划">
            <span className="calendar-glyph">▦</span>
            月计划
          </button>
        </header>

        <div className="scroll-content" id="top">
          <section className="welcome-block">
            <div>
              <p className="eyebrow">8 月 11 日 · 星期二</p>
              <h1>早上好，小满</h1>
              <p className="welcome-copy">今天也照顾好自己的身体。</p>
            </div>
            <div className="avatar" aria-hidden="true">M</div>
          </section>

          <section className="date-strip" aria-label="本周日期">
            {[
              ["一", "10"],
              ["二", "11"],
              ["三", "12"],
              ["四", "13"],
              ["五", "14"],
            ].map(([week, date]) => (
              <button className={date === "11" ? "date active" : "date"} type="button" key={date}>
                <span>{week}</span>
                <strong>{date}</strong>
                {date === "11" && <i />}
              </button>
            ))}
          </section>

          <section className="day-card">
            <div className="day-card-top">
              <span className="approved"><i /> 教练已确认</span>
              <span className="day-count">第 8 / 30 天</span>
            </div>
            <div className="day-card-main">
              <div>
                <p>今日主题</p>
                <h2>下肢力量日</h2>
                <div className="summary-pills">
                  <span>45 分钟</span>
                  <span>{totalKcal} kcal</span>
                </div>
              </div>
              <div className="progress-ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}>
                <div><strong>{progress}%</strong><span>完成</span></div>
              </div>
            </div>
            <p className="coach-note">“动作不用赶，今天把每次下蹲都做稳。”</p>
          </section>

          <section className="content-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">TRAINING</p>
                <h2>今天练什么</h2>
              </div>
              <span className="section-meta">3 个动作</span>
            </div>

            <div className="training-card">
              <div className="warmup-row">
                <div className="warmup-icon">↗</div>
                <div><strong>先热身 8 分钟</strong><span>快走 5 分钟 + 动态髋部活动</span></div>
              </div>
              <div className="exercise-list">
                {exercises.map((exercise) => {
                  const isDone = doneExercises.includes(exercise.id);
                  return (
                    <button
                      className={isDone ? "exercise done" : "exercise"}
                      key={exercise.id}
                      type="button"
                      onClick={() => toggle(exercise.id, doneExercises, setDoneExercises)}
                      aria-pressed={isDone}
                    >
                      <span className="exercise-number">{exercise.number}</span>
                      <span className="exercise-media">
                        <span className="exercise-media-fallback">动作演示</span>
                        {/* Keep the source GIF native so it loops in the client card. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={exercise.gif}
                          alt={`${exercise.name} 动作演示`}
                          width={72}
                          height={72}
                          loading="lazy"
                          onError={(event) => { event.currentTarget.style.display = "none"; }}
                        />
                        <small>{exercise.mediaNote} · #{exercise.sourceId}</small>
                      </span>
                      <span className="exercise-copy">
                        <strong>{exercise.name}</strong>
                        <span>{exercise.detail}</span>
                        <small>{exercise.rest}</small>
                      </span>
                      <span className="check" aria-hidden="true">{isDone ? "✓" : ""}</span>
                    </button>
                  );
                })}
              </div>
              <div className="form-note"><span>!</span>膝盖保持与脚尖方向一致；若膝部不适，立即停止并联系教练。</div>
              <p className="exercise-media-credit">动作 GIF：© Gym visual — https://gymvisual.com/ · 原始素材 180×180，仅供演示</p>
            </div>
          </section>

          <section className="content-section meals-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">MEALS</p>
                <h2>今天吃什么</h2>
              </div>
              <span className="section-meta">约 {totalKcal} kcal</span>
            </div>
            <p className="meal-intro">按图准备就好，克数按可食用部分计算。</p>

            <div className="meal-list">
              {meals.map((meal) => {
                const mealKcal = meal.foods.reduce((sum, food) => sum + food.kcal, 0);
                const isDone = doneMeals.includes(meal.id);
                return (
                  <article className={`meal-card ${meal.tone}`} key={meal.id}>
                    <div className="meal-header">
                      <div><span>{meal.time}</span><h3>{meal.label}</h3></div>
                      <button
                        className={isDone ? "meal-check done" : "meal-check"}
                        type="button"
                        onClick={() => toggle(meal.id, doneMeals, setDoneMeals)}
                        aria-pressed={isDone}
                      >
                        <span className="check" aria-hidden="true">{isDone ? "✓" : ""}</span>
                        {isDone ? "已吃完" : "完成打卡"}
                      </button>
                    </div>
                    <div className="foods">
                      {meal.foods.map((food) => (
                        <div className="food" key={food.name}>
                          <div
                            className="food-image"
                            style={{ backgroundPosition: spritePosition(food.sprite) }}
                            role="img"
                            aria-label={food.name}
                          />
                          <strong>{food.name}</strong>
                          <span>{food.portion}</span>
                          <small>{food.kcal} kcal</small>
                        </div>
                      ))}
                    </div>
                    <div className="meal-total"><span>本餐合计</span><strong>{mealKcal} kcal</strong></div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="content-section reminder-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">REMINDERS</p>
                <h2>今天注意什么</h2>
              </div>
            </div>
            <div className="reminder-grid">
              <button className={waterDone ? "reminder water done" : "reminder water"} type="button" onClick={() => setWaterDone(!waterDone)} aria-pressed={waterDone}>
                <span className="reminder-icon">◒</span>
                <strong>喝水 2L</strong>
                <small>{waterDone ? "完成得很好" : "少量多次饮用"}</small>
                <span className="mini-check">{waterDone ? "✓" : "+"}</span>
              </button>
              <div className="reminder sleep">
                <span className="reminder-icon">☾</span>
                <strong>睡满 7 小时</strong>
                <small>23:00 前上床</small>
              </div>
              <div className="reminder timing">
                <span className="reminder-icon">◷</span>
                <strong>餐后再训练</strong>
                <small>至少间隔 90 分钟</small>
              </div>
            </div>
            <p className="disclaimer">本页仅为产品界面示例，训练与热量数据不构成个人健康建议。</p>
          </section>
        </div>

        <nav className="bottom-nav" aria-label="主要导航">
          <a className="nav-item active" href="#top"><span>●</span><strong>今天</strong></a>
          <button className="nav-item" type="button"><span>▦</span><strong>计划</strong></button>
          <button className="nav-item" type="button"><span>◉</span><strong>我的</strong></button>
        </nav>
      </section>
    </main>
  );
}
