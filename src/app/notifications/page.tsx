import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationsList } from "@/components/notifications/NotificationsList";

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" meta="Alerts generated after scans" />
      <div className="p-6">
        <NotificationsList />
      </div>
    </div>
  );
}
