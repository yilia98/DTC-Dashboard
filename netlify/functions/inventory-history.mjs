import { getInventoryHistory } from "./_shared/inventory-store.mjs";

export default async () => {
  const history = await getInventoryHistory();
  return Response.json({ items: history });
};

export const config = {
  path: "/api/inventory/history"
};
