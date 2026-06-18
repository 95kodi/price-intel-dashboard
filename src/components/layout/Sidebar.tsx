"use client";
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
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <aside className="w-[220px] min-w-[220px] h-screen bg-white border-r border-gray-200 flex flex-col py-4 sticky top-0">
      <div className="px-4 pb-4 mb-2 border-b border-gray-200 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
          PI
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 leading-tight">PriceIntel</div>
          <div className="text-[11px] text-gray-500">Retail Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {NAV_ITEMS.map((group) => (
          <div key={group.section} className="mb-1">
            <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400 font-medium">
              {group.section}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5",
                    isActive ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  {item.showBadge && unreadCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-2 pt-3 border-t border-gray-200 mt-2">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 w-full text-left">
          <div className="w-6 h-6 rounded-full bg-blue-700 text-white text-[10px] font-medium flex items-center justify-center">
            RK
          </div>
          <span className="text-xs text-gray-700 flex-1">Rajesh Kumar</span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>
      </div>
    </aside>
  );
}
