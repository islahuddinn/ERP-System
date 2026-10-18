/**
 * Dummy-data and localStorage auth-bypass are local-dev only.
 * Production builds always hit the real API.
 */
export function isDummyDataEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (process.env.NEXT_PUBLIC_USE_DUMMY_DATA === "true") {
    return true;
  }

  if (typeof window !== "undefined" && localStorage.getItem("authBypass") === "true") {
    return true;
  }

  return false;
}
