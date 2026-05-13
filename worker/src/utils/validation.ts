import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export type AuthInput = z.infer<typeof authSchema>;

const monitorMethodSchema = z.enum(["GET", "HEAD"]);
const monitorIntervalSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(30),
  z.literal(60)
]);

const webhookUrlSchema = z
  .string()
  .trim()
  .url()
  .optional()
  .transform((value) => value || undefined);

export const createMonitorSchema = z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().url(),
  method: monitorMethodSchema.default("GET"),
  interval_minutes: monitorIntervalSchema.default(5),
  timeout_ms: z.number().int().min(1000).max(30000).default(10000),
  alert_webhook_url: webhookUrlSchema,
  is_public: z.boolean().default(false)
});

export const updateMonitorSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    url: z.string().trim().url().optional(),
    method: monitorMethodSchema.optional(),
    interval_minutes: monitorIntervalSchema.optional(),
    timeout_ms: z.number().int().min(1000).max(30000).optional(),
    alert_webhook_url: webhookUrlSchema,
    is_public: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one monitor field must be provided."
  });

export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getValidationMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}
