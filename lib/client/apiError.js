export const getApiErrorMessage = (response, payload, fallbackMessage) => {
  const base =
    String(payload?.message || "").trim() ||
    String(fallbackMessage || "").trim() ||
    "Request failed.";

  if (response?.status !== 429) return base;

  const retryAfterRaw = response.headers?.get("Retry-After");
  const retryAfter = Number.parseInt(String(retryAfterRaw || ""), 10);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return `Too many attempts. Please try again in ${retryAfter}s.`;
  }

  return "Too many attempts. Please wait and try again.";
};

