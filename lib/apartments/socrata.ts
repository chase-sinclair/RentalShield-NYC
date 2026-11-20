import { z } from "zod";

import type { DateWindow } from "./contracts";

export type CityRow = Record<string, unknown>;
export type CityQuery = { select: string; where: string; limit: number; group?: string; order?: string };

export class CityDataError extends Error {}

const rowsSchema = z.array(z.record(z.unknown()));

export function createSocrataClient(fetcher: typeof fetch = fetch, token?: string) {
  return async function query(dataset: string, clauses: CityQuery): Promise<CityRow[]> {
    const url = new URL(`https://data.cityofnewyork.us/resource/${dataset}.json`);
    url.searchParams.set("$select", clauses.select);
    url.searchParams.set("$where", clauses.where);
    url.searchParams.set("$limit", String(clauses.limit));
    if (clauses.group) url.searchParams.set("$group", clauses.group);
    if (clauses.order) url.searchParams.set("$order", clauses.order);
    let response: Response;
    try {
      response = await fetcher(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(7500),
        headers: token ? { "X-App-Token": token } : undefined,
      });
    } catch (error) {
      throw new CityDataError(error instanceof Error && error.name === "TimeoutError"
        ? "The city data request timed out. Try again."
        : "The city data source could not be reached. Try again.");
    }
    if (response.status === 429) throw new CityDataError("The city data source is busy. Try again shortly.");
    if (!response.ok) throw new CityDataError("The city data source returned an error. Try again.");

    const result = rowsSchema.safeParse(await response.json().catch(() => null));
    if (!result.success) throw new CityDataError("The city data source returned an unexpected format.");
    return result.data;
  };
}

export type SocrataClient = ReturnType<typeof createSocrataClient>;

export function literal(value: string) {
  return "'" + value.replaceAll("'", "''") + "'";
}

export function whereWindow(window: DateWindow) {
  return `created_date >= ${literal(window.start + "T00:00:00")} AND created_date < ${literal(window.end + "T00:00:00")}`;
}

export function rowCount(value: unknown) {
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof parsed === "number" && Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function aggregateCount(rows: CityRow[]) {
  // A count query with no GROUP BY always returns one aggregate row.
  const value = rows.length === 1 ? rowCount(rows[0].n) : null;
  if (value === null) throw new CityDataError("The city data source returned an invalid count.");
  return value;
}

export function requireComplete(rows: CityRow[], limit: number) {
  if (rows.length >= limit) throw new CityDataError("The city data source returned an incomplete result.");
  return rows;
}

export function recordDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)?$/.test(value)) return undefined;
  const day = value.slice(0, 10);
  const date = new Date(day + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : undefined;
}
