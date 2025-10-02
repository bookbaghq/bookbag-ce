// Utility to get the backend base URL consistently across the app

function trimTrailingSlash(url) {
  if (typeof url !== "string") return url;
  while (url.endsWith("/")) url = url.slice(0, -1);
  return url;
}

export function getBackendBaseUrl() {
  const fromEnv = typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_BACKEND_URL : undefined;
  const base = trimTrailingSlash((fromEnv || "").trim());
  if (!/^https?:\/\//.test(base)) {
    throw new Error("Missing or invalid NEXT_PUBLIC_BACKEND_URL. Set it in the environment.");
  }
  return base;
}

export default getBackendBaseUrl;


