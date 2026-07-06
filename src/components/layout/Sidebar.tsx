"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Bell,
  Package,
  Store,
  Settings,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useQueries";

const NAV_ITEMS = [
  {
    section: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/winners-losers", label: "Winners & Losers", icon: Trophy },
      { href: "/notifications", label: "Notifications", icon: Bell, showBadge: true },
    ],
  },
  {
    section: "Manage",
    items: [
      { href: "/products", label: "Product Catalog", icon: Package },
      { href: "/competitors", label: "Competitors", icon: Store },
    ],
  },
  {
    section: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <aside
      className={cn(
        "h-screen bg-card border-r border-line flex flex-col py-4 sticky top-0 transition-[width,min-width] duration-300 ease-in-out",
        collapsed ? "w-[68px] min-w-[68px]" : "w-[240px] min-w-[240px]"
      )}
    >
      <div className={cn("pb-4 mb-2 border-b border-line flex items-center gap-2.5", collapsed ? "px-3.5 justify-center" : "px-4")}>
        <div className="w-8 h-8 shrink-0 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold shadow-card">
          PI
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink leading-tight truncate">PriceIntel</div>
            <div className="text-[11px] text-ink-muted truncate">Retail Intelligence</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3">
        {NAV_ITEMS.map((group) => (
          <div key={group.section} className="mb-2">
            {!collapsed && (
              <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-xl text-sm transition-all duration-200 mb-1",
                    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                    isActive
                      ? "bg-indigo-50 text-primary font-semibold"
                      : "text-ink-muted hover:bg-gray-50 hover:text-ink"
                  )}
                >
                  <Icon size={17} className="shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {item.showBadge && unreadCount > 0 && (
                    <span
                      className={cn(
                        "bg-danger text-white text-[10px] font-semibold rounded-full text-center leading-none",
                        collapsed
                          ? "absolute top-1 right-1.5 w-2 h-2 p-0"
                          : "px-1.5 py-1 min-w-[18px]"
                      )}
                    >
                      {!collapsed && unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-3 pt-3 border-t border-line mt-2 space-y-1">
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2.5 rounded-xl text-ink-muted hover:bg-gray-50 hover:text-ink w-full transition-colors text-sm",
            collapsed ? "justify-center py-2.5" : "px-3 py-2"
          )}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} className="shrink-0" />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <button
          title={collapsed ? "Rajesh Kumar" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-xl hover:bg-gray-50 w-full text-left transition-colors",
            collapsed ? "justify-center py-2" : "px-3 py-2"
          )}
        >
          <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-[10px] font-semibold flex items-center justify-center">
            RK
          </div>
          {!collapsed && (
            <>
              <span className="text-xs text-ink flex-1 truncate font-medium">Rajesh Kumar</span>
              <ChevronDown size={12} className="text-gray-400" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
