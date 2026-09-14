import { navIcons } from "../../packages/illustrations/src/index";

type NavKey = "today" | "plan" | "me";

const items: Array<{ key: NavKey; href: string; icon: "sun" | "calendar" | "person"; label: string }> = [
  { key: "today", href: "/", icon: "sun", label: "今天" },
  { key: "plan", href: "/plan", icon: "calendar", label: "计划" },
  { key: "me", href: "/me", icon: "person", label: "我的" },
];


export function MiniNav({ active }: { active: NavKey }) {
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {items.map((item) => (
        <a className={item.key === active ? "nav-item active" : "nav-item"} href={item.href} key={item.key}>
          <span className="nav-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: navIcons[item.icon] }} />
          <strong>{item.label}</strong>
        </a>
      ))}
    </nav>
  );
}
