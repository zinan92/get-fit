type NavKey = "today" | "plan" | "me";

const items: Array<{ key: NavKey; href: string; icon: string; label: string }> = [
  { key: "today", href: "/", icon: "●", label: "今天" },
  { key: "plan", href: "/plan", icon: "▦", label: "计划" },
  { key: "me", href: "/me", icon: "◉", label: "我的" },
];

export function MiniNav({ active }: { active: NavKey }) {
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {items.map((item) => (
        <a className={item.key === active ? "nav-item active" : "nav-item"} href={item.href} key={item.key}>
          <span aria-hidden="true">{item.icon}</span>
          <strong>{item.label}</strong>
        </a>
      ))}
    </nav>
  );
}
