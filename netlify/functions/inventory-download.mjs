import { getInventoryLatest, inventoryRowsToCsv } from "./_shared/inventory-store.mjs";

export default async () => {
  const latest = await getInventoryLatest();
  if (!latest) {
    return new Response("No inventory snapshot yet", { status: 404 });
  }

  const csv = inventoryRowsToCsv(latest.inventory || []);
  const stamp = (latest.uploadedAt || new Date().toISOString()).slice(0, 19).replace(/[T:]/g, "-");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-latest-${stamp}.csv"`
    }
  });
};

export const config = {
  path: "/api/inventory/download"
};
