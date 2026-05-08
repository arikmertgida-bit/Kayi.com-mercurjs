import Medusa from "@medusajs/js-sdk";

export const backendUrl = __BACKEND_URL__ ?? "/";

export const sdk = new Medusa({
  baseUrl: backendUrl,
});

// useful when you want to call the BE from the console and try things out quickly
declare global {
  interface Window { __sdk: typeof sdk }
}
if (typeof window !== "undefined") {
  window.__sdk = sdk;
}
