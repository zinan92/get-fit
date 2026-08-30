type FoodFaceProps = { tone?: string };

const palettes: Record<string, { ink: string; blush: string }> = {
  sunny: { ink: "#5b3b2e", blush: "#ffb3a4" },
  green: { ink: "#31563f", blush: "#f4b7a4" },
  purple: { ink: "#4b3b62", blush: "#eab6c5" },
  rose: { ink: "#5a3533", blush: "#ffb2ad" },
  breakfast: { ink: "#5b3b2e", blush: "#ffb3a4" },
  lunch: { ink: "#31563f", blush: "#f4b7a4" },
  snack: { ink: "#4b3b62", blush: "#eab6c5" },
  dinner: { ink: "#5a3533", blush: "#ffb2ad" },
};

export function FoodFace({ tone = "sunny" }: FoodFaceProps) {
  const palette = palettes[tone] ?? palettes.sunny;
  return (
    <svg className="food-face" viewBox="0 0 32 22" aria-hidden="true" focusable="false">
      <circle cx="10" cy="9" r="1.35" fill={palette.ink} />
      <circle cx="22" cy="9" r="1.35" fill={palette.ink} />
      <path d="M12 13.5q4 4 8 0" fill="none" stroke={palette.ink} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5.7" cy="13.6" r="2.15" fill={palette.blush} opacity=".82" />
      <circle cx="26.3" cy="13.6" r="2.15" fill={palette.blush} opacity=".82" />
    </svg>
  );
}
