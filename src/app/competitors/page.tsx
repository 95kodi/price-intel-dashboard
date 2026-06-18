import { PageHeader } from "@/components/layout/PageHeader";
import { CompetitorTable } from "@/components/competitors/CompetitorTable";

export default function CompetitorsPage() {
  return (
    <div>
      <PageHeader title="Competitor Management" meta="Manage tracked competitor websites" />
      <div className="p-6">
        <CompetitorTable />
      </div>
    </div>
  );
}
