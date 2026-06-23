export function formatTokens(value: number): string {
  if (value >= 100_000_000) return `${trimFixed(value / 100_000_000, 2)}亿`;
  if (value >= 10_000) return `${trimFixed(value / 10_000, 1)}万`;
  return value.toLocaleString("zh-CN");
}

export function formatUsdMicros(value: number): string {
  const usd = value / 1_000_000;
  if (usd >= 100) return `$${Math.round(usd).toLocaleString("en-US")}`;
  return `$${usd.toFixed(2)}`;
}

function trimFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}
