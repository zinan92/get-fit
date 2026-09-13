type NavKey = "today" | "plan" | "me";

const items: Array<{ key: NavKey; href: string; icon: "sun" | "calendar" | "person"; label: string }> = [
  { key: "today", href: "/", icon: "sun", label: "今天" },
  { key: "plan", href: "/plan", icon: "calendar", label: "计划" },
  { key: "me", href: "/me", icon: "person", label: "我的" },
];

const iconMarkup = {
  sun: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/></g></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="4" stroke="currentColor" stroke-width="2"/><path d="M3 10h18" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="14.8" r="1.4" fill="currentColor"/><circle cx="13" cy="14.8" r="1.4" fill="currentColor"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="4" stroke="currentColor" stroke-width="2"/><path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
} as const;

export function MiniNav({ active }: { active: NavKey }) {
  return (
    <nav className="bottom-nav" aria-label="主要导航">
      {items.map((item) => (
        <a className={item.key === active ? "nav-item active" : "nav-item"} href={item.href} key={item.key}>
          <span className="nav-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconMarkup[item.icon] }} />
          <strong>{item.label}</strong>
        </a>
      ))}
    </nav>
  );
}
