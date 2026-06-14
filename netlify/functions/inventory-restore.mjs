import { getUser } from "@netlify/identity";
import { getInventoryVersion, saveInventorySnapshot } from "./_shared/inventory-store.mjs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const user = await getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const versionId = body?.versionId;

  if (!versionId) {
    return Response.json({ error: "versionId is required" }, { status: 400 });
  }

  const snapshot = await getInventoryVersion(versionId);
  if (!snapshot || !Array.isArray(snapshot.inventory) || !snapshot.inventory.length) {
    return Response.json({ error: "snapshot not found" }, { status: 404 });
  }

  const restored = await saveInventorySnapshot({
    inventory: snapshot.inventory,
    uploadedBy: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email
    },
    uploadedAt: body?.uploadedAt,
    source: {
      ...(snapshot.source || {}),
      rollbackFrom: versionId
    },
    note: body?.note || `回滚到 ${versionId}`
  });

  return Response.json(restored, { status: 201 });
};

export const config = {
  path: "/api/inventory/restore"
};
