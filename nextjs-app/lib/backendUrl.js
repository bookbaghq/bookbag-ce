// Utility to get the backend base URL consistently across the app
// Always uses apiConfig.json - never environment variables

import apiConfig from "../apiConfig.json";

function trimTrailingSlash(url) {
  if (typeof url !== "string") return url;
  while (url.endsWith("/")) url = url.slice(0, -1);
  return url;
}

export function getBackendBaseUrl() {
  const base = trimTrailingSlash((apiConfig?.ApiConfig?.main || "").trim());
  if (!/^https?:\/\//.test(base)) {
    throw new Error("Missing or invalid backend URL in apiConfig.json. Update ApiConfig.main.");
  }
  return base;
}

export default getBackendBaseUrl;


