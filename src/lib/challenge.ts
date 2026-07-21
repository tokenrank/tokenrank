export function normalizeChallengeHandle(
  value: string | string[] | undefined,
): string | null {
  const candidate = (Array.isArray(value) ? value[0] : value)
    ?.trim()
    .replace(/^@+/, "")
    .trim();

  if (!candidate || !/^[A-Za-z0-9_]{1,15}$/.test(candidate)) return null;
  return candidate.toLowerCase();
}
