import { checkMarkup, composeExerciseSvg, foodCharacters, icons, type IconName } from "../../packages/illustrations/src/index";

type HandIconName = IconName | "walk";
type ExerciseKind = "squat" | "row" | "bridge";

// Web order of the demo food cards; the mini-program looks characters up by catalog id.
const foodOrder = ["food-egg", "food-yogurt", "food-toast", "food-chicken", "food-rice", "food-broccoli", "food-banana", "food-milk", "food-almond", "food-salmon", "food-sweet-potato", "food-spinach"];

function iconSvg(name: HandIconName): string {
  return name === "walk" ? composeExerciseSvg("walk") : icons[name];
}

export function HandIcon({ name, className = "" }: { name: HandIconName; className?: string }) {
  return <span className={`hand-icon ${className}`.trim()} aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconSvg(name) }} />;
}

export function CheckMark() {
  return <span className="check-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: checkMarkup }} />;
}

export function ExerciseIllustration({ kind }: { kind: ExerciseKind }) {
  return <span className="exercise-illustration" aria-hidden="true" dangerouslySetInnerHTML={{ __html: composeExerciseSvg(kind) }} />;
}

export function FoodIllustration({ index }: { index: number }) {
  return <span className="food-illustration" aria-hidden="true" dangerouslySetInnerHTML={{ __html: foodCharacters[foodOrder[index]] ?? foodCharacters[foodOrder[0]] }} />;
}
