import { PageHeader } from "@/components/layout/PageHeader";
import { ProductTable } from "@/components/products/ProductTable";

export default function ProductsPage() {
  return (
    <div>
      <PageHeader title="Product Catalog" meta="Manage your tracked products" />
      <div className="p-6">
        <ProductTable />
      </div>
    </div>
  );
}
