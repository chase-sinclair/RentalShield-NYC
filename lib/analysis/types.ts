export interface ServiceHealth {
  name: string;
  status: "ready" | "mock" | "unconfigured";
  detail: string;
}
