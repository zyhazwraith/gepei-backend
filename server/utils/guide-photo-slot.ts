const API_SLOT_MIN = 0;
const API_SLOT_MAX = 4;

function parseInteger(rawSlot: unknown): number | null {
  if (rawSlot === undefined || rawSlot === null) {
    return null;
  }

  const normalized = String(rawSlot).trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}

export function resolveGuidePhotoStorageSlot(rawSlot: unknown): string | null {
  if (rawSlot === undefined || rawSlot === null || String(rawSlot).trim() === '') {
    return String(API_SLOT_MIN);
  }

  const parsed = parseInteger(rawSlot);
  if (parsed === null) {
    return null;
  }

  if (parsed >= API_SLOT_MIN && parsed <= API_SLOT_MAX) {
    return String(parsed);
  }

  return null;
}

export function toGuidePhotoApiSlot(storageSlot?: number): number | undefined {
  if (storageSlot === undefined || Number.isNaN(storageSlot)) {
    return undefined;
  }

  if (storageSlot >= API_SLOT_MIN && storageSlot <= API_SLOT_MAX) {
    return storageSlot;
  }

  return undefined;
}
