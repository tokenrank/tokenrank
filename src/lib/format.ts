export function formatTokens(value: number, locale: "en" | "zh" = "zh"): string {
  if (locale === "en") {
    if (Math.abs(value) >= 1_000_000_000) return `${trimFixed(value / 1_000_000_000, 2)}B`;
    if (Math.abs(value) >= 1_000_000) return `${trimFixed(value / 1_000_000, 1)}M`;
    if (Math.abs(value) >= 1_000) return `${trimFixed(value / 1_000, 1)}K`;
    return formatInteger(value);
  }

  if (value >= 100_000_000) return `${trimFixed(value / 100_000_000, 2)}亿`;
  if (value >= 10_000) return `${trimFixed(value / 10_000, 1)}万`;
  return formatInteger(value);
}

export function formatUsdMicros(value: number): string {
  const usd = value / 1_000_000;
  if (usd >= 100) return `$${formatInteger(Math.round(usd))}`;
  return `$${usd.toFixed(2)}`;
}

export function formatInteger(value: number): string {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function trimFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}
