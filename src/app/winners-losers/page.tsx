import { PageHeader } from "@/components/layout/PageHeader";
import { WinnersLosersLists } from "@/components/products/WinnersLosersLists";

export default function WinnersLosersPage() {
  return (
    <div>
      <PageHeader title="Winners & Losers" meta="Products requiring attention" />
      <div className="p-6">
        <WinnersLosersLists />
      </div>
    </div>
  );
}
