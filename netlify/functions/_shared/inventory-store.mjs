import { getStore } from "@netlify/blobs";

const store = getStore({ name: "ops-platform", consistency: "strong" });
const LATEST_KEY = "inventory/latest";
const HISTORY_KEY = "inventory/history";
const VERSION_PREFIX = "inventory/versions/";

function safeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function dedupeStrings(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeRow(row = {}) {
  return {
    brand: safeText(row.brand, "gt"),
    country: safeText(row.country),
    sku: safeText(row.sku),
    erpSku: safeText(row.erpSku),
    name: safeText(row.name),
    category: safeText(row.category),
    productCategory: safeText(row.productCategory),
    stock7d: Number(row.stock7d || 0),
    stock30d: Number(row.stock30d || 0),
    stock45d: Number(row.stock45d || 0),
    salesGrade: safeText(row.salesGrade),
    lastMonthSales: Number(row.lastMonthSales || 0),
    thisMonthSales: Number(row.thisMonthSales || 0),
    daysSupply: row.daysSupply == null ? null : Number(row.daysSupply || 0),
    dailyRate: row.dailyRate == null ? null : Number(row.dailyRate || 0),
    matchedTarget: row.matchedTarget == null ? null : Number(row.matchedTarget || 0)
  };
}

export function buildInventorySummary(rows = []) {
  const normalized = rows.map(normalizeRow);
  const negative = normalized.filter((row) => row.stock7d < 0);
  const low = normalized.filter(
    (row) => row.stock7d >= 0 && Number.isFinite(row.daysSupply) && row.daysSupply > 0 && row.daysSupply < 14
  );
  const overstock = normalized.filter((row) => Number.isFinite(row.daysSupply) && row.daysSupply > 180);

  return {
    rowCount: normalized.length,
    dangerCount: negative.length,
    warningCount: low.length,
    overstockCount: overstock.length,
    markets: dedupeStrings(normalized.map((row) => row.country)),
    categories: dedupeStrings(normalized.map((row) => row.category)),
    brands: dedupeStrings(normalized.map((row) => row.brand))
  };
}

export async function getInventoryLatest() {
  return await store.get(LATEST_KEY, { type: "json" });
}

export async function getInventoryHistory() {
  return (await store.get(HISTORY_KEY, { type: "json" })) || [];
}

export async function getInventoryVersion(versionId) {
  if (!versionId) return null;
  return await store.get(`${VERSION_PREFIX}${versionId}`, { type: "json" });
}

export async function saveInventorySnapshot({
  inventory = [],
  uploadedBy,
  uploadedAt,
  source = {},
  note = ""
}) {
  const normalizedInventory = inventory.map(normalizeRow);
  const now = uploadedAt || new Date().toISOString();
  const versionId = now.replace(/[:.]/g, "-");
  const summary = buildInventorySummary(normalizedInventory);
  const snapshot = {
    module: "inventory",
    versionId,
    uploadedAt: now,
    uploadedBy: {
      id: uploadedBy?.id || "",
      email: uploadedBy?.email || "",
      name: uploadedBy?.name || uploadedBy?.email || "Unknown"
    },
    source: {
      fileName: safeText(source.fileName),
      brands: Array.isArray(source.brands) ? source.brands : summary.brands,
      channels: Array.isArray(source.channels) ? source.channels : []
    },
    note: safeText(note),
    summary,
    inventory: normalizedInventory
  };

  const existingHistory = await getInventoryHistory();
  const historyItem = {
    versionId,
    uploadedAt: snapshot.uploadedAt,
    uploadedBy: snapshot.uploadedBy,
    source: snapshot.source,
    summary: snapshot.summary,
    note: snapshot.note
  };

  const nextHistory = [historyItem, ...existingHistory].slice(0, 30);

  await store.setJSON(LATEST_KEY, snapshot);
  await store.setJSON(`${VERSION_PREFIX}${versionId}`, snapshot);
  await store.setJSON(HISTORY_KEY, nextHistory);

  return snapshot;
}

export function inventoryRowsToCsv(rows = []) {
  const header = [
    "brand",
    "country",
    "sku",
    "erpSku",
    "name",
    "category",
    "productCategory",
    "stock7d",
    "stock30d",
    "stock45d",
    "salesGrade",
    "lastMonthSales",
    "thisMonthSales",
    "daysSupply",
    "dailyRate",
    "matchedTarget"
  ];

  const escapeCell = (value) => {
    const stringValue = value == null ? "" : String(value);
    return `"${stringValue.replaceAll('"', '""')}"`;
  };

  const lines = [header.join(",")];
  rows.forEach((row) => {
    lines.push(header.map((key) => escapeCell(row[key])).join(","));
  });
  return lines.join("\n");
}
