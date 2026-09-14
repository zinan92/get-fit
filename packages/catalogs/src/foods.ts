/**
 * 轻练食物库。每 100 克（饮品按每 100 毫升近似）的能量都有可回查来源：
 * - usda-sr-legacy：USDA FoodData Central，SR Legacy（2018-04，美国政府公开数据），按 fdcId 回查；
 * - cn-fct：中国疾病预防控制中心营养与健康所《中国食物成分表》（食物营养成分查询平台），
 *   只用于 USDA 没有的中国主食，kcal 由原表 kJ ÷ 4.184 取整。
 * 份量写的是可食部重量；热量由服务端按克数重算，模型不能自己给热量。
 */

export type Allergen = "egg" | "milk" | "wheat" | "fish" | "shellfish" | "soy" | "peanut" | "tree_nut";
export type FoodCategory = "staple" | "protein" | "dairy" | "vegetable" | "fruit" | "fat";

export type FoodCatalogEntry = {
  id: string;
  name: string;
  category: FoodCategory;
  kcalPer100g: number;
  unit: "g" | "ml" | "item";
  allergens: Allergen[];
  source:
    | { kind: "usda-sr-legacy"; fdcId: number; description: string }
    | { kind: "cn-fct"; entry: string; energyKj: number; url: string };
  sourceVersion: string;
};

const SOURCE_VERSION = "foods-2026-09";

