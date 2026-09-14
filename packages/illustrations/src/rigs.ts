/**
 * Movement-pattern characters drawn from shared parts so every new move keeps
 * the same body language: clay head with the face on it, blushed cheeks, a
 * training-orange torso, iron dumbbells. Coordinates live in a 64-unit box.
 *
 * Each rig is a stack of layers; a layer with a motion loops between its rest
 * pose and the peak transform. Origins are percentages of the whole box, so a
 * layer rendered as a full-box <image> pivots at the right joint.
 */

export type MotionSpec = {
  /** Transform at rest (defaults to none). */
  rest?: string;
  /** Transform at the peak of the loop. */
  peak: string;
  /** Pivot as a percentage of the character box. */
  origin: string;
  duration: number;
};

export type RigLayer = { motion: string | null; markup: string };
export type Rig = { viewBox: string; layers: RigLayer[] };

const SKIN = "#E9A97F";
const SKIN_LINE = "#C9814F";
const BODY = "#D85C28";
const IRON = "#4A3F38";
const FLOOR = "#E0D3BC";
const FACE = "#3B2E28";
const BLUSH = "#FF9E8A";
const WOOD = "#D8CBAE";

const n = (value: number) => Number(value.toFixed(2));

export function head(cx: number, cy: number, r = 8): string {
  return `<circle cx="${n(cx)}" cy="${n(cy)}" r="${r}" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="1.4"/>`
    + `<circle cx="${n(cx - 3.3)}" cy="${n(cy)}" r="1.3" fill="${FACE}"/><circle cx="${n(cx + 3.3)}" cy="${n(cy)}" r="1.3" fill="${FACE}"/>`
    + `<path d="M${n(cx - 1.7)} ${n(cy + 3.1)}q1.7 1.5 3.4 0" stroke="${FACE}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`
    + `<ellipse cx="${n(cx - 6.6)}" cy="${n(cy + 2)}" rx="2.1" ry="1.4" fill="${BLUSH}" opacity=".5"/><ellipse cx="${n(cx + 6.6)}" cy="${n(cy + 2)}" rx="2.1" ry="1.4" fill="${BLUSH}" opacity=".5"/>`;
}

