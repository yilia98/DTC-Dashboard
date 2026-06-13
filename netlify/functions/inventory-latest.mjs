import { getInventoryLatest } from "./_shared/inventory-store.mjs";

export default async () => {
  const latest = await getInventoryLatest();
  return Response.json(
    latest || {
      module: "inventory",
      empty: true,
      summary: { rowCount: 0, dangerCount: 0, warningCount: 0, overstockCount: 0, markets: [], categories: [], brands: [] },
      inventory: []
    }
  );
};

export const config = {
  path: "/api/inventory/latest"
};
