import { sources, type ApartmentAddress, type ReportingWindow } from "./contracts";
import { aggregateCount, whereWindow, type SocrataClient } from "./socrata";

function radius(address: ApartmentAddress, meters: number) {
  return `within_circle(location,${address.latitude},${address.longitude},${meters})`;
}

export async function readNoise(query: SocrataClient, address: ApartmentAddress, window: ReportingWindow) {
  const value = aggregateCount(await query(sources.noise.dataset, {
    select: "count(distinct unique_key) as n",
    where: `upper(complaint_type) LIKE 'NOISE%' AND ${whereWindow(window.noise)} AND ${radius(address, window.radiusMeters)}`,
    limit: 1,
  }));
  return { value };
}

export async function readTrees(query: SocrataClient, address: ApartmentAddress, window: ReportingWindow) {
  const value = aggregateCount(await query(sources.trees.dataset, {
    select: "count(distinct globalid) as n",
    where: `pssite = 'Street' AND psstatus = 'Populated' AND ${radius(address, window.radiusMeters)}`,
    limit: 1,
  }));
  return { value };
}
