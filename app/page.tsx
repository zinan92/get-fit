"use client";

import { useMemo, useState } from "react";
import { CheckMark, ExerciseIllustration, FoodIllustration, HandIcon } from "./components/illustrations";
import { MiniNav } from "./components/mini-nav";

type Food = {
  name: string;
  portion: string;
  kcal: number;
  illustration: number;
};

type Meal = {
  id: string;
  label: string;
  time: string;
  foods: Food[];
};

const meals: Meal[] = [
  {
    id: "breakfast",
    label: "早餐",
    time: "07:30",
    foods: [
      { name: "水煮蛋", portion: "2 个", kcal: 144, illustration: 0 },
      { name: "原味酸奶", portion: "200g", kcal: 126, illustration: 1 },
      { name: "全麦吐司", portion: "60g", kcal: 148, illustration: 2 },
    ],
  },
  {
    id: "lunch",
    label: "午餐",
    time: "12:00",
    foods: [
      { name: "香煎鸡胸", portion: "150g", kcal: 248, illustration: 3 },
      { name: "糙米饭", portion: "120g", kcal: 139, illustration: 4 },
      { name: "西兰花", portion: "200g", kcal: 68, illustration: 5 },
    ],
  },
  {
    id: "snack",
    label: "下午加餐",
    time: "15:30",
    foods: [
      { name: "香蕉", portion: "120g", kcal: 107, illustration: 6 },
      { name: "低脂牛奶", portion: "250ml", kcal: 103, illustration: 7 },
      { name: "巴旦木", portion: "15g", kcal: 87, illustration: 8 },
    ],
  },
  {
    id: "dinner",
    label: "晚餐",
    time: "18:30",
    foods: [
      { name: "香烤三文鱼", portion: "150g", kcal: 312, illustration: 9 },
      { name: "烤红薯", portion: "200g", kcal: 172, illustration: 10 },
      { name: "清炒菠菜", portion: "200g", kcal: 46, illustration: 11 },
    ],
  },
];

