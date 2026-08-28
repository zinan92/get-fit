export type ExerciseCatalogEntry = {
  id: string;
  name: string;
  target: string;
  equipment: string;
  contraindications: string[];
  cues: string[];
  steps: string[];
  mediaPath?: string;
  mediaAttribution?: string;
  sourceVersion: string;
};

export type FoodCatalogEntry = {
  id: string;
  name: string;
  kcalPer100g: number;
  unit: "g" | "ml" | "item";
  sourceVersion: string;
  allergens: string[];
};

export const exerciseCatalog: ExerciseCatalogEntry[] = [
  {
    id: "ex-goblet-squat",
    name: "高脚杯深蹲",
    target: "股四头肌",
    equipment: "哑铃",
    contraindications: ["acute_knee_pain"],
    cues: ["膝盖与脚尖同向", "保持躯干稳定"],
    steps: ["双脚分开与肩同宽站立，双手握住哑铃垂直放在胸前。", "保持胸部挺直，核心收紧，通过向后推臀部并弯曲膝盖，将身体降低至蹲姿。", "继续降低到舒适范围，在底部停顿片刻。", "推动脚后跟回到起始位置，重复所需次数。"],
    mediaPath: "/assets/exercises/dumbbell-goblet-squat.gif",
    mediaAttribution: "© Gym visual",
    sourceVersion: "demo-2026-08",
  },
  {
    id: "ex-dumbbell-row",
    name: "单臂哑铃划船",
    target: "上背部",
    equipment: "哑铃 + 上斜凳",
    contraindications: ["acute_back_pain"],
    cues: ["背部保持平直", "肩胛骨向后下方"],
    steps: ["设置一个 45 度角的上斜凳，面对长凳站立。", "将左膝和左手放在长凳上，用右手拿起哑铃。", "保持背部挺直，核心参与，将哑铃拉向胸部并让肘部靠近身体。", "顶端挤压背部，再以受控的方式放下，换边重复。"],
    mediaPath: "/assets/exercises/single-arm-dumbbell-row.gif",
    mediaAttribution: "© Gym visual",
    sourceVersion: "demo-2026-08",
  },
  {
    id: "ex-glute-bridge",
    name: "臀桥",
    target: "臀肌",
    equipment: "自重",
    contraindications: ["acute_back_pain"],
    cues: ["顶端停留两秒", "不要过度挺腰"],
    steps: ["平躺，膝盖弯曲，双脚平放在地上，双臂放在身体两侧。", "启动臀肌和核心，将臀部抬起直到身体从膝盖到肩膀成一直线。", "在顶部暂停片刻，挤压臀部。", "慢慢放下臀部，重复所需次数。"],
    mediaPath: "/assets/exercises/low-glute-bridge.gif",
    mediaAttribution: "© Gym visual",
    sourceVersion: "demo-2026-08",
  },
  {
    id: "ex-walk",
    name: "快走",
    target: "全身",
    equipment: "无需器械",
    contraindications: ["acute_ankle_pain"],
    cues: ["保持可以对话的强度"],
    steps: ["选择平整、安全的路线，保持可以对话的速度。", "步幅自然，肩颈放松，按教练安排完成时长。"],
    sourceVersion: "demo-2026-08",
  },
];

export const foodCatalog: FoodCatalogEntry[] = [
  { id: "food-egg", name: "水煮蛋", kcalPer100g: 143, unit: "g", sourceVersion: "demo-2026-08", allergens: ["egg"] },
  { id: "food-yogurt", name: "原味酸奶", kcalPer100g: 63, unit: "g", sourceVersion: "demo-2026-08", allergens: ["milk"] },
  { id: "food-toast", name: "全麦吐司", kcalPer100g: 247, unit: "g", sourceVersion: "demo-2026-08", allergens: ["wheat"] },
  { id: "food-chicken", name: "鸡胸肉", kcalPer100g: 165, unit: "g", sourceVersion: "demo-2026-08", allergens: [] },
  { id: "food-rice", name: "糙米饭", kcalPer100g: 116, unit: "g", sourceVersion: "demo-2026-08", allergens: [] },
  { id: "food-broccoli", name: "西兰花", kcalPer100g: 34, unit: "g", sourceVersion: "demo-2026-08", allergens: [] },
  { id: "food-banana", name: "香蕉", kcalPer100g: 89, unit: "g", sourceVersion: "demo-2026-08", allergens: [] },
  { id: "food-salmon", name: "三文鱼", kcalPer100g: 208, unit: "g", sourceVersion: "demo-2026-08", allergens: ["fish"] },
  { id: "food-sweet-potato", name: "红薯", kcalPer100g: 86, unit: "g", sourceVersion: "demo-2026-08", allergens: [] },
  { id: "food-spinach", name: "菠菜", kcalPer100g: 23, unit: "g", sourceVersion: "demo-2026-08", allergens: [] },
  { id: "food-milk", name: "低脂牛奶", kcalPer100g: 42, unit: "ml", sourceVersion: "demo-2026-08", allergens: ["milk"] },
  { id: "food-almond", name: "巴旦木", kcalPer100g: 579, unit: "g", sourceVersion: "demo-2026-08", allergens: ["tree_nut"] },
];

export const exerciseCatalogById = new Map(exerciseCatalog.map((entry) => [entry.id, entry]));
export const foodCatalogById = new Map(foodCatalog.map((entry) => [entry.id, entry]));
