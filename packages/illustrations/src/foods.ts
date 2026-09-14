/**
 * Food characters beyond the original twelve. Same rules as the originals:
 * a 48-unit box, the face drawn on the food itself, blushed cheeks, soft
 * outlines one shade darker than the fill.
 */

const INK = "#3B2E28";
const GREEN_INK = "#26483A";
const BLUSH = "#FF9E8A";

const n = (value: number) => Number(value.toFixed(2));

function face(cx: number, cy: number, ink = INK, spread = 3.5): string {
  return `<circle cx="${n(cx - spread)}" cy="${n(cy)}" r="1.3" fill="${ink}"/><circle cx="${n(cx + spread)}" cy="${n(cy)}" r="1.3" fill="${ink}"/>`
    + `<path d="M${n(cx - 1.7)} ${n(cy + 3.4)}q1.7 1.5 3.4 0" stroke="${ink}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`
    + `<ellipse cx="${n(cx - spread - 3.5)}" cy="${n(cy + 2.4)}" rx="2.1" ry="1.4" fill="${BLUSH}" opacity=".5"/><ellipse cx="${n(cx + spread + 3.5)}" cy="${n(cy + 2.4)}" rx="2.1" ry="1.4" fill="${BLUSH}" opacity=".5"/>`;
}

const svg = (body: string) => `<svg viewBox="0 0 48 48">${body}</svg>`;

/** A bowl with a mounded filling; dots add grain texture. */
function bowl(fill: string, line: string, dots: string, liquid = false): string {
  const top = liquid
    ? `<ellipse cx="24" cy="25" rx="15" ry="3.6" fill="${fill}" stroke="${line}" stroke-width="1.3"/>`
    : `<path d="M11 25c0-6 6-10 13-10s13 4 13 10z" fill="${fill}" stroke="${line}" stroke-width="1.5"/>`;
  const texture = dots ? `<circle cx="18" cy="20" r="1" fill="${dots}"/><circle cx="24" cy="18" r="1" fill="${dots}"/><circle cx="29" cy="21" r="1" fill="${dots}"/><circle cx="21" cy="23" r="1" fill="${dots}"/>` : "";
  return svg(`${top}${texture}<path d="M8 25h32c0 8-6 14-16 14S8 33 8 25z" fill="#FFFDF7" stroke="#E7D5BC" stroke-width="1.6"/>${face(24, 30.5)}`);
}

function glass(fill: string, line: string, cap: string): string {
  return svg(`<path d="M15 16h18l-1.6 22a2.6 2.6 0 0 1-2.6 2.4H19.2a2.6 2.6 0 0 1-2.6-2.4z" fill="${fill}" stroke="${line}" stroke-width="1.6"/><path d="M14.4 12.5h19.2l-.5 3.5H14.9z" fill="${cap}" stroke="${line}" stroke-width="1.4"/>${face(24, 27)}`);
}

function round(fill: string, line: string, top: string, ink = INK, highlight = "#FFFFFF"): string {
  return svg(`<circle cx="24" cy="27" r="13" fill="${fill}" stroke="${line}" stroke-width="1.6"/><ellipse cx="18.5" cy="21" rx="3" ry="2" fill="${highlight}" opacity=".35"/>${top}${face(24, 28, ink)}`);
}

const leaf = (x: number, y: number, rotate: number, fill = "#6FC5A0", line = "#4A9E7C") =>
  `<path d="M${x} ${y}c3-5 9-6 12-4-2 4-8 7-12 4z" transform="rotate(${rotate} ${x} ${y})" fill="${fill}" stroke="${line}" stroke-width="1.2"/>`;

function slab(fill: string, line: string, marbling: string): string {
  return svg(`<path d="M8 30c0-9 7-15 17-15 9 0 15 5 15 12 0 8-8 13-17 13-9 0-15-3-15-10z" fill="${fill}" stroke="${line}" stroke-width="1.6"/><path d="M14 24c4-3 9-4 14-3M17 34c5 1 11 0 15-3" stroke="${marbling}" stroke-width="1.8" stroke-linecap="round" fill="none"/>${face(24, 27)}`);
}

function longVeg(fill: string, line: string, tip: string, ink = GREEN_INK): string {
  return svg(`<rect x="7" y="19" width="34" height="14" rx="7" fill="${fill}" stroke="${line}" stroke-width="1.6"/>${tip}${face(24, 24.5, ink)}`);
}

