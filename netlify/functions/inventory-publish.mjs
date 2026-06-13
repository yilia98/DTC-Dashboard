import { getUser } from "@netlify/identity";
import { saveInventorySnapshot } from "./_shared/inventory-store.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const user = await getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const inventory = Array.isArray(body?.inventory) ? body.inventory : [];

  if (!inventory.length) {
    return Response.json({ error: "inventory payload is empty" }, { status: 400 });
  }

  const snapshot = await saveInventorySnapshot({
    inventory,
    uploadedBy: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email
    },
    uploadedAt: body?.uploadedAt,
    source: body?.source || {},
    note: body?.note || ""
  });

  return Response.json(snapshot, { status: 201 });
};

export const config = {
  path: "/api/inventory/publish"
};
