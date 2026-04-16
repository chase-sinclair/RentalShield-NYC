export function isLikelyUrl(value: string) {
  try {
    const candidate = new URL(value);
    return ["http:", "https:"].includes(candidate.protocol);
  } catch {
    return false;
  }
}
