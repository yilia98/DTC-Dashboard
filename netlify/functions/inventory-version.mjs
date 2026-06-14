import { getInventoryVersion } from "./_shared/inventory-store.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const versionId = url.searchParams.get("versionId");

  if (!versionId) {
    return Response.json({ error: "versionId is required" }, { status: 400 });
  }

  const snapshot = await getInventoryVersion(versionId);
  if (!snapshot) {
    return Response.json({ error: "snapshot not found" }, { status: 404 });
  }

  return Response.json(snapshot);
};

export const config = {
  path: "/api/inventory/version"
};
