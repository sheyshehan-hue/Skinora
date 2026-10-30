import { requireStaff } from "@/lib/auth";
import { CsvImporter } from "@/components/admin/CsvImporter";
import { Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "CSV import" };

export default async function ImportPage() {
  await requireStaff("products");
  return (
    <>
      <PageTitle title="Import products" subtitle="Add or update many products at once from a spreadsheet." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><CsvImporter /></div>
        <Card title="Columns">
          <p className="text-xs leading-relaxed text-ink-500">One row per variant (size). Rows with the same brand and name are grouped into one product. Matching SKUs are updated.</p>
          <ul className="mt-3 space-y-1 font-mono text-[11px]">
            {["name *", "brand *", "category * (name or slug)", "sku *", "price * (LKR)", "variant (e.g. 50 ml)", "sale_price", "cost_price", "stock", "reorder_level", "batch_number", "expiry_date (YYYY-MM-DD)", "tagline", "description", "ingredients", "how_to_use", "key_ingredients (a|b|c)", "skin_types (dry|oily)", "concerns (acne|ageing)", "gender (women|men|unisex)", "luxury (yes/no)", "status (active/draft)", "image_url"].map((c) => <li key={c}>{c}</li>)}
          </ul>
          <a href="/skinora-import-template.csv" download className="a-btn-secondary mt-4 w-full">Download template</a>
        </Card>
      </div>
    </>
  );
}
