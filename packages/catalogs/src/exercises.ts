/**
 * 轻练动作库。
 *
 * 动作名称、目标肌群与步骤主体取自 hasaneyldrm/exercises-dataset（数据部分 MIT
 * 许可；其动图版权属 Gym visual，本产品不使用）。中文步骤在原译文基础上校订，
 * 去掉了“重复所需次数”之类的冗余句，并补上教练口吻的要点与禁忌标签。
 * `source.datasetId` 可回查原始条目；标注为 authored 的条目由轻练编写。
 */

/** Character rig used to draw the move; see packages/illustrations. */
export type MovementPattern =
  | "squat" | "lunge" | "hinge" | "bridge" | "row" | "pushup" | "bench" | "overhead"
  | "raise" | "curl" | "dip" | "crunch" | "deadbug" | "plank" | "climber" | "jack"
  | "calf" | "stretch" | "walk";

/** Equipment a client must have; body weight, a chair or a wall are assumed available. */
export type EquipmentTag = "dumbbell" | "band" | "kettlebell" | "bench";

/** Flags from the profile that make a move unsuitable. */
export type Contraindication =
  | "acute_knee_pain" | "acute_back_pain" | "acute_ankle_pain" | "acute_shoulder_pain" | "acute_wrist_pain"
  | "knee_discomfort" | "back_discomfort" | "shoulder_discomfort" | "wrist_discomfort" | "ankle_discomfort";

export type ExerciseCatalogEntry = {
  id: string;
  name: string;
  pattern: MovementPattern;
  level: "beginner" | "intermediate";
  target: string;
  equipment: string;
  equipmentTags: EquipmentTag[];
  contraindications: Contraindication[];
  cues: string[];
  steps: string[];
  /** Duration-based moves count reps as minutes (walk) or seconds (holds). */
  unit: "reps" | "seconds" | "minutes";
  source: { kind: "dataset"; datasetId: string } | { kind: "authored" };
  sourceVersion: string;
  mediaPath?: string;
  mediaAttribution?: string;
};

const DATASET = "exercises-dataset@2026-09";
const AUTHORED = "qinglian-2026-09";
const ds = (datasetId: string) => ({ kind: "dataset" as const, datasetId });
const authored = { kind: "authored" as const };

const knee = ["acute_knee_pain", "knee_discomfort"] as const;
const back = ["acute_back_pain", "back_discomfort"] as const;
const shoulder = ["acute_shoulder_pain", "shoulder_discomfort"] as const;
const wrist = ["acute_wrist_pain", "wrist_discomfort"] as const;
const ankle = ["acute_ankle_pain", "ankle_discomfort"] as const;

