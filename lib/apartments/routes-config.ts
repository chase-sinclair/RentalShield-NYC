import "server-only";

export function routesConfig() {
  const apiKey = process.env.GOOGLE_ROUTES_API_KEY?.trim();
  return process.env.GOOGLE_ROUTES_ENABLED === "true" && apiKey ? { apiKey } : undefined;
}
