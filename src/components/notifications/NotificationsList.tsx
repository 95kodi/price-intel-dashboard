"use client";
import { TrendingDown, AlertCircle, Info, CheckCircle, Bell, Check } from "lucide-react";
import { useNotifications, useMarkAllRead, useMarkNotificationRead } from "@/hooks/useQueries";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";
import type { Notification } from "@/types";

const TYPE_CONFIG: Record<Notification["type"], { icon: typeof TrendingDown; bg: string; color: string }> = {
  danger: { icon: TrendingDown, bg: "bg-red-50", color: "text-red-600" },
  warning: { icon: AlertCircle, bg: "bg-amber-50", color: "text-amber-600" },
  info: { icon: Info, bg: "bg-blue-50", color: "text-blue-600" },
  success: { icon: CheckCircle, bg: "bg-green-50", color: "text-green-600" },
};

export function NotificationsList() {
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markAllMutation = useMarkAllRead();
  const markOneMutation = useMarkNotificationRead();

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 flex-1">Recent Alerts</h3>
        {unreadCount > 0 && (
          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">{unreadCount} unread</span>
        )}
        <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()} disabled={!unreadCount}>
          <Check size={13} />
          Mark all read
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={1} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !notifications?.length ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up. New alerts will appear here after scans." />
      ) : (
        <div>
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type];
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                onClick={() => !n.read && markOneMutation.mutate(n.id)}
                className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                  !n.read ? "bg-blue-50/30" : ""
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon size={15} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{n.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{n.description}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  {!n.read && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 mb-1.5 ml-auto" />}
                  <div className="text-[11px] text-gray-400">{formatDate(n.timestamp)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