/** A rounded limb or torso segment from (x1,y1) to (x2,y2). */
export function segment(x1: number, y1: number, x2: number, y2: number, width: number, fill = SKIN): string {
  return `<path d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}" stroke="${fill}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
}

const limb = (x1: number, y1: number, x2: number, y2: number) => segment(x1, y1, x2, y2, 6.5);
const torso = (x1: number, y1: number, x2: number, y2: number) => segment(x1, y1, x2, y2, 14, BODY);
const foot = (cx: number, cy: number) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="5.2" ry="2.7" fill="${SKIN_LINE}"/>`;
const shadow = (cx = 32, rx = 16) => `<ellipse cx="${cx}" cy="57" rx="${rx}" ry="2.6" fill="${FLOOR}"/>`;
const mat = `<rect x="4" y="51" width="56" height="4.5" rx="2.2" fill="${FLOOR}"/>`;

/** Dumbbell centered at (cx,cy); vertical bars run up and down. */
export function dumbbell(cx: number, cy: number, vertical = false): string {
  return vertical
    ? `<rect x="${n(cx - 2.3)}" y="${n(cy - 6)}" width="4.6" height="12" rx="2.3" fill="${IRON}"/><circle cx="${n(cx)}" cy="${n(cy - 6.5)}" r="3.2" fill="${IRON}"/><circle cx="${n(cx)}" cy="${n(cy + 6.5)}" r="3.2" fill="${IRON}"/>`
    : `<rect x="${n(cx - 6)}" y="${n(cy - 2.3)}" width="12" height="4.6" rx="2.3" fill="${IRON}"/><circle cx="${n(cx - 6.5)}" cy="${n(cy)}" r="3.2" fill="${IRON}"/><circle cx="${n(cx + 6.5)}" cy="${n(cy)}" r="3.2" fill="${IRON}"/>`;
}

export const rigMotions: Record<string, MotionSpec> = {
  "lunge-legs": { peak: "scaleY(.62)", origin: "50% 84%", duration: 2.6 },
  "lunge-upper": { peak: "translateY(11%)", origin: "50% 50%", duration: 2.6 },
  "hinge-upper": { peak: "rotate(52deg)", origin: "48.4% 59.4%", duration: 2.8 },
  "pushup-arms": { peak: "scaleY(.55)", origin: "50% 84.4%", duration: 2.4 },
  "pushup-body": { peak: "rotate(-10deg)", origin: "84.4% 82.8%", duration: 2.4 },
  "bench-arms": { peak: "scaleY(.4)", origin: "50% 62.5%", duration: 2.4 },
  "overhead-arms": { peak: "translateY(17%)", origin: "50% 50%", duration: 2.4 },
  "raise-left": { peak: "rotate(78deg)", origin: "35.9% 43.75%", duration: 2.4 },
  "raise-right": { peak: "rotate(-78deg)", origin: "64.1% 43.75%", duration: 2.4 },
  "curl-left": { peak: "rotate(165deg)", origin: "31.25% 62.5%", duration: 2.2 },
  "curl-right": { peak: "rotate(-165deg)", origin: "68.75% 62.5%", duration: 2.2 },
  "dip-body": { peak: "translateY(12%)", origin: "50% 50%", duration: 2.4 },
  "crunch-upper": { peak: "rotate(28deg)", origin: "51.6% 75%", duration: 2.4 },
  "deadbug-arm": { peak: "rotate(-62deg)", origin: "35.9% 71.9%", duration: 2.6 },
  "deadbug-leg": { peak: "rotate(58deg)", origin: "67.2% 71.9%", duration: 2.6 },
  "plank-breathe": { peak: "translateY(-3%)", origin: "50% 50%", duration: 3.2 },
  "climber-knee": { peak: "rotate(-38deg)", origin: "60.9% 70.3%", duration: 1.2 },
  "jack-arm-left": { peak: "rotate(140deg)", origin: "39% 43.75%", duration: 1.4 },
  "jack-arm-right": { peak: "rotate(-140deg)", origin: "61% 43.75%", duration: 1.4 },
  "jack-leg-left": { peak: "rotate(18deg)", origin: "45.3% 62.5%", duration: 1.4 },
  "jack-leg-right": { peak: "rotate(-18deg)", origin: "54.7% 62.5%", duration: 1.4 },
  "calf-body": { peak: "translateY(-7%)", origin: "50% 50%", duration: 2 },
  "stretch-arm": { peak: "rotate(-150deg)", origin: "46.9% 57.8%", duration: 3 },
};

export const rigs: Record<string, Rig> = {
  // Side-on split stance; legs compress toward the floor while the upper body sinks.
  lunge: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: shadow(31, 18) + foot(45, 54) + foot(17, 54.5) },
      { motion: "lunge-legs", markup: limb(40, 38, 44, 53) + limb(28, 39, 19, 53) },
      { motion: "lunge-upper", markup: torso(33, 26, 33, 38) + head(33, 13) + dumbbell(24, 38, true) + dumbbell(42, 38, true) },
    ],
  },
  // Romanian deadlift: legs stay planted, the upper body hinges forward at the hip.
  hinge: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: shadow(32, 14) + limb(31, 38, 31, 53) + foot(35, 54.5) },
      { motion: "hinge-upper", markup: torso(31, 36, 31, 24) + head(31, 11.5) + limb(33, 27, 34, 44) + dumbbell(34, 46) },
    ],
  },
  // Push-up from the side: the body pivots at the toes while the arms bend.
  pushup: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: mat },
      { motion: "pushup-arms", markup: limb(19, 43, 19, 52) + `<ellipse cx="19" cy="52.5" rx="3.6" ry="2" fill="${SKIN_LINE}"/>` },
      { motion: "pushup-body", markup: torso(20, 41, 38, 45) + limb(38, 46, 54, 50) + `<ellipse cx="56" cy="51" rx="3.2" ry="2.4" fill="${SKIN_LINE}"/>` + head(11, 37, 7.5) },
    ],
  },
  // Lying press: the arms push the dumbbell up from the chest.
  bench: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: `<rect x="10" y="44" width="40" height="5" rx="2.5" fill="${WOOD}"/><rect x="14" y="48" width="4" height="8" rx="2" fill="${WOOD}"/><rect x="42" y="48" width="4" height="8" rx="2" fill="${WOOD}"/>` + limb(44, 42, 52, 47) + limb(52, 47, 53, 55) + foot(55, 56) + torso(20, 38, 42, 38) + head(12, 37, 7.5) },
      { motion: "bench-arms", markup: limb(29, 38, 29, 22) + dumbbell(29, 20) },
    ],
  },
  // Overhead press from the front: arms slide up out of the shoulders.
  overhead: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: shadow() + foot(26, 54.5) + foot(38, 54.5) + limb(27, 40, 26, 53) + limb(37, 40, 38, 53) },
      { motion: "overhead-arms", markup: limb(22, 28, 19, 12) + limb(42, 28, 45, 12) + dumbbell(19, 9) + dumbbell(45, 9) },
      { motion: null, markup: torso(32, 28, 32, 40) + head(32, 15) },
    ],
  },
  // Lateral raise: each arm swings out from its shoulder.
  raise: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: shadow() + foot(26, 54.5) + foot(38, 54.5) + limb(27, 40, 26, 53) + limb(37, 40, 38, 53) },
      { motion: "raise-left", markup: limb(23, 28, 21, 43) + dumbbell(21, 46, true) },
      { motion: "raise-right", markup: limb(41, 28, 43, 43) + dumbbell(43, 46, true) },
      { motion: null, markup: torso(32, 28, 32, 40) + head(32, 15) },
    ],
  },
  // Biceps curl: forearms fold up at the elbows.
  curl: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: shadow() + foot(26, 54.5) + foot(38, 54.5) + limb(27, 40, 26, 53) + limb(37, 40, 38, 53) + limb(23, 28, 20, 40) + limb(41, 28, 44, 40) + torso(32, 28, 32, 40) + head(32, 15) },
      { motion: "curl-left", markup: limb(20, 40, 20, 50) + dumbbell(20, 52, true) },
      { motion: "curl-right", markup: limb(44, 40, 44, 50) + dumbbell(44, 52, true) },
    ],
  },
  // Chair dip: body lowers in front of the seat.
  dip: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: shadow(36, 20) + `<rect x="8" y="30" width="20" height="4.5" rx="2.2" fill="${WOOD}"/><rect x="10" y="33" width="4" height="23" rx="2" fill="${WOOD}"/><rect x="23" y="33" width="4" height="23" rx="2" fill="${WOOD}"/>` + foot(50, 54.5) },
      { motion: "dip-body", markup: limb(26, 31, 30, 22) + torso(31, 22, 32, 36) + limb(33, 40, 46, 40) + limb(46, 40, 48, 52) + head(33, 10) },
    ],
  },
  // Crunch: the upper body curls up off the mat around the hips.
  crunch: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: mat + limb(34, 47, 44, 34) + limb(44, 34, 52, 48) + foot(53, 49.5) },
      { motion: "crunch-upper", markup: torso(33, 46, 17, 46) + head(9, 44, 7.5) },
    ],
  },
  // Dead bug: opposite arm and leg reach away while the back stays down.
  deadbug: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: mat + torso(20, 46, 42, 46) + head(11, 44, 7.5) },
      { motion: "deadbug-arm", markup: limb(23, 46, 23, 29) },
      { motion: "deadbug-leg", markup: limb(43, 46, 43, 33) + limb(43, 33, 54, 33) + `<ellipse cx="56" cy="33" rx="2.4" ry="3.2" fill="${SKIN_LINE}"/>` },
    ],
  },
  // Plank: a steady line on the forearms, breathing slowly.
  plank: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: mat },
      { motion: "plank-breathe", markup: limb(15, 50, 25, 50) + limb(18, 41, 17, 49) + torso(20, 40, 38, 43) + limb(38, 44, 54, 49) + `<ellipse cx="56" cy="50" rx="3" ry="2.4" fill="${SKIN_LINE}"/>` + head(11, 35, 7.5) },
    ],
  },
  // Mountain climber: knee drives toward the chest from a high plank.
  climber: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: mat + limb(19, 40, 19, 51) + torso(21, 38, 38, 43) + limb(38, 44, 55, 49) + `<ellipse cx="57" cy="50" rx="3" ry="2.4" fill="${SKIN_LINE}"/>` + head(12, 34, 7.5) },
      { motion: "climber-knee", markup: limb(39, 45, 47, 52) + limb(47, 52, 52, 49) },
    ],
  },
  // Jumping jack: arms sweep overhead while the legs step apart.
  jack: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: shadow() },
      { motion: "jack-leg-left", markup: limb(29, 40, 28, 52) + foot(27, 54) },
      { motion: "jack-leg-right", markup: limb(35, 40, 36, 52) + foot(37, 54) },
      { motion: "jack-arm-left", markup: limb(25, 28, 22, 42) },
      { motion: "jack-arm-right", markup: limb(39, 28, 42, 42) },
      { motion: null, markup: torso(32, 28, 32, 40) + head(32, 15) },
    ],
  },
  // Calf raise: the body rises onto the toes.
  calf: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: shadow() + `<ellipse cx="27" cy="55" rx="3.4" ry="2.2" fill="${SKIN_LINE}"/><ellipse cx="37" cy="55" rx="3.4" ry="2.2" fill="${SKIN_LINE}"/>` },
      { motion: "calf-body", markup: limb(28, 40, 27, 52) + limb(36, 40, 37, 52) + limb(24, 28, 22, 41) + limb(40, 28, 42, 41) + torso(32, 28, 32, 40) + head(32, 15) },
    ],
  },
  // Stretch: a low lunge with one arm opening toward the ceiling.
  stretch: {
    viewBox: "0 0 64 64",
    layers: [
      { motion: null, markup: mat + limb(38, 42, 44, 51) + limb(26, 44, 14, 50) + foot(46, 52) + torso(26, 36, 36, 44) + head(21, 26, 7.5) + limb(30, 38, 34, 50) },
      { motion: "stretch-arm", markup: limb(30, 37, 30, 49) },
    ],
  },
};