export const exerciseCatalog: ExerciseCatalogEntry[] = [
  // 下肢 · 蹲
  {
    id: "ex-goblet-squat", name: "高脚杯深蹲", pattern: "squat", level: "beginner", target: "股四头肌、臀肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...knee], unit: "reps", source: ds("1760"), sourceVersion: DATASET,
    cues: ["膝盖与脚尖同向", "蹲下时像往后坐椅子"],
    steps: ["双脚与肩同宽站立，双手竖握一只哑铃贴在胸前。", "挺胸、收紧核心，臀部向后坐、膝盖弯曲，身体慢慢下蹲。", "蹲到大腿接近与地面平行，或到自己舒适的深度。", "稍停一下，脚跟发力站起回到起始姿势。"],
  },
  {
    id: "ex-bodyweight-squat", name: "徒手深蹲举手", pattern: "squat", level: "beginner", target: "股四头肌、臀肌", equipment: "自重", equipmentTags: [],
    contraindications: [...knee], unit: "reps", source: ds("1685"), sourceVersion: DATASET,
    cues: ["脚跟始终踩稳", "站起时手臂向上够"],
    steps: ["双脚与肩同宽站立，脚尖微微外展。", "臀部向后坐、膝盖弯曲，身体下蹲。", "站起的同时双臂向上举过头顶，像去够天花板。", "放下手臂，再次下蹲进入下一次。"],
  },
  {
    id: "ex-band-squat", name: "弹力带深蹲", pattern: "squat", level: "beginner", target: "臀肌、股四头肌", equipment: "弹力带", equipmentTags: ["band"],
    contraindications: [...knee], unit: "reps", source: ds("1004"), sourceVersion: DATASET,
    cues: ["膝盖向外轻轻撑住弹力带", "重心放在脚跟"],
    steps: ["双脚与肩同宽站立，弹力带套在膝盖上方。", "挺胸、收紧核心，臀部向后坐、膝盖弯曲下蹲。", "下蹲时膝盖对准脚尖方向，不要向内扣。", "在底部稍停，脚跟发力站起。"],
  },
  {
    id: "ex-jump-squat", name: "跳跃深蹲", pattern: "squat", level: "intermediate", target: "臀肌、股四头肌", equipment: "自重", equipmentTags: [],
    contraindications: [...knee, ...ankle], unit: "reps", source: ds("0514"), sourceVersion: DATASET,
    cues: ["落地要轻，像猫一样", "膝盖不适就改成普通深蹲"],
    steps: ["双脚与肩同宽站立。", "臀部向后坐、膝盖弯曲，下蹲到舒适深度。", "脚掌发力向上跳起，髋、膝、踝同时伸直。", "前脚掌先轻轻落地，顺势屈膝缓冲，进入下一次。"],
  },
  // 下肢 · 弓步
  {
    id: "ex-dumbbell-lunge", name: "哑铃前弓步", pattern: "lunge", level: "beginner", target: "臀肌、股四头肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...knee], unit: "reps", source: ds("0336"), sourceVersion: DATASET,
    cues: ["上身保持直立", "前膝不要内扣"],
    steps: ["双脚与肩同宽站立，双手各握一只哑铃自然下垂。", "右脚向前迈一大步，屈膝下沉成弓步。", "下沉时背部挺直、胸口打开。", "右脚跟发力收回，换左腿重复。"],
  },
  {
    id: "ex-reverse-lunge", name: "哑铃后撤步", pattern: "lunge", level: "beginner", target: "臀肌、股四头肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...knee], unit: "reps", source: ds("0381"), sourceVersion: DATASET,
    cues: ["比前弓步对膝盖更友好", "后膝轻轻接近地面即可"],
    steps: ["双脚与肩同宽站立，双手各握一只哑铃。", "右脚向后撤一步，屈膝下沉，直到前侧大腿接近与地面平行。", "稍停，前脚跟发力回到起始姿势。", "换左脚向后撤步重复。"],
  },
  {
    id: "ex-walking-lunge", name: "行进弓步", pattern: "lunge", level: "beginner", target: "臀肌、股四头肌", equipment: "自重", equipmentTags: [],
    contraindications: [...knee], unit: "reps", source: ds("1460"), sourceVersion: DATASET,
    cues: ["步子稳比步子大重要", "前膝与脚踝对齐"],
    steps: ["双脚与肩同宽站立。", "右腿向前迈一步，下沉成弓步。", "躯干保持直立，前膝在脚踝正上方。", "右脚蹬地，左脚向前迈出成下一个弓步，交替向前走。"],
  },
  {
    id: "ex-split-squat", name: "分腿蹲", pattern: "lunge", level: "beginner", target: "股四头肌、臀肌", equipment: "自重", equipmentTags: [],
    contraindications: [...knee], unit: "reps", source: ds("2368"), sourceVersion: DATASET,
    cues: ["双脚前后站开，像站在两条铁轨上", "身体垂直上下，不要前冲"],
    steps: ["一只脚在前、一只脚在后站开，前后相距约两脚掌到三脚掌。", "屈膝屈髋，身体垂直下沉，背部保持挺直。", "下沉到前侧大腿接近与地面平行，后膝悬在地面上方。", "前脚跟发力站起，做完一侧再换腿。"],
  },
  {
    id: "ex-step-up", name: "哑铃登台阶", pattern: "lunge", level: "beginner", target: "臀肌、股四头肌", equipment: "哑铃 + 台阶", equipmentTags: ["dumbbell"],
    contraindications: [...knee, ...ankle], unit: "reps", source: ds("0431"), sourceVersion: DATASET,
    cues: ["整只脚踩上台阶", "台阶越低越好控制"],
    steps: ["站在稳固的台阶或矮凳前，双手各握一只哑铃。", "右脚整只踩上台阶。", "右脚跟发力把身体带上台阶，右腿伸直，左脚跟上站稳。", "左脚先下、右脚再下，回到地面，做完一侧再换腿。"],
  },
  // 下肢 · 髋铰链
  {
    id: "ex-romanian-deadlift", name: "哑铃罗马尼亚硬拉", pattern: "hinge", level: "beginner", target: "臀肌、腘绳肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...back], unit: "reps", source: ds("1459"), sourceVersion: DATASET,
    cues: ["背始终是平的", "感觉大腿后侧被拉长"],
    steps: ["双脚与肩同宽站立，双手各握一只哑铃放在大腿前。", "膝盖微屈、背部挺直，以髋为轴把臀部向后推，哑铃沿腿向下滑。", "感到大腿后侧有明显拉伸时停住。", "臀部发力向前推，站直回到起始姿势。"],
  },
  {
    id: "ex-dumbbell-deadlift", name: "哑铃硬拉", pattern: "hinge", level: "beginner", target: "臀肌、腘绳肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...back], unit: "reps", source: ds("0300"), sourceVersion: DATASET,
    cues: ["哑铃贴着腿走", "起身靠腿和臀发力，不靠腰"],
    steps: ["双脚与肩同宽站立，脚尖朝前，双手各握一只哑铃。", "屈髋屈膝，保持背部挺直，把哑铃放向地面。", "脚跟踩稳，伸髋伸膝把哑铃拉回站立位。"],
  },
  {
    id: "ex-kettlebell-swing", name: "壶铃摆荡", pattern: "hinge", level: "intermediate", target: "臀肌、腘绳肌", equipment: "壶铃", equipmentTags: ["kettlebell"],
    contraindications: [...back, ...shoulder], unit: "reps", source: ds("0549"), sourceVersion: DATASET,
    cues: ["手臂只是绳子，力量来自髋部", "壶铃摆到胸口高度就够"],
    steps: ["双脚略宽于肩站立，双手握住壶铃放在身前。", "膝盖微屈、以髋为轴，把壶铃从两腿之间向后摆。", "臀部快速向前顶，借力把壶铃摆到胸口高度。", "让壶铃自然落回两腿之间，顺势进入下一次。"],
  },
  // 下肢 · 臀桥
  {
    id: "ex-glute-bridge", name: "臀桥", pattern: "bridge", level: "beginner", target: "臀肌", equipment: "自重", equipmentTags: [],
    contraindications: ["acute_back_pain"], unit: "reps", source: ds("3013"), sourceVersion: DATASET,
    cues: ["顶端停留两秒", "不要过度挺腰"],
    steps: ["平躺，屈膝，双脚平放在地面，双臂放在身体两侧。", "收紧臀部和核心，把臀部抬离地面，直到膝盖到肩膀成一条直线。", "在顶端停一下，用力夹紧臀部。", "慢慢把臀部放回地面。"],
  },
  {
    id: "ex-glute-bridge-march", name: "臀桥交替抬腿", pattern: "bridge", level: "intermediate", target: "臀肌、核心", equipment: "自重", equipmentTags: [],
    contraindications: [...back], unit: "reps", source: ds("3561"), sourceVersion: DATASET,
    cues: ["抬腿时骨盆保持水平", "动作慢一点更有效"],
    steps: ["平躺屈膝，双脚平放，先做出臀桥。", "保持臀部抬起，把一只脚抬离地面、膝盖靠近胸口。", "放下这只脚，换另一条腿抬起。", "全程保持桥的姿势，左右交替。"],
  },
  // 上肢 · 拉
  {
    id: "ex-dumbbell-row", name: "单臂哑铃划船", pattern: "row", level: "beginner", target: "上背部", equipment: "哑铃 + 凳子", equipmentTags: ["dumbbell"],
    contraindications: ["acute_back_pain"], unit: "reps", source: ds("0292"), sourceVersion: DATASET,
    cues: ["背部保持平直", "想着把手肘往后带"],
    steps: ["一侧手和膝撑在凳子上，另一只手握哑铃自然下垂。", "背部挺直、核心收紧。", "把哑铃拉向腰侧，手肘贴近身体，肩胛骨向后收。", "在顶端稍停，慢慢放回，做完一侧再换边。"],
  },
  {
    id: "ex-bent-over-row", name: "俯身哑铃划船", pattern: "row", level: "beginner", target: "上背部", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...back], unit: "reps", source: ds("0293"), sourceVersion: DATASET,
    cues: ["俯身时背是平的", "拉起时两侧肩胛骨靠拢"],
    steps: ["双脚与肩同宽站立，膝盖微屈，双手各握一只哑铃。", "以髋为轴俯身，背部挺直，手臂自然下垂。", "把哑铃拉向腰侧，肩胛骨向中间收。", "稍停，慢慢放回起始位置。"],
  },
  {
    id: "ex-band-seated-row", name: "弹力带坐姿划船", pattern: "row", level: "beginner", target: "上背部", equipment: "弹力带", equipmentTags: ["band"],
    contraindications: ["acute_back_pain"], unit: "reps", source: ds("3144"), sourceVersion: DATASET,
    cues: ["坐直，别往后倒", "拉到胸口下方即可"],
    steps: ["坐在地上双腿伸直，把弹力带绕过脚掌。", "双手握住弹力带两端，掌心相对。", "背部挺直、核心收紧，把弹力带拉向身体，肩胛骨向后收。", "稍停后慢慢放松回到起始位置。"],
  },
  {
    id: "ex-reverse-fly", name: "俯身哑铃飞鸟", pattern: "row", level: "beginner", target: "三角肌后束、上背部", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...back, ...shoulder], unit: "reps", source: ds("0383"), sourceVersion: DATASET,
    cues: ["选轻一点的哑铃", "手肘保持微屈"],
    steps: ["双脚与肩同宽站立，膝盖微屈，双手各握一只轻哑铃。", "以髋为轴俯身，背部挺直，手臂垂在胸前。", "手肘微屈，把双臂向两侧抬起到与地面平行。", "稍停，慢慢放回。"],
  },
  // 上肢 · 推
  {
    id: "ex-push-up", name: "俯卧撑", pattern: "pushup", level: "intermediate", target: "胸肌、肱三头肌", equipment: "自重", equipmentTags: [],
    contraindications: [...wrist, ...shoulder], unit: "reps", source: ds("0662"), sourceVersion: DATASET,
    cues: ["头到脚跟一条直线", "做不到标准就换跪姿或上斜"],
    steps: ["双手略宽于肩撑地，双脚并拢，身体成一条直线。", "收紧核心，屈肘让胸口向地面靠近。", "胸口接近地面时稍停。", "推地伸直手臂，回到起始姿势。"],
  },
  {
    id: "ex-incline-push-up", name: "上斜俯卧撑", pattern: "pushup", level: "beginner", target: "胸肌、肱三头肌", equipment: "自重 + 桌面或台阶", equipmentTags: [],
    contraindications: [...wrist, ...shoulder], unit: "reps", source: ds("0493"), sourceVersion: DATASET,
    cues: ["撑的位置越高越轻松", "腰不要塌下去"],
    steps: ["双手略宽于肩，撑在稳固的桌沿、床沿或台阶上。", "双腿向后伸直，身体从头到脚跟成一条直线。", "屈肘让胸口靠近支撑面。", "推起回到起始姿势。"],
  },
  {
    id: "ex-kneeling-push-up", name: "跪姿俯卧撑", pattern: "pushup", level: "beginner", target: "胸肌、肱三头肌", equipment: "自重", equipmentTags: [],
    contraindications: [...wrist, ...shoulder, ...knee], unit: "reps", source: ds("3211"), sourceVersion: DATASET,
    cues: ["膝下垫个软垫", "从膝盖到头保持一条线"],
    steps: ["双膝跪地，双手与肩同宽撑地。", "身体从膝盖到头成一条直线，核心收紧。", "屈肘让胸口靠近地面，手肘不要向外张得太开。", "推地回到起始姿势。"],
  },
  {
    id: "ex-dumbbell-bench-press", name: "哑铃卧推", pattern: "bench", level: "beginner", target: "胸肌", equipment: "哑铃 + 平凳", equipmentTags: ["dumbbell", "bench"],
    contraindications: [...shoulder], unit: "reps", source: ds("0289"), sourceVersion: DATASET,
    cues: ["肩膀往下沉，别耸肩", "推起时呼气"],
    steps: ["仰卧在平凳上，双脚踩地，背部贴紧凳面。", "双手各握一只哑铃，手臂伸直举在胸口上方。", "慢慢屈肘，把哑铃放到胸口两侧。", "稍停，把哑铃推回起始位置。"],
  },
  {
    id: "ex-floor-press", name: "哑铃地板卧推", pattern: "bench", level: "beginner", target: "胸肌、肱三头肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...shoulder], unit: "reps", source: authored, sourceVersion: AUTHORED,
    cues: ["没有凳子时的卧推", "上臂轻触地面就推起"],
    steps: ["仰卧在垫子上，屈膝踩地，双手各握一只哑铃举在胸口上方。", "慢慢屈肘下放，直到上臂轻轻碰到地面。", "稍停，把哑铃推回起始位置。"],
  },
  {
    id: "ex-dumbbell-fly", name: "哑铃飞鸟", pattern: "bench", level: "intermediate", target: "胸肌", equipment: "哑铃 + 平凳", equipmentTags: ["dumbbell", "bench"],
    contraindications: [...shoulder], unit: "reps", source: ds("0308"), sourceVersion: DATASET,
    cues: ["像抱一棵大树", "感到胸口拉伸就停"],
    steps: ["仰卧在平凳上，双手各握一只哑铃举在胸口上方，掌心相对。", "手肘保持微屈，双臂沿弧线向两侧打开。", "胸口有拉伸感时停住。", "沿原路把哑铃合拢回胸口上方。"],
  },
  {
    id: "ex-shoulder-press", name: "坐姿哑铃推举", pattern: "overhead", level: "beginner", target: "三角肌", equipment: "哑铃 + 椅子", equipmentTags: ["dumbbell"],
    contraindications: [...shoulder], unit: "reps", source: ds("0405"), sourceVersion: DATASET,
    cues: ["推起时腰不要后仰", "肩膀有卡顿感就降低重量"],
    steps: ["坐在有靠背的椅子上，双手各握一只哑铃举到肩膀高度，掌心向前。", "把哑铃向上推，直到手臂接近伸直。", "在顶端稍停。", "慢慢把哑铃放回肩膀高度。"],
  },
  {
    id: "ex-arnold-press", name: "阿诺德推举", pattern: "overhead", level: "intermediate", target: "三角肌", equipment: "哑铃 + 椅子", equipmentTags: ["dumbbell"],
    contraindications: [...shoulder], unit: "reps", source: ds("2137"), sourceVersion: DATASET,
    cues: ["边推边转手腕", "动作慢一点"],
    steps: ["坐在有靠背的椅子上，双手握哑铃放在肩前，掌心朝向自己。", "向上推的同时转动手腕，到顶端时掌心朝前。", "在顶端稍停。", "反向转回，慢慢放回肩前。"],
  },
  {
    id: "ex-lateral-raise", name: "哑铃侧平举", pattern: "raise", level: "beginner", target: "三角肌中束", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...shoulder], unit: "reps", source: ds("0334"), sourceVersion: DATASET,
    cues: ["抬到与肩同高就够", "不要耸肩借力"],
    steps: ["双脚与肩同宽站立，双手各握一只哑铃放在身体两侧。", "背部挺直、核心收紧。", "手肘微屈，把双臂向两侧抬起到与肩同高。", "稍停，慢慢放下。"],
  },
  {
    id: "ex-front-raise", name: "哑铃前平举", pattern: "raise", level: "beginner", target: "三角肌前束", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...shoulder], unit: "reps", source: ds("0310"), sourceVersion: DATASET,
    cues: ["身体不要前后晃", "抬起时呼气"],
    steps: ["双脚与肩同宽站立，双手各握一只哑铃放在大腿前。", "手臂伸直，把哑铃向前抬到与肩同高。", "稍停，吸气时慢慢放下。"],
  },
  // 手臂
  {
    id: "ex-biceps-curl", name: "哑铃弯举", pattern: "curl", level: "beginner", target: "肱二头肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...wrist], unit: "reps", source: ds("0294"), sourceVersion: DATASET,
    cues: ["大臂贴住身体不动", "放下时也要慢"],
    steps: ["站直，双手各握一只哑铃，掌心向前，手臂自然伸直。", "大臂保持不动，呼气时屈肘把哑铃弯举到肩前。", "在顶端稍停，感受手臂前侧收紧。", "吸气时慢慢放回。"],
  },
  {
    id: "ex-hammer-curl", name: "锤式弯举", pattern: "curl", level: "beginner", target: "肱二头肌、前臂", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...wrist], unit: "reps", source: ds("0313"), sourceVersion: DATASET,
    cues: ["掌心始终相对，像握锤子", "手肘贴近身体"],
    steps: ["站直，双手各握一只哑铃，掌心朝向身体。", "大臂不动，屈肘把哑铃弯举到肩前。", "稍停后慢慢放回。"],
  },
  {
    id: "ex-triceps-kickback", name: "哑铃臂屈伸后踢", pattern: "row", level: "beginner", target: "肱三头肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...back], unit: "reps", source: ds("0333"), sourceVersion: DATASET,
    cues: ["大臂贴紧身体", "伸直时手臂后侧收紧"],
    steps: ["双脚与肩同宽站立，膝盖微屈，俯身，背部挺直，双手各握一只哑铃。", "大臂贴紧身体两侧，手肘弯成直角。", "把小臂向后伸直，感受手臂后侧收紧。", "稍停，慢慢收回。"],
  },
  {
    id: "ex-overhead-triceps", name: "哑铃颈后臂屈伸", pattern: "overhead", level: "beginner", target: "肱三头肌", equipment: "哑铃", equipmentTags: ["dumbbell"],
    contraindications: [...shoulder], unit: "reps", source: ds("0430"), sourceVersion: DATASET,
    cues: ["大臂靠近耳朵不动", "选轻重量"],
    steps: ["站立，双手托住一只哑铃举过头顶。", "大臂保持不动，屈肘把哑铃放到脑后。", "伸直手臂，把哑铃举回头顶。"],
  },
  {
    id: "ex-bench-dip", name: "椅子撑体", pattern: "dip", level: "beginner", target: "肱三头肌", equipment: "稳固的椅子", equipmentTags: [],
    contraindications: [...shoulder, ...wrist], unit: "reps", source: ds("0129"), sourceVersion: DATASET,
    cues: ["背贴近椅子边", "下去一点点就有效果"],
    steps: ["坐在稳固椅子的边缘，双手抓住臀部两侧的椅沿。", "臀部移出椅面，屈膝，双脚踩地。", "屈肘让身体慢慢下降，背部贴近椅子。", "稍停，推起回到起始位置。"],
  },
  // 核心
  {
    id: "ex-crunch", name: "卷腹", pattern: "crunch", level: "beginner", target: "腹直肌", equipment: "自重", equipmentTags: [],
    contraindications: ["acute_back_pain"], unit: "reps", source: ds("0274"), sourceVersion: DATASET,
    cues: ["肩膀离地就够，不用坐起来", "手不要拽脖子"],
    steps: ["平躺，屈膝，双脚平放在地面。", "双手轻放在耳侧，手肘朝外。", "收紧腹部，把肩膀卷离地面。", "稍停，慢慢放回。"],
  },
  {
    id: "ex-reverse-crunch", name: "反向卷腹", pattern: "crunch", level: "beginner", target: "下腹部", equipment: "自重", equipmentTags: [],
    contraindications: [...back], unit: "reps", source: ds("0872"), sourceVersion: DATASET,
    cues: ["靠腹部卷起臀部，别甩腿", "下放慢一点"],
    steps: ["平躺，双臂放在身体两侧。", "屈膝抬腿，让大腿垂直于地面。", "收紧腹部，把臀部微微卷离地面，膝盖靠近胸口。", "稍停，慢慢放回。"],
  },
  {
    id: "ex-cross-crunch", name: "交叉卷腹", pattern: "crunch", level: "beginner", target: "腹斜肌", equipment: "自重", equipmentTags: [],
    contraindications: [...back], unit: "reps", source: ds("0262"), sourceVersion: DATASET,
    cues: ["转的是上身，不是脖子", "左右各算一次"],
    steps: ["平躺，屈膝，双脚平放，双手轻放在耳侧。", "收紧腹部抬起上身，同时扭转，让右肘靠近左膝。", "稍停，慢慢放回。", "换左肘靠近右膝重复。"],
  },
  {
    id: "ex-russian-twist", name: "俄罗斯转体", pattern: "crunch", level: "intermediate", target: "腹斜肌", equipment: "自重", equipmentTags: [],
    contraindications: [...back], unit: "reps", source: ds("0687"), sourceVersion: DATASET,
    cues: ["背挺直，不要弓着", "脚放地上会简单很多"],
    steps: ["坐在地上，屈膝，双脚踩地。", "上身微微后倾，背部挺直，核心收紧，双手在胸前合拢。", "把上身转向右侧，再转向左侧。", "有余力时可以把双脚抬离地面。"],
  },
  {
    id: "ex-dead-bug", name: "死虫式", pattern: "deadbug", level: "beginner", target: "核心", equipment: "自重", equipmentTags: [],
    contraindications: ["acute_back_pain"], unit: "reps", source: ds("0276"), sourceVersion: DATASET,
    cues: ["腰始终贴住地面", "对腰最友好的核心动作之一"],
    steps: ["仰卧，双臂伸向天花板。", "抬起双腿，髋和膝都弯成直角。", "腰部压向地面，慢慢把右臂和左腿同时向远处放低，悬在地面上方。", "收回，换左臂和右腿，左右交替。"],
  },
  {
    id: "ex-flutter-kicks", name: "仰卧交替踢腿", pattern: "deadbug", level: "intermediate", target: "下腹部", equipment: "自重", equipmentTags: [],
    contraindications: [...back], unit: "seconds", source: ds("0459"), sourceVersion: DATASET,
    cues: ["腰离地就把腿抬高一点", "小幅度快速交替"],
    steps: ["平躺，双腿伸直，双手放在身体两侧或臀下。", "收紧核心，把双腿抬离地面十几厘米。", "双腿伸直，上下小幅度交替踢动。"],
  },
  {
    id: "ex-plank", name: "平板支撑", pattern: "plank", level: "beginner", target: "核心", equipment: "自重", equipmentTags: [],
    contraindications: [...shoulder, ...wrist, "acute_back_pain"], unit: "seconds", source: authored, sourceVersion: AUTHORED,
    cues: ["屁股不高不低", "正常呼吸，别憋气"],
    steps: ["前臂撑地，手肘在肩膀正下方。", "双腿向后伸直，脚尖撑地，身体从头到脚跟成一条直线。", "收紧腹部和臀部，保持姿势并正常呼吸。", "坚持不住时先跪下休息。"],
  },
  {
    id: "ex-plank-shoulder-tap", name: "平板支撑拍肩", pattern: "plank", level: "intermediate", target: "核心、肩部", equipment: "自重", equipmentTags: [],
    contraindications: [...shoulder, ...wrist], unit: "reps", source: ds("3239"), sourceVersion: DATASET,
    cues: ["拍肩时髋部不要晃", "双脚分开一点更稳"],
    steps: ["双手撑地与肩同宽，双腿向后伸直成高位平板支撑。", "收紧核心，保持髋部稳定。", "抬起一只手去拍对侧肩膀。", "放回地面，换另一只手，左右交替。"],
  },
  {
    id: "ex-bird-dog", name: "鸟狗式", pattern: "plank", level: "beginner", target: "核心、臀肌", equipment: "自重", equipmentTags: [],
    contraindications: [...wrist, ...knee], unit: "reps", source: authored, sourceVersion: AUTHORED,
    cues: ["背上像放了一杯水", "伸出去的手脚尽量拉远"],
    steps: ["四点跪姿，双手在肩膀正下方，膝盖在髋部正下方。", "收紧核心，同时把右臂向前、左腿向后伸直，与地面平行。", "稍停两秒，慢慢收回。", "换左臂和右腿，左右交替。"],
  },
  // 有氧
  {
    id: "ex-mountain-climber", name: "登山跑", pattern: "climber", level: "intermediate", target: "核心、心肺", equipment: "自重", equipmentTags: [],
    contraindications: [...wrist, ...shoulder, ...knee], unit: "seconds", source: ds("0630"), sourceVersion: DATASET,
    cues: ["臀部压低", "节奏慢一点也可以"],
    steps: ["双手撑地在肩膀正下方，成高位平板支撑。", "收紧核心，把右膝拉向胸口，再快速换左膝。", "像原地跑步一样左右交替，保持呼吸均匀。"],
  },
  {
    id: "ex-jumping-jack", name: "开合跳", pattern: "jack", level: "beginner", target: "心肺", equipment: "自重", equipmentTags: [],
    contraindications: [...knee, ...ankle], unit: "seconds", source: ds("3224"), sourceVersion: DATASET,
    cues: ["前脚掌轻落地", "膝盖不适就改成开合步，不跳"],
    steps: ["双脚并拢站立，双臂放在身体两侧。", "跳起时双脚分开，双臂举过头顶。", "落地后再跳回并脚、手臂放下。"],
  },
  {
    id: "ex-high-knees-wall", name: "扶墙高抬腿", pattern: "jack", level: "beginner", target: "心肺、下肢", equipment: "墙面", equipmentTags: [],
    contraindications: [...knee, ...ankle], unit: "seconds", source: ds("3636"), sourceVersion: DATASET,
    cues: ["上身保持稳定", "扶墙可以更放心地抬高"],
    steps: ["面向墙站立，双手扶墙。", "收紧核心，右膝抬向胸口。", "快速换腿抬起左膝，左右交替，像原地跑步。"],
  },
  {
    id: "ex-walk", name: "快走", pattern: "walk", level: "beginner", target: "全身", equipment: "无需器械", equipmentTags: [],
    contraindications: ["acute_ankle_pain"], unit: "minutes", source: authored, sourceVersion: AUTHORED,
    cues: ["保持可以对话的强度"],
    steps: ["选择平整、安全的路线，保持可以对话的速度。", "步幅自然，肩颈放松，按教练安排完成时长。"],
  },
  // 小腿与拉伸
  {
    id: "ex-calf-raise", name: "提踵", pattern: "calf", level: "beginner", target: "小腿", equipment: "墙面", equipmentTags: [],
    contraindications: [...ankle], unit: "reps", source: ds("1373"), sourceVersion: DATASET,
    cues: ["顶端停一下", "扶墙保持平衡"],
    steps: ["双脚与肩同宽站立，手扶墙面保持平衡。", "慢慢踮起脚跟，重心移到前脚掌。", "在最高点稍停。", "慢慢放下脚跟。"],
  },
  {
    id: "ex-worlds-greatest-stretch", name: "世界最伟大拉伸", pattern: "stretch", level: "beginner", target: "髋部、腘绳肌、胸椎", equipment: "自重", equipmentTags: [],
    contraindications: ["acute_knee_pain", "acute_back_pain"], unit: "reps", source: ds("1604"), sourceVersion: DATASET,
    cues: ["练前热身或练后放松都合适", "转体时跟着手看"],
    steps: ["右脚在前成弓步，双手撑在右脚内侧的地面上。", "左膝可以轻轻放在地面上。", "上身向右转，右臂伸向天花板，保持几秒。", "收回，换左脚在前重复。"],
  },
  {
    id: "ex-hamstring-stretch", name: "站姿腿后侧拉伸", pattern: "stretch", level: "beginner", target: "腘绳肌", equipment: "自重", equipmentTags: [],
    contraindications: ["acute_back_pain"], unit: "seconds", source: ds("1511"), sourceVersion: DATASET,
    cues: ["有拉伸感就停，不要弹震", "每侧 20–30 秒"],
    steps: ["双脚与肩同宽站立。", "右脚向前迈一小步，脚跟着地、脚尖翘起。", "背部挺直，以髋为轴慢慢前倾，双手伸向右脚方向。", "保持 20–30 秒，换另一侧。"],
  },
  {
    id: "ex-cat-cow", name: "猫牛式", pattern: "stretch", level: "beginner", target: "脊柱", equipment: "自重", equipmentTags: [],
    contraindications: [...wrist], unit: "reps", source: authored, sourceVersion: AUTHORED,
    cues: ["跟着呼吸慢慢做", "只在舒服的范围内活动"],
    steps: ["四点跪姿，双手在肩膀正下方，膝盖在髋部正下方。", "吸气时塌腰、抬头、胸口向前送。", "呼气时拱背、低头，把背推向天花板。", "跟着呼吸来回交替。"],
  },
];

export const exerciseCatalogById = new Map(exerciseCatalog.map((entry) => [entry.id, entry]));
