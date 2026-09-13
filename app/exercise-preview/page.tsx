import type { Metadata } from "next";
import { ExerciseIllustration, HandIcon } from "../components/illustrations";
import "./preview.css";

export const metadata: Metadata = {
  title: "轻练 · 动作角色预览",
  description: "轻练原创动作角色的循环演示。",
};

const samples = [
  {
    id: "1760",
    name: "高脚杯深蹲",
    english: "Dumbbell goblet squat",
    equipment: "哑铃",
    bodyPart: "大腿",
    target: "股四头肌",
    kind: "squat" as const,
    cue: "膝盖跟着脚尖方向，站起时收紧臀部。",
  },
  {
    id: "0293",
    name: "单臂哑铃划船",
    english: "Single-arm dumbbell row · supported variation",
    equipment: "哑铃",
    bodyPart: "背部",
    target: "背阔肌",
    kind: "row" as const,
    cue: "支撑住身体，肘部向后拉，不要耸肩。",
  },
  {
    id: "3013",
    name: "臀桥",
    english: "Low glute bridge on floor",
    equipment: "自重",
    bodyPart: "大腿",
    target: "臀大肌",
    kind: "bridge" as const,
    cue: "顶端停留两秒，不要过度挺腰。",
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
          {/* Native anchors keep navigation working in the Sites/vinext runtime. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="preview-back" href="/">返回今日计划 <HandIcon name="arrow" /></a>
        </header>

        <div className="preview-note">
          <span className="note-icon"><HandIcon name="warning" /></span>
          <p><strong>这是动作角色预览</strong> · 三个原创角色会循环演示动作节奏，供教练检查动作表达。</p>
        </div>

        <section className="sample-grid" aria-label="代表性动作演示">
          {samples.map((sample) => (
            <article className="sample-card" key={sample.id}>
              <div className="sample-media">
                <ExerciseIllustration kind={sample.kind} />
                <span className="sample-id">#{sample.id}</span>
              </div>
              <div className="sample-copy">
                <div className="sample-title-row">
                  <div><h2>{sample.name}</h2><p>{sample.english}</p></div>
                  <span className="motion-pill">循环演示</span>
                </div>
                <div className="sample-tags"><span>{sample.equipment}</span><span>{sample.bodyPart}</span><span>目标 · {sample.target}</span></div>
                <p className="sample-cue">教练提示：{sample.cue}</p>
              </div>
            </article>
          ))}
        </section>

        <footer className="preview-footer">
          <span>动作演示 · 轻练原创角色</span>
          <span>训练动作会随打卡状态变化</span>
          <span>仅供动作角色预览</span>
        </footer>
      </section>
    </main>
  );
}
