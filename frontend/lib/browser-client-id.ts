const STORAGE_KEY = "cuentra.browser-client-id.v1";
let volatileClientId: string | undefined;

/** Stable, opaque namespace for this browser profile's demo data. */
export function getBrowserClientId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) {
      return existing;
    }
    const generated = window.crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    volatileClientId ??= window.crypto.randomUUID();
    return volatileClientId;
  }
}