export const foodCatalog: FoodCatalogEntry[] = [
  { id: "food-rice", name: "糙米饭", category: "staple", kcalPer100g: 123, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169704, description: "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)" }, sourceVersion: SOURCE_VERSION },
  { id: "food-white-rice", name: "白米饭", category: "staple", kcalPer100g: 130, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168878, description: "Rice, white, long-grain, regular, enriched, cooked" }, sourceVersion: SOURCE_VERSION },
  { id: "food-mantou", name: "馒头", category: "staple", kcalPer100g: 226, unit: "g", allergens: ["wheat"], source: { kind: "cn-fct", entry: "馒头(均值)", energyKj: 947, url: "https://nlc.chinanutri.cn/fq/foodinfo/272.html" }, sourceVersion: SOURCE_VERSION },
  { id: "food-millet-porridge", name: "小米粥", category: "staple", kcalPer100g: 46, unit: "g", allergens: [], source: { kind: "cn-fct", entry: "小米粥", energyKj: 193, url: "https://nlc.chinanutri.cn/fq/foodinfo/303.html" }, sourceVersion: SOURCE_VERSION },
  { id: "food-oats", name: "燕麦片（干）", category: "staple", kcalPer100g: 379, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 173904, description: "Cereals, oats, regular and quick, not fortified, dry" }, sourceVersion: SOURCE_VERSION },
  { id: "food-toast", name: "全麦吐司", category: "staple", kcalPer100g: 252, unit: "g", allergens: ["wheat"], source: { kind: "usda-sr-legacy", fdcId: 172688, description: "Bread, whole-wheat, commercially prepared" }, sourceVersion: SOURCE_VERSION },
  { id: "food-whole-wheat-pasta", name: "全麦意面（煮）", category: "staple", kcalPer100g: 149, unit: "g", allergens: ["wheat"], source: { kind: "usda-sr-legacy", fdcId: 168910, description: "Pasta, whole-wheat, cooked (Includes foods for USDA's Food Distribution Program)" }, sourceVersion: SOURCE_VERSION },
  { id: "food-soba", name: "荞麦面（煮）", category: "staple", kcalPer100g: 99, unit: "g", allergens: ["wheat"], source: { kind: "usda-sr-legacy", fdcId: 168907, description: "Noodles, japanese, soba, cooked" }, sourceVersion: SOURCE_VERSION },
  { id: "food-quinoa", name: "藜麦（煮）", category: "staple", kcalPer100g: 120, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168917, description: "Quinoa, cooked" }, sourceVersion: SOURCE_VERSION },
  { id: "food-sweet-potato", name: "红薯（蒸煮）", category: "staple", kcalPer100g: 76, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168484, description: "Sweet potato, cooked, boiled, without skin" }, sourceVersion: SOURCE_VERSION },
  { id: "food-potato", name: "土豆（蒸煮）", category: "staple", kcalPer100g: 86, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 170440, description: "Potatoes, boiled, cooked without skin, flesh, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-corn", name: "玉米（煮）", category: "staple", kcalPer100g: 96, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169999, description: "Corn, sweet, yellow, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-pumpkin", name: "南瓜（蒸煮）", category: "staple", kcalPer100g: 20, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168449, description: "Pumpkin, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-egg", name: "水煮蛋", category: "protein", kcalPer100g: 155, unit: "g", allergens: ["egg"], source: { kind: "usda-sr-legacy", fdcId: 173424, description: "Egg, whole, cooked, hard-boiled" }, sourceVersion: SOURCE_VERSION },
  { id: "food-egg-white", name: "鸡蛋白", category: "protein", kcalPer100g: 52, unit: "g", allergens: ["egg"], source: { kind: "usda-sr-legacy", fdcId: 172183, description: "Egg, white, raw, fresh" }, sourceVersion: SOURCE_VERSION },
  { id: "food-chicken", name: "鸡胸肉", category: "protein", kcalPer100g: 165, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 171477, description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted" }, sourceVersion: SOURCE_VERSION },
  { id: "food-chicken-thigh", name: "去皮鸡腿肉", category: "protein", kcalPer100g: 179, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 172388, description: "Chicken, broilers or fryers, thigh, meat only, cooked, roasted" }, sourceVersion: SOURCE_VERSION },
  { id: "food-beef", name: "瘦牛肉", category: "protein", kcalPer100g: 157, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 170635, description: "Beef, round, eye of round roast, boneless, separable lean only, trimmed to 0\" fat, select, cooked, roasted" }, sourceVersion: SOURCE_VERSION },
  { id: "food-pork-tenderloin", name: "猪里脊", category: "protein", kcalPer100g: 143, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168250, description: "Pork, fresh, loin, tenderloin, separable lean only, cooked, roasted" }, sourceVersion: SOURCE_VERSION },
  { id: "food-salmon", name: "三文鱼", category: "protein", kcalPer100g: 206, unit: "g", allergens: ["fish"], source: { kind: "usda-sr-legacy", fdcId: 175168, description: "Fish, salmon, Atlantic, farmed, cooked, dry heat" }, sourceVersion: SOURCE_VERSION },
  { id: "food-cod", name: "鳕鱼", category: "protein", kcalPer100g: 105, unit: "g", allergens: ["fish"], source: { kind: "usda-sr-legacy", fdcId: 171956, description: "Fish, cod, Atlantic, cooked, dry heat" }, sourceVersion: SOURCE_VERSION },
  { id: "food-tuna", name: "水浸金枪鱼", category: "protein", kcalPer100g: 86, unit: "g", allergens: ["fish"], source: { kind: "usda-sr-legacy", fdcId: 173709, description: "Fish, tuna, light, canned in water, drained solids (Includes foods for USDA's Food Distribution Program)" }, sourceVersion: SOURCE_VERSION },
  { id: "food-shrimp", name: "虾仁（煮）", category: "protein", kcalPer100g: 99, unit: "g", allergens: ["shellfish"], source: { kind: "usda-sr-legacy", fdcId: 175180, description: "Crustaceans, shrimp, cooked" }, sourceVersion: SOURCE_VERSION },
  { id: "food-tofu", name: "老豆腐", category: "protein", kcalPer100g: 144, unit: "g", allergens: ["soy"], source: { kind: "usda-sr-legacy", fdcId: 172475, description: "Tofu, raw, firm, prepared with calcium sulfate" }, sourceVersion: SOURCE_VERSION },
  { id: "food-edamame", name: "毛豆", category: "protein", kcalPer100g: 121, unit: "g", allergens: ["soy"], source: { kind: "usda-sr-legacy", fdcId: 168411, description: "Edamame, frozen, prepared" }, sourceVersion: SOURCE_VERSION },
  { id: "food-soymilk", name: "无糖豆浆", category: "dairy", kcalPer100g: 54, unit: "ml", allergens: ["soy"], source: { kind: "usda-sr-legacy", fdcId: 172446, description: "Soymilk, original and vanilla, unfortified" }, sourceVersion: SOURCE_VERSION },
  { id: "food-milk", name: "低脂牛奶", category: "dairy", kcalPer100g: 42, unit: "ml", allergens: ["milk"], source: { kind: "usda-sr-legacy", fdcId: 170872, description: "Milk, lowfat, fluid, 1% milkfat, with added vitamin A and vitamin D" }, sourceVersion: SOURCE_VERSION },
  { id: "food-whole-milk", name: "全脂牛奶", category: "dairy", kcalPer100g: 61, unit: "ml", allergens: ["milk"], source: { kind: "usda-sr-legacy", fdcId: 171265, description: "Milk, whole, 3.25% milkfat, with added vitamin D" }, sourceVersion: SOURCE_VERSION },
  { id: "food-yogurt", name: "原味酸奶", category: "dairy", kcalPer100g: 61, unit: "g", allergens: ["milk"], source: { kind: "usda-sr-legacy", fdcId: 171284, description: "Yogurt, plain, whole milk" }, sourceVersion: SOURCE_VERSION },
  { id: "food-greek-yogurt", name: "无糖希腊酸奶", category: "dairy", kcalPer100g: 59, unit: "g", allergens: ["milk"], source: { kind: "usda-sr-legacy", fdcId: 170894, description: "Yogurt, Greek, plain, nonfat (Includes foods for USDA's Food Distribution Program)" }, sourceVersion: SOURCE_VERSION },
  { id: "food-broccoli", name: "西兰花", category: "vegetable", kcalPer100g: 35, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169967, description: "Broccoli, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-spinach", name: "菠菜", category: "vegetable", kcalPer100g: 23, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168463, description: "Spinach, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-bok-choy", name: "小白菜", category: "vegetable", kcalPer100g: 12, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 170391, description: "Cabbage, chinese (pak-choi), cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-napa-cabbage", name: "大白菜", category: "vegetable", kcalPer100g: 14, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169980, description: "Cabbage, chinese (pe-tsai), cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-lettuce", name: "生菜", category: "vegetable", kcalPer100g: 17, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169247, description: "Lettuce, cos or romaine, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-tomato", name: "番茄", category: "vegetable", kcalPer100g: 18, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 170457, description: "Tomatoes, red, ripe, raw, year round average" }, sourceVersion: SOURCE_VERSION },
  { id: "food-cucumber", name: "黄瓜", category: "vegetable", kcalPer100g: 15, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168409, description: "Cucumber, with peel, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-carrot", name: "胡萝卜", category: "vegetable", kcalPer100g: 35, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 170394, description: "Carrots, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-green-pepper", name: "青椒", category: "vegetable", kcalPer100g: 20, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 170427, description: "Peppers, sweet, green, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-mushroom", name: "蘑菇", category: "vegetable", kcalPer100g: 28, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169252, description: "Mushrooms, white, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-asparagus", name: "芦笋", category: "vegetable", kcalPer100g: 22, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168390, description: "Asparagus, cooked, boiled, drained" }, sourceVersion: SOURCE_VERSION },
  { id: "food-okra", name: "秋葵", category: "vegetable", kcalPer100g: 22, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169261, description: "Okra, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-winter-melon", name: "冬瓜", category: "vegetable", kcalPer100g: 14, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 170475, description: "Waxgourd, (chinese preserving melon), cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-zucchini", name: "西葫芦", category: "vegetable", kcalPer100g: 15, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169292, description: "Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-bean-sprouts", name: "绿豆芽", category: "vegetable", kcalPer100g: 21, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169137, description: "Mung beans, mature seeds, sprouted, cooked, boiled, drained, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-banana", name: "香蕉", category: "fruit", kcalPer100g: 89, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 173944, description: "Bananas, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-apple", name: "苹果", category: "fruit", kcalPer100g: 52, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 171688, description: "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)" }, sourceVersion: SOURCE_VERSION },
  { id: "food-orange", name: "橙子", category: "fruit", kcalPer100g: 47, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169097, description: "Oranges, raw, all commercial varieties" }, sourceVersion: SOURCE_VERSION },
  { id: "food-blueberry", name: "蓝莓", category: "fruit", kcalPer100g: 57, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 171711, description: "Blueberries, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-strawberry", name: "草莓", category: "fruit", kcalPer100g: 32, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 167762, description: "Strawberries, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-kiwi", name: "猕猴桃", category: "fruit", kcalPer100g: 61, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 168153, description: "Kiwifruit, green, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-grape", name: "葡萄", category: "fruit", kcalPer100g: 69, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 174683, description: "Grapes, red or green (European type, such as Thompson seedless), raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-watermelon", name: "西瓜", category: "fruit", kcalPer100g: 30, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 167765, description: "Watermelon, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-pear", name: "梨", category: "fruit", kcalPer100g: 57, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 169118, description: "Pears, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-almond", name: "巴旦木", category: "fat", kcalPer100g: 579, unit: "g", allergens: ["tree_nut"], source: { kind: "usda-sr-legacy", fdcId: 170567, description: "Nuts, almonds" }, sourceVersion: SOURCE_VERSION },
  { id: "food-walnut", name: "核桃", category: "fat", kcalPer100g: 654, unit: "g", allergens: ["tree_nut"], source: { kind: "usda-sr-legacy", fdcId: 170187, description: "Nuts, walnuts, english" }, sourceVersion: SOURCE_VERSION },
  { id: "food-cashew", name: "腰果", category: "fat", kcalPer100g: 553, unit: "g", allergens: ["tree_nut"], source: { kind: "usda-sr-legacy", fdcId: 170162, description: "Nuts, cashew nuts, raw" }, sourceVersion: SOURCE_VERSION },
  { id: "food-peanut", name: "花生", category: "fat", kcalPer100g: 587, unit: "g", allergens: ["peanut"], source: { kind: "usda-sr-legacy", fdcId: 173806, description: "Peanuts, all types, dry-roasted, without salt" }, sourceVersion: SOURCE_VERSION },
  { id: "food-avocado", name: "牛油果", category: "fat", kcalPer100g: 160, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 171705, description: "Avocados, raw, all commercial varieties" }, sourceVersion: SOURCE_VERSION },
  { id: "food-olive-oil", name: "橄榄油", category: "fat", kcalPer100g: 884, unit: "g", allergens: [], source: { kind: "usda-sr-legacy", fdcId: 171413, description: "Oil, olive, salad or cooking" }, sourceVersion: SOURCE_VERSION },
];

export const foodCatalogById = new Map(foodCatalog.map((entry) => [entry.id, entry]));
