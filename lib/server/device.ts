// The per-device cookie that identifies who posted or claimed something.
// Edge-safe (used by middleware).

export const DEVICE_COOKIE = "td_device";
export const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