function leafy(fill: string, line: string, stem: string): string {
  return svg(`<path d="M24 8c9 3 12 12 10 20-1.5 5-6 8-10 8s-8.5-3-10-8C12 20 15 11 24 8z" fill="${fill}" stroke="${line}" stroke-width="1.6"/><path d="M24 12v24" stroke="${line}" stroke-width="1.2"/><path d="M19 36h10l-1 5h-8z" fill="${stem}" stroke="${line}" stroke-width="1.2"/>${face(24, 24, GREEN_INK)}`);
}

function nut(fill: string, line: string, texture: string): string {
  return svg(`<ellipse cx="24" cy="26" rx="13" ry="11" fill="${fill}" stroke="${line}" stroke-width="1.6"/>${texture}${face(24, 27)}`);
}

export const extraFoodCharacters: Record<string, string> = {
  "food-white-rice": bowl("#FFFFFF", "#E7D5BC", "#EDE3D0"),
  "food-oatmeal": bowl("#EFE1C4", "#C8AC84", "", true),
  "food-quinoa": bowl("#EAD9B5", "#C8AC84", "#B58A5A"),
  "food-whole-wheat-pasta": svg(`<path d="M11 25c2-8 6-10 13-10s11 2 13 10z" fill="#D9A45E" stroke="#B9823D" stroke-width="1.5"/><path d="M14 22c3-3 6 3 9 0s6 3 9 0M13 19c4-2 7 3 11 0" stroke="#F0C98A" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M8 25h32c0 8-6 14-16 14S8 33 8 25z" fill="#FFFDF7" stroke="#E7D5BC" stroke-width="1.6"/>${face(24, 30.5)}`),
  "food-soba": svg(`<path d="M11 25c2-8 6-10 13-10s11 2 13 10z" fill="#9C8570" stroke="#7B6554" stroke-width="1.5"/><path d="M14 18v7M18 16v9M22 15v10M26 15v10M30 16v9M34 18v7" stroke="#B9A48E" stroke-width="1.4" stroke-linecap="round"/><path d="M8 25h32c0 8-6 14-16 14S8 33 8 25z" fill="#FFFDF7" stroke="#E7D5BC" stroke-width="1.6"/>${face(24, 30.5)}`),
  "food-oats": svg(`<path d="M12 14h24l-2 26H14z" fill="#E8D3AE" stroke="#C8AC84" stroke-width="1.6"/><path d="M12 14l4-5h16l4 5" fill="#F2E3C6" stroke="#C8AC84" stroke-width="1.4"/><ellipse cx="19" cy="20" rx="2.2" ry="1.4" fill="#C8AC84"/><ellipse cx="29" cy="19" rx="2.2" ry="1.4" fill="#C8AC84"/><ellipse cx="24" cy="36" rx="2.2" ry="1.4" fill="#C8AC84"/>${face(24, 27)}`),
  "food-mantou": svg(`<path d="M8 34c0-11 7-19 16-19s16 8 16 19c0 3-2 5-5 5H13c-3 0-5-2-5-5z" fill="#FFFDF7" stroke="#E7D5BC" stroke-width="1.6"/><path d="M20 17c2 2 6 2 8 0" stroke="#EDE3D0" stroke-width="1.4" fill="none" stroke-linecap="round"/>${face(24, 29)}`),
  "food-potato": svg(`<path d="M9 27c0-8 7-13 15-13s15 4 15 12-6 13-15 13S9 34 9 27z" fill="#E3C28C" stroke="#BF9A5E" stroke-width="1.6"/><circle cx="14" cy="22" r="1" fill="#BF9A5E"/><circle cx="34" cy="33" r="1" fill="#BF9A5E"/><circle cx="31" cy="19" r="1" fill="#BF9A5E"/>${face(24, 27)}`),
  "food-corn": svg(`<path d="M16 38c-4-3-6-9-4-16l5-8 3 18z" fill="#8ED8B6" stroke="#4A9E7C" stroke-width="1.4"/><path d="M32 38c4-3 6-9 4-16l-5-8-3 18z" fill="#8ED8B6" stroke="#4A9E7C" stroke-width="1.4"/><rect x="17" y="8" width="14" height="32" rx="7" fill="#F6D24E" stroke="#D9AE2E" stroke-width="1.5"/><path d="M17 16h14M17 22h14M17 34h14M24 8v8" stroke="#E6BC3A" stroke-width="1"/>${face(24, 25.5, INK, 3)}`),
  "food-pumpkin": svg(`<path d="M24 12c-2-3-1-5 2-6" stroke="#4A9E7C" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="17" cy="27" rx="9" ry="12" fill="#F29E4C" stroke="#D07A2C" stroke-width="1.5"/><ellipse cx="31" cy="27" rx="9" ry="12" fill="#F29E4C" stroke="#D07A2C" stroke-width="1.5"/><ellipse cx="24" cy="27" rx="9" ry="13" fill="#F7B267" stroke="#D07A2C" stroke-width="1.5"/>${face(24, 27, INK, 3)}`),
  "food-egg-white": svg(`<path d="M9 27c0-8 6-14 13-13 4 0 6-3 11-2 6 1 8 7 7 13-1 8-8 13-16 13-9 0-15-4-15-11z" fill="#FFFFFF" stroke="#E7D5BC" stroke-width="1.6"/>${face(24, 27)}`),
  "food-chicken-thigh": svg(`<path d="M30 30l7 7" stroke="#F4E6D2" stroke-width="4.5" stroke-linecap="round"/><circle cx="38.5" cy="36" r="2.6" fill="#F4E6D2"/><circle cx="36" cy="38.5" r="2.6" fill="#F4E6D2"/><path d="M8 22c0-8 7-13 15-12 8 1 13 8 12 16-1 7-7 10-13 10-9 0-14-6-14-14z" fill="#D9955E" stroke="#B5703C" stroke-width="1.6"/>${face(21, 22)}`),
  "food-beef": slab("#C0564A", "#963B31", "#F2C1B4"),
  "food-pork-tenderloin": slab("#F0B3A3", "#C98574", "#FBE0D6"),
  "food-cod": svg(`<path d="M8 30c3-9 11-14 22-14 5 0 9 3 10 7 1 8-8 15-20 15-7 0-13-3-12-8z" fill="#FAF4EA" stroke="#DCCDB5" stroke-width="1.6"/><path d="M14 27c6-4 12-6 20-6M16 33c6-3 12-5 19-5" stroke="#EFE3CF" stroke-width="2" stroke-linecap="round"/>${face(26, 25)}`),
  "food-tuna": svg(`<ellipse cx="24" cy="15" rx="14" ry="4" fill="#DCE3E8" stroke="#A9B6BF" stroke-width="1.5"/><path d="M10 15v19c0 2.5 6 5 14 5s14-2.5 14-5V15" fill="#9FC3D6" stroke="#6F97AD" stroke-width="1.6"/><path d="M10 22h28" stroke="#6F97AD" stroke-width="1.2"/><ellipse cx="24" cy="15" rx="10" ry="2.4" fill="#E8B9A2"/>${face(24, 29)}`),
  "food-shrimp": svg(`<path d="M34 12c-11-2-22 6-21 17 1 7 7 11 13 10 5-1 6-5 3-7-4-2-9 0-10-5-1-6 6-10 13-9z" fill="#FFB38A" stroke="#E07A5C" stroke-width="1.6"/><path d="M19 18l3 4M17 24l4 2M17 30l4 0" stroke="#FFD9C4" stroke-width="1.6" stroke-linecap="round"/><path d="M34 12l5-3M34 12l6 1" stroke="#E07A5C" stroke-width="1.3" stroke-linecap="round"/>${face(24, 26)}`),
  "food-tofu": svg(`<path d="M10 20l8-6h20l-8 6z" fill="#FFFDF2" stroke="#E0D6B8" stroke-width="1.4"/><path d="M30 20l8-6v18l-8 6z" fill="#EFE6CB" stroke="#E0D6B8" stroke-width="1.4"/><rect x="10" y="20" width="20" height="18" fill="#FFF9E6" stroke="#E0D6B8" stroke-width="1.5"/>${face(20, 28, INK, 3)}`),
  "food-edamame": svg(`<path d="M8 30c2-9 9-14 18-15 7-1 13 2 14 6 1 6-6 12-15 15-9 3-18 2-17-6z" fill="#8CCB6E" stroke="#5F9E45" stroke-width="1.6"/><circle cx="16" cy="29" r="4" fill="#A7DB8B"/><circle cx="25" cy="25" r="4" fill="#A7DB8B"/><circle cx="33" cy="22" r="3.6" fill="#A7DB8B"/>${face(25, 26, GREEN_INK)}`),
  "food-soymilk": glass("#FBF1D9", "#E3CFA4", "#F0DDB2"),
  "food-whole-milk": glass("#FFFFFF", "#D8E6EE", "#EAF4FA"),
  "food-greek-yogurt": svg(`<path d="M12 18h24l-2.5 19a3 3 0 0 1-3 2.6H17.5a3 3 0 0 1-3-2.6z" fill="#FFFFFF" stroke="#C9D8E8" stroke-width="1.6"/><path d="M10.5 14h27a1.5 1.5 0 0 1 1.5 1.5V18H9v-2.5a1.5 1.5 0 0 1 1.5-1.5z" fill="#BFD6EE" stroke="#8FB2D6" stroke-width="1.5"/><path d="M15 25h18" stroke="#DDE8F3" stroke-width="3" stroke-linecap="round"/>${face(24, 29)}`),
  "food-bok-choy": leafy("#8ED8B6", "#4A9E7C", "#E8F5EE"),
  "food-napa-cabbage": svg(`<path d="M24 7c8 2 12 10 11 19-1 8-5 13-11 13s-10-5-11-13C12 17 16 9 24 7z" fill="#E4F2C8" stroke="#A8C27A" stroke-width="1.6"/><path d="M24 10c5 2 8 8 7 14M24 10c-5 2-8 8-7 14" stroke="#A8C27A" stroke-width="1.2" fill="none"/><path d="M16 30c3 5 13 5 16 0" fill="#FFFDF2" stroke="#D8D3B0" stroke-width="1.2"/>${face(24, 22, GREEN_INK, 3)}`),
  "food-lettuce": svg(`<path d="M8 28c-2-8 4-14 9-13 1-5 7-7 11-4 5-2 10 2 10 7 5 2 5 9 1 12-2 6-8 9-15 9s-14-4-16-11z" fill="#A6E08C" stroke="#6BAF52" stroke-width="1.6"/><path d="M14 30c5-3 14-3 20 0" stroke="#6BAF52" stroke-width="1.2" fill="none"/>${face(24, 25, GREEN_INK)}`),
  "food-tomato": round("#F26B5B", "#C8483A", `${leaf(24, 14, 200, "#6FC5A0")}${leaf(24, 14, -20, "#6FC5A0")}`),
  "food-cucumber": longVeg("#6FBF73", "#3F8F46", `<circle cx="13" cy="23" r=".9" fill="#DDF3D6"/><circle cx="35" cy="29" r=".9" fill="#DDF3D6"/><circle cx="31" cy="22" r=".9" fill="#DDF3D6"/>`),
  "food-carrot": svg(`<path d="M14 18l20-2c3 0 4 2 3 4L20 40c-2 2-5 1-6-2z" fill="#F59A45" stroke="#D2742A" stroke-width="1.6"/>${leaf(33, 16, -60)}${leaf(33, 16, -10)}<path d="M18 26h5M20 32h4" stroke="#D2742A" stroke-width="1.2" stroke-linecap="round"/>${face(24, 23, INK, 3)}`),
  "food-green-pepper": svg(`<path d="M24 14c-1-3 0-6 3-7" stroke="#3F8F46" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M10 25c0-7 5-11 10-10 2 0 3 1 4 1s2-1 4-1c5-1 10 3 10 10 0 9-6 15-14 15s-14-6-14-15z" fill="#5DB86A" stroke="#3F8F46" stroke-width="1.6"/><path d="M24 17v20" stroke="#3F8F46" stroke-width="1.1"/>${face(24, 27, GREEN_INK)}`),
  "food-mushroom": svg(`<rect x="18" y="26" width="12" height="14" rx="5" fill="#FBF1E1" stroke="#D8C3A2" stroke-width="1.5"/><path d="M7 26c0-9 8-15 17-15s17 6 17 15z" fill="#D9B38C" stroke="#AE8660" stroke-width="1.6"/><circle cx="16" cy="19" r="1.8" fill="#F0DCC2"/><circle cx="30" cy="17" r="1.4" fill="#F0DCC2"/>${face(24, 32, INK, 2.6)}`),
  "food-asparagus": svg(`<path d="M16 40l2-26M24 40V11M32 40l-2-26" stroke="#7CC47F" stroke-width="5" stroke-linecap="round"/><path d="M18 14l-2-4 3 2M24 11l0-4 2 3M30 14l2-4-3 2" stroke="#4E9352" stroke-width="1.6" stroke-linecap="round" fill="none"/><rect x="13" y="29" width="22" height="4" rx="2" fill="#D85C28" opacity=".85"/>${face(24, 22, GREEN_INK, 4)}`),
  "food-okra": svg(`<path d="M12 36c2-12 8-24 18-28 3-1 5 1 4 4-3 11-8 20-17 26-3 2-6 1-5-2z" fill="#79BF62" stroke="#4E9340" stroke-width="1.6"/><path d="M16 34c4-8 9-17 15-23" stroke="#4E9340" stroke-width="1.1" fill="none"/><path d="M31 8l4-3" stroke="#4E9340" stroke-width="2" stroke-linecap="round"/>${face(22, 24, GREEN_INK, 2.8)}`),
  "food-winter-melon": svg(`<ellipse cx="24" cy="26" rx="17" ry="12" fill="#6FA887" stroke="#4A7F62" stroke-width="1.6"/><path d="M12 22c8-3 16-3 24 0M11 30c8 3 18 3 26 0" stroke="#8FC4A6" stroke-width="1.4" fill="none"/><ellipse cx="17" cy="20" rx="3" ry="1.6" fill="#E3F1E8" opacity=".7"/>${face(24, 26, "#1F3D2E")}`),
  "food-zucchini": longVeg("#4F9A57", "#356E3B", `<rect x="37" y="23" width="6" height="6" rx="2" fill="#8C7A4E"/><path d="M12 22h22" stroke="#7CC285" stroke-width="1.2"/>`),
  "food-bean-sprouts": svg(`<path d="M14 12c0 10 3 20 1 28M22 10c1 11 0 20 2 30M30 12c-1 9 3 18 1 28M36 14c-2 8 0 16-1 24" stroke="#F7F1DC" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M14 12c0 10 3 20 1 28M22 10c1 11 0 20 2 30M30 12c-1 9 3 18 1 28M36 14c-2 8 0 16-1 24" stroke="#E0D6B8" stroke-width=".8" fill="none"/><ellipse cx="14" cy="11" rx="3" ry="2.2" fill="#E8E07A"/><ellipse cx="22" cy="9" rx="3" ry="2.2" fill="#E8E07A"/><ellipse cx="30" cy="11" rx="3" ry="2.2" fill="#E8E07A"/><ellipse cx="36" cy="13" rx="3" ry="2.2" fill="#E8E07A"/><rect x="11" y="24" width="28" height="11" rx="5.5" fill="#FFFDF7" stroke="#E7D5BC" stroke-width="1.3"/>${face(25, 28, INK, 3)}`),
  "food-apple": round("#EF5A5A", "#C23E3E", `<path d="M24 14c0-3 1-5 3-6" stroke="#8A5A36" stroke-width="2" stroke-linecap="round" fill="none"/>${leaf(26, 12, -30)}`),
  "food-orange": round("#F8A23B", "#D67E1C", `<circle cx="24" cy="15" r="1.4" fill="#6B9E4A"/><circle cx="30" cy="22" r=".8" fill="#E08F2A"/><circle cx="16" cy="32" r=".8" fill="#E08F2A"/><circle cx="33" cy="33" r=".8" fill="#E08F2A"/>`),
  "food-blueberry": svg(`<circle cx="16" cy="30" r="8" fill="#6E7FD4" stroke="#4E5BA8" stroke-width="1.4"/><circle cx="32" cy="30" r="8" fill="#6E7FD4" stroke="#4E5BA8" stroke-width="1.4"/><circle cx="24" cy="21" r="10" fill="#7F90E0" stroke="#4E5BA8" stroke-width="1.5"/><path d="M21 12l3 2 3-2" stroke="#3E4A8C" stroke-width="1.4" fill="none" stroke-linecap="round"/>${face(24, 22, "#232B5C", 3)}`),
  "food-strawberry": svg(`<path d="M9 18c0-4 6-5 15-5s15 1 15 5c0 11-8 23-15 23S9 29 9 18z" fill="#F2545B" stroke="#C93A41" stroke-width="1.6"/>${leaf(24, 13, 200)}${leaf(24, 13, -20)}<circle cx="15" cy="21" r=".9" fill="#FFE49A"/><circle cx="33" cy="21" r=".9" fill="#FFE49A"/><circle cx="19" cy="32" r=".9" fill="#FFE49A"/><circle cx="29" cy="32" r=".9" fill="#FFE49A"/>${face(24, 24)}`),
  "food-kiwi": svg(`<circle cx="24" cy="25" r="15" fill="#A3794F" stroke="#7E5A36" stroke-width="1.5"/><circle cx="24" cy="25" r="12.5" fill="#9ED36A"/><circle cx="24" cy="25" r="5" fill="#F3F1C8"/><g fill="#3E3A1E"><circle cx="24" cy="16" r=".8"/><circle cx="31" cy="19" r=".8"/><circle cx="17" cy="19" r=".8"/><circle cx="33" cy="27" r=".8"/><circle cx="15" cy="27" r=".8"/></g>${face(24, 25, INK, 2.4)}`),
  "food-grape": svg(`<path d="M24 10c0-3 2-4 4-4" stroke="#8A5A36" stroke-width="2" stroke-linecap="round" fill="none"/><g fill="#9C6ADE" stroke="#7446B0" stroke-width="1.2"><circle cx="17" cy="16" r="5"/><circle cx="31" cy="16" r="5"/><circle cx="24" cy="15" r="5"/><circle cx="18" cy="35" r="5"/><circle cx="30" cy="35" r="5"/><circle cx="24" cy="41" r="4.5"/></g><circle cx="24" cy="26" r="9" fill="#A97BE6" stroke="#7446B0" stroke-width="1.3"/>${face(24, 26, "#35205A", 2.8)}`),
  "food-watermelon": svg(`<path d="M6 16h36c0 13-8 23-18 23S6 29 6 16z" fill="#4FA35E" stroke="#357A42" stroke-width="1.6"/><path d="M9 16h30c0 10-6 19-15 19S9 26 9 16z" fill="#F46B6B"/><g fill="#3B2E28"><ellipse cx="15" cy="21" rx=".9" ry="1.3"/><ellipse cx="33" cy="21" rx=".9" ry="1.3"/><ellipse cx="24" cy="31" rx=".9" ry="1.3"/></g>${face(24, 22)}`),
  "food-pear": svg(`<path d="M24 12c0-3 1-5 3-6" stroke="#8A5A36" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M24 11c5 0 7 5 7 9 5 3 8 8 8 13 0 5-6 8-15 8S9 38 9 33c0-5 3-10 8-13 0-4 2-9 7-9z" fill="#D9D65E" stroke="#AEAA36" stroke-width="1.6"/>${face(24, 30)}`),
  "food-walnut": nut("#C89F6E", "#9C7443", `<path d="M24 16v20M16 20c3 3 3 9 0 12M32 20c-3 3-3 9 0 12" stroke="#9C7443" stroke-width="1.3" fill="none"/>`),
  "food-cashew": svg(`<path d="M34 12c6 4 8 12 5 19-3 7-11 11-18 9-6-2-9-7-6-11 2-3 6-2 9-4 4-3 3-9 1-12 2-2 6-3 9-1z" fill="#F2D6A6" stroke="#C9A56A" stroke-width="1.6"/>${face(27, 26, INK, 2.8)}`),
  "food-peanut": svg(`<path d="M15 12c6-4 13 0 13 7 0 3-2 5-2 7s3 3 4 7c1 6-4 10-10 10s-11-4-10-10c1-4 4-5 4-7s-3-4-3-7c0-3 1-5 4-7z" fill="#E6C08A" stroke="#BC9254" stroke-width="1.6" transform="rotate(-20 24 26)"/><g stroke="#D1A96C" stroke-width="1.1" fill="none" transform="rotate(-20 24 26)"><path d="M14 18h10M13 34h12"/></g>${face(22, 26, INK, 2.8)}`),
  "food-avocado": svg(`<path d="M24 7c6 0 9 7 11 13 3 4 5 8 5 12 0 7-7 11-16 11S8 39 8 32c0-4 2-8 5-12 2-6 5-13 11-13z" fill="#4E8C3A" stroke="#35652A" stroke-width="1.6"/><path d="M24 10c5 0 7 6 9 11 2 3 4 7 4 10 0 5-6 9-13 9s-13-4-13-9c0-3 2-7 4-10 2-5 4-11 9-11z" fill="#D8EBA0"/><circle cx="24" cy="32" r="6" fill="#9C6A3F"/>${face(24, 22, GREEN_INK, 3)}`),
  "food-olive-oil": svg(`<rect x="20" y="6" width="8" height="6" rx="1.5" fill="#6B9E4A"/><path d="M20 12h8v5c4 2 6 5 6 9v11a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V26c0-4 2-7 6-9z" fill="#E7DD7A" stroke="#B8AC45" stroke-width="1.6"/><rect x="16" y="26" width="16" height="8" rx="2" fill="#FFFDF2" opacity=".85"/>${face(24, 22, INK, 3)}`),
};
