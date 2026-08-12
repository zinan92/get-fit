export type ExerciseCatalogEntry = {
  id: string;
  name: string;
  contraindications: string[];
  cues: string[];
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
  { id: "ex-goblet-squat", name: "高脚杯深蹲", contraindications: ["acute_knee_pain"], cues: ["膝盖与脚尖同向", "保持躯干稳定"], sourceVersion: "demo-2026-08" },
  { id: "ex-dumbbell-row", name: "单臂哑铃划船", contraindications: ["acute_back_pain"], cues: ["背部保持平直", "肩胛骨向后下方"], sourceVersion: "demo-2026-08" },
  { id: "ex-glute-bridge", name: "臀桥", contraindications: ["acute_back_pain"], cues: ["顶端停留两秒", "不要过度挺腰"], sourceVersion: "demo-2026-08" },
  { id: "ex-walk", name: "快走", contraindications: ["acute_ankle_pain"], cues: ["保持可以对话的强度"], sourceVersion: "demo-2026-08" },
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
