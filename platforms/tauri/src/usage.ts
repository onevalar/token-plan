import { z } from "zod";

const number = z.number().finite().nullish();
const resource = z.object({
  kind: z.string(), unit: z.string(),
  used: number, available: number, limit: number, remaining: number,
  utilization: number, windowSeconds: number, resetsAt: z.string().nullish(),
  expiresAt: z.array(z.string()).nullish(), estimated: z.boolean().nullish(),
});
export const envelope = z.object({
  schema: z.literal("tokenplan.limits.v1"),
  generatedAt: z.string(),
  providers: z.record(z.string(), z.object({
    displayName: z.string(), plan: z.string().nullish(),
    fetchedAt: z.string(), expiresAt: z.string(), stale: z.boolean(),
    resources: z.record(z.string(), resource),
  })),
  errors: z.array(z.object({ providerId: z.string(), message: z.string() })),
});
export type Usage = z.infer<typeof envelope>;
export type Resource = z.infer<typeof resource>;

export function period(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds % 604800 === 0) return `${seconds / 604800}w`;
  if (seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  return `${Math.ceil(seconds / 60)}m`;
}

export function metricTitle(key: string, resource: Resource) {
  const duration = period(resource.windowSeconds);
  // Preserve model-specific scope rather than turning every weekly window into "1w".
  const scope = /argon/i.test(key) ? "Argon" : /sonnet/i.test(key) ? "Sonnet" : /claude/i.test(key) ? "Claude" : null;
  return duration ? [scope, duration].filter(Boolean).join(" · ") : key.replaceAll("_", " ");
}

export function countdown(iso: string | null | undefined, now: number): string | null {
  if (!iso) return null;
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return null;
  const minutes = Math.max(0, Math.ceil((timestamp - now) / 60_000));
  if (minutes === 0) return "0m";
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60);
  if (days) return `${days}d${hours ? ` ${hours}h` : ""}`;
  if (hours) return `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
  return `${minutes}m`;
}

export function accountTitle(name: string) {
  return name.match(/[^\s()<>—]+@[^\s()<>]+?\.[a-z]{2,}(?=['’\s)]|$)/i)?.[0] ?? name;
}
