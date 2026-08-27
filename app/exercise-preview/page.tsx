import type { Metadata } from "next";
import Link from "next/link";
import "./preview.css";

export const metadata: Metadata = {
  title: "轻练 · 动作 GIF 预览",
  description: "代表性动作素材的私有观感预览，不代表商业复用权已清除。",
};

const sourceCommit = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd";

const samples = [
  {
    id: "0334",
    name: "哑铃侧平举",
    english: "Dumbbell lateral raise",
    equipment: "哑铃",
    bodyPart: "肩部",
    target: "三角肌",
    file: "dumbbell-lateral-raise.gif",
    cue: "抬到与地面平行，动作慢一点。",
  },
  {
    id: "0662",
    name: "俯卧撑",
    english: "Push-up",
    equipment: "自重",
    bodyPart: "胸部",
    target: "胸大肌",
    file: "push-up.gif",
    cue: "身体保持一条线，肩膀远离耳朵。",
  },
  {
    id: "1760",
    name: "哑铃高脚杯深蹲",
    english: "Dumbbell goblet squat",
    equipment: "哑铃",
    bodyPart: "大腿",
    target: "股四头肌",
    file: "dumbbell-goblet-squat.gif",
    cue: "膝盖跟着脚尖方向，站起时收紧臀部。",
  },
];

export default function ExercisePreview() {
  return (
    <main className="exercise-preview-shell">
      <div className="preview-orb preview-orb-one" aria-hidden="true" />
      <div className="preview-orb preview-orb-two" aria-hidden="true" />
      <section className="preview-panel">
        <header className="preview-header">
          <div>
            <p className="preview-kicker">轻练 · 素材试看片</p>
            <h1>这几个动作，动起来好看吗？</h1>
            <p className="preview-lede">先看清楚动作，再决定要不要放进教练审核的动作库。</p>
          </div>
          <Link className="preview-back" href="/">返回今日计划 ↗</Link>
        </header>

        <div className="preview-note">
          <span className="note-icon">◎</span>
          <p><strong>这是私有素材评估预览</strong> · GIF 为 180×180，来自固定 commit；页面不代表商业复用权已经清除。</p>
        </div>

        <section className="sample-grid" aria-label="代表性动作 GIF">
          {samples.map((sample) => (
            <article className="sample-card" key={sample.id}>
              <div className="sample-media">
                {/* GIFs must remain native <img> elements so the animation plays. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/exercise-preview/${sample.file}`} alt={`${sample.name} 动作演示`} width={180} height={180} />
                <span className="sample-id">#{sample.id}</span>
              </div>
              <div className="sample-copy">
                <div className="sample-title-row">
                  <div><h2>{sample.name}</h2><p>{sample.english}</p></div>
                  <span className="motion-pill">GIF 动画</span>
                </div>
                <div className="sample-tags"><span>{sample.equipment}</span><span>{sample.bodyPart}</span><span>目标 · {sample.target}</span></div>
                <p className="sample-cue">教练提示：{sample.cue}</p>
              </div>
            </article>
          ))}
        </section>

        <footer className="preview-footer">
          <span>© Gym visual — https://gymvisual.com/</span>
          <span>source commit · {sourceCommit.slice(0, 7)}</span>
          <span>仅供动作素材评估</span>
        </footer>
      </section>
    </main>
  );
}
