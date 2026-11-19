import { randomUUID } from "crypto";
import { clampLimit } from "@/lib/timing";
import type { Job } from "@/lib/store";

export type JobInput = Pick<Job, "title" | "description" | "timeLimitMinutes" | "requirements">;

export function parseJobInput(body: unknown): JobInput | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const title = String(b.title ?? "").trim().slice(0, 120);
  const reqs: unknown[] = Array.isArray(b.requirements) ? b.requirements.slice(0, 30) : [];
  const requirements = reqs
    .map((r) => r as Record<string, unknown>)
    .filter((r) => String(r?.name ?? "").trim())
    .map((r) => ({
      id: randomUUID(),
      name: String(r.name).trim().slice(0, 120),
      description: r.description ? String(r.description).slice(0, 500) : undefined,
      tier: ([1, 2, 3].includes(Number(r.tier)) ? Number(r.tier) : 2) as 1 | 2 | 3,
      weight: Number(r.weight) > 0 ? Math.min(100, Number(r.weight)) : 1,
      isRequired: Boolean(r.isRequired),
      minScore: Number.isFinite(Number(r.minScore)) ? Math.min(100, Math.max(0, Number(r.minScore))) : 50,
    }));
  if (!title || requirements.length === 0) return null;
  return {
    title,
    description: b.description ? String(b.description).slice(0, 1000) : undefined,
    timeLimitMinutes: clampLimit(b.timeLimitMinutes),
    requirements,
  };
}
