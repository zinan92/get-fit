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

type Exercise = {
  id: string;
  number: string;
  name: string;
  detail: string;
  rest: string;
  gif: string;
  sourceId: string;
  mediaNote: string;
  target: string;
  equipment: string;
  steps: string[];
};

const exercises: Exercise[] = [
  {
    id: "squat",
    number: "01",
    name: "高脚杯深蹲",
    detail: "4 组 × 12 次",
    rest: "组间休息 75 秒",
    gif: "/exercise-preview/dumbbell-goblet-squat.gif",
    sourceId: "1760",
    mediaNote: "站姿演示",
    target: "股四头肌",
    equipment: "哑铃",
    steps: [
      "双脚分开与肩同宽站立，双手握住哑铃垂直放在胸前。",
      "保持胸部挺直，核心收紧，通过向后推臀部并弯曲膝盖，将身体降低至蹲姿。",
      "继续降低，直到大腿与地面平行，或者尽可能低。",
      "在底部停顿片刻，然后推动脚后跟回到起始位置。",
      "重复所需的重复次数。",
    ],
  },
  {
    id: "row",
    number: "02",
    name: "单臂哑铃划船",
    detail: "4 组 × 10 次 / 侧",
    rest: "背部收紧，慢慢放下",
    gif: "/exercise-preview/single-arm-dumbbell-row.gif",
    sourceId: "1330",
    mediaNote: "支撑版演示",
    target: "上背部",
    equipment: "哑铃 + 上斜凳",
    steps: [
      "设置一个 45 度角的上斜凳。",
      "将哑铃放在长凳旁边的地板上。",
      "面对长凳站立，双脚分开与肩同宽。",
      "弯曲腰部，将左膝和左手放在长凳上以获得支撑。",
      "用右手反握（手掌朝下）拿起哑铃。",
      "保持背部挺直，核心肌群参与。",
      "将哑铃向上拉向胸部，保持肘部靠近身体。",
      "在动作的最高点挤压背部肌肉。",
      "以受控的方式将哑铃放回起始位置。",
      "重复所需的重复次数。",
      "换边并用左臂重复练习。",
    ],
  },
  {
    id: "bridge",
    number: "03",
    name: "臀桥",
    detail: "3 组 × 15 次",
    rest: "顶端停留 2 秒",
    gif: "/exercise-preview/low-glute-bridge.gif",
    sourceId: "3013",
    mediaNote: "地面演示",
    target: "臀肌",
    equipment: "自重",
    steps: [
      "平躺，膝盖弯曲，双脚平放在地上。",
      "将手臂放在身体两侧，手掌朝下。",
      "启动臀肌和核心肌群，然后将臀部抬离地面，直到身体从膝盖到肩膀形成一条直线。",
      "在顶部暂停片刻，挤压臀部。",
      "慢慢地将臀部放回起始位置。",
      "重复所需的重复次数。",
    ],
  },
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
                    <article className={isDone ? "exercise done" : "exercise"} key={exercise.id}>
                      <div className="exercise-line">
                        <details className="exercise-details" open={exercise.id === "squat"}>
                          <summary className="exercise-summary">
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
                          </summary>
                          <div className="exercise-detail">
                            <div className="exercise-detail-heading">
                              <strong>动作要领</strong>
                              <span>{exercise.steps.length} 步</span>
                            </div>
                            <div className="exercise-tags">
                              <span>目标：{exercise.target}</span>
                              <span>器械：{exercise.equipment}</span>
                            </div>
                            <ol>
                              {exercise.steps.map((step, index) => <li key={`${exercise.id}-step-${index}`}>{step}</li>)}
                            </ol>
                            <p>按自己的舒适范围完成；出现疼痛时先停下，并联系教练。</p>
                          </div>
                        </details>
                        <button
                          className="exercise-check"
                          type="button"
                          onClick={() => toggle(exercise.id, doneExercises, setDoneExercises)}
                          aria-pressed={isDone}
                          aria-label={isDone ? `取消完成${exercise.name}` : `标记完成${exercise.name}`}
                        >
                          <span className="check" aria-hidden="true">{isDone ? "✓" : ""}</span>
                        </button>
                      </div>
                    </article>
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
