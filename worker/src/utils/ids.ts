export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createPublicSlug(name: string): string {
  const readableName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6);

  return `${readableName || "monitor"}-${suffix}`;
}