type Exercise = {
  id: string;
  number: string;
  name: string;
  detail: string;
  cue: string;
  kind: "squat" | "row" | "bridge";
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
    cue: "组间休息 75 秒",
    kind: "squat",
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
    cue: "背部收紧，慢慢放下",
    kind: "row",
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
    cue: "顶端停留 2 秒",
    kind: "bridge",
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

const dateCells = [
  ["一", "10"],
  ["二", "11"],
  ["三", "12"],
  ["四", "13"],
  ["五", "14"],
] as const;

function progressLabel(progress: number): string {
  if (progress === 0) return "还没开始";
  if (progress === 100) return "全部完成";
  if (progress < 34) return "开始了";
  if (progress < 67) return "进行中";
  return "快完成了";
}

function NumberedText({ text }: { text: string }) {
  return <>{text.split(/(\d+(?:\.\d+)?)/g).map((part, index) => /\d/.test(part) ? <span className="num" key={`${part}-${index}`}>{part}</span> : part)}</>;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState("11");
  const [openExercise, setOpenExercise] = useState("squat");
  const [doneExercises, setDoneExercises] = useState<string[]>([]);
  const [doneMeals, setDoneMeals] = useState<string[]>(["breakfast"]);
  const [pulseExercise, setPulseExercise] = useState<string | null>(null);
  const [cheerMeal, setCheerMeal] = useState<string | null>(null);

  const totalKcal = useMemo(
    () => meals.flatMap((meal) => meal.foods).reduce((sum, food) => sum + food.kcal, 0),
    [],
  );
  const completed = doneExercises.length + doneMeals.length;
  const progress = Math.round((completed / 7) * 100);
  const dashOffset = 201 * (1 - progress / 100);

  const toggleExercise = (id: string) => {
    const isDone = doneExercises.includes(id);
    setDoneExercises((items) => (isDone ? items.filter((item) => item !== id) : [...items, id]));
    if (!isDone) {
      setPulseExercise(id);
      window.setTimeout(() => setPulseExercise((current) => (current === id ? null : current)), 650);
    }
  };

  const toggleMeal = (id: string) => {
    const isDone = doneMeals.includes(id);
    setDoneMeals((items) => (isDone ? items.filter((item) => item !== id) : [...items, id]));
    if (!isDone) {
      setCheerMeal(id);
      window.setTimeout(() => setCheerMeal((current) => (current === id ? null : current)), 850);
    }
  };

  return (
    <main className="site-shell">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <section className="phone" aria-label="轻练今日计划">
        <div className="screen">
          <header className="topbar">
            <a className="brand" href="#top" aria-label="轻练首页">
              <span className="mark">轻</span>
              <span className="wordmark">轻练</span>
            </a>
            <a className="topbtn" href="/plan" aria-label="查看完整月计划">
              <HandIcon name="calendar" />
              月计划
            </a>
          </header>

          <div className="greet rise" id="top">
            <div>
              <div className="eyebrow">8月11日 · 星期二</div>
              <h1>早上好，小满</h1>
              <p>今天也照顾好自己的身体。</p>
            </div>
            <div className="avatar" aria-hidden="true">M</div>
          </div>

          <div className="datestrip rise" style={{ animationDelay: ".05s" }} aria-label="本周日期">
            {dateCells.map(([weekday, date]) => (
              <button
                className={date === selectedDate ? "dcell sel" : "dcell"}
                type="button"
                key={date}
                onClick={() => setSelectedDate(date)}
                aria-pressed={date === selectedDate}
              >
                <span className="wd">{weekday}</span>
                <span className="dn num">{date}</span>
                <span className="dot" aria-hidden="true" />
              </button>
            ))}
          </div>

          <section className="card hero rise" style={{ animationDelay: ".1s" }} aria-label="今日进度">
            <div className="hero-top">
              <span className="chip confirmed">教练已确认</span>
              <span className="dayof">第 <b className="num">8</b><span className="num">/30</span> 天</span>
            </div>
            <div className="hero-mid">
              <div style={{ flex: 1 }}>
                <div className="eyebrow">今日主题</div>
                <h2>下肢力量日</h2>
                <div className="metachips"><span className="num">45 分钟</span><span className="num">约 {totalKcal} kcal</span></div>
              </div>
              <div className={progress === 100 ? "progress-ring full" : "progress-ring"} aria-label={`已完成 ${completed} / 7 项`}>
                <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true">
                  <circle cx="37" cy="37" r="32" fill="none" stroke="var(--line)" strokeWidth="7" />
                  <circle className="arc" cx="37" cy="37" r="32" fill="none" stroke="var(--train)" strokeWidth="7" strokeLinecap="round" strokeDasharray="201" strokeDashoffset={dashOffset} />
                </svg>
                <div className="ring-txt"><b className="num">{progress}%</b><span>{progressLabel(progress)}</span></div>
              </div>
            </div>
            <div className="quote">动作不用赶，今天把每次下蹲都做稳。</div>
          </section>

          <div className="warmup rise" style={{ animationDelay: ".15s" }}>
            <div className="ic"><HandIcon name="walk" /></div>
            <div><div className="t">先热身 8 分钟</div><div className="s">快走 5 分钟 + 动态髋部活动</div></div>
          </div>

          <div className="sec-head rise" style={{ animationDelay: ".2s" }}>
            <span className="eyebrow">Training</span>
            <h3>今天练什么</h3>
            <span className="count">3 个动作</span>
          </div>

          <div className="exlist rise" style={{ animationDelay: ".22s" }}>
            {exercises.map((exercise) => {
              const isDone = doneExercises.includes(exercise.id);
              const isOpen = openExercise === exercise.id;
              return (
                <article className="exercise-item" key={exercise.id}>
                  <div
                    className={isOpen ? "exrow open" : "exrow"}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-controls={`${exercise.id}-details`}
                    onClick={() => setOpenExercise(isOpen ? "" : exercise.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setOpenExercise(isOpen ? "" : exercise.id);
                      }
                    }}
                  >
                    <span className="exidx num">{exercise.number}</span>
                    <div className="exdemo-tile"><ExerciseIllustration kind={exercise.kind} /></div>
                    <div className="exb">
                      <div className="n">{exercise.name}</div>
                      <div className="s"><NumberedText text={exercise.detail} /></div>
                      <div className="cue"><NumberedText text={exercise.cue} /></div>
                    </div>
                    <button
                      className={isDone ? `check-button on cat-train${pulseExercise === exercise.id ? " pulse" : ""}` : "check-button cat-train"}
                      type="button"
                      onClick={(event) => { event.stopPropagation(); toggleExercise(exercise.id); }}
                      aria-pressed={isDone}
                      aria-label={isDone ? `取消完成${exercise.name}` : `标记完成${exercise.name}`}
                    >
                      <CheckMark />
                    </button>
                  </div>
                  <div className="exdetail" id={`${exercise.id}-details`} aria-hidden={!isOpen}>
                    <div className="exdetail-clip"><div className="exdetail-in">
                      <div className="exdetail-head"><span className="lb">动作要领</span><span className="steps-n">{exercise.steps.length} 步</span></div>
                      <div className="tagrow"><span>目标：{exercise.target}</span><span>器械：{exercise.equipment}</span></div>
                      <div className="steplist">
                        {exercise.steps.map((step, index) => <div className="step" key={`${exercise.id}-step-${index}`}><b>{index + 1}</b><span><NumberedText text={step} /></span></div>)}
                      </div>
                      <div className="safenote">按自己的舒适范围完成；出现疼痛时先停下，并联系教练。</div>
                    </div></div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="safetybar"><HandIcon name="warning" />膝盖保持与脚尖方向一致；若膝部不适，立即停止并联系教练。</div>
          <div className="credit">动作演示 · 轻练原创角色</div>

          <div className="sec-head"><span className="eyebrow">Meals</span><h3>今天吃什么</h3><span className="count num">约 {totalKcal} kcal</span></div>

          {meals.map((meal) => {
            const mealKcal = meal.foods.reduce((sum, food) => sum + food.kcal, 0);
            const isDone = doneMeals.includes(meal.id);
            return (
              <article className="meal" data-meal={meal.id} key={meal.id}>
                <div className="meal-head">
                  <div><div className="meal-time num">{meal.time}</div><div className="meal-name">{meal.label}</div></div>
                  <button className={isDone ? "pill on" : "pill"} type="button" onClick={() => toggleMeal(meal.id)} aria-pressed={isDone}>
                    <span className="pill-badge"><CheckMark /></span><span className="lb">{isDone ? "已吃完" : "完成打卡"}</span>
                  </button>
                </div>
                <div className="foods">
                  {meal.foods.map((food, index) => (
                    <div className={cheerMeal === meal.id ? "food cheer" : "food"} key={food.name} style={{ animationDelay: `${index * 70}ms` }}>
                      <FoodIllustration index={food.illustration} />
                      <div className="fn">{food.name}</div>
                      <div className="fg">{food.portion}</div>
                      <div className="fk">{food.kcal} kcal</div>
                    </div>
                  ))}
                </div>
                <div className="mealsum"><span className="lb">本餐合计</span><span className="vv num">{mealKcal} kcal</span></div>
              </article>
            );
          })}

          <MiniNav active="today" />
        </div>
      </section>
    </main>
  );
}
