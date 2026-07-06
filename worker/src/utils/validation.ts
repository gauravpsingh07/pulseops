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

// Monitors may only target regular web endpoints.
const monitorUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);

        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Monitor URL must use http or https." }
  );

const DISCORD_WEBHOOK_PREFIXES = [
  "https://discord.com/api/webhooks/",
  "https://discordapp.com/api/webhooks/"
];

// Accepts a Discord webhook URL, or null/empty string to clear the webhook.
// The worker POSTs incident payloads to this URL, so it is restricted to
// Discord's webhook endpoints instead of arbitrary destinations.
const webhookUrlSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = (value ?? "").trim();

    return trimmed === "" ? null : trimmed;
  })
  .refine(
    (value) =>
      value === undefined ||
      value === null ||
      DISCORD_WEBHOOK_PREFIXES.some((prefix) => value.startsWith(prefix)),
    { message: "Alert webhook must be a Discord webhook URL." }
  );

export const createMonitorSchema = z
  .object({
    name: z.string().trim().min(1),
    type: z.enum(["http", "heartbeat"]).default("http"),
    url: monitorUrlSchema.optional(),
    method: monitorMethodSchema.default("GET"),
    interval_minutes: monitorIntervalSchema.default(5),
    timeout_ms: z.number().int().min(1000).max(30000).default(10000),
    heartbeat_grace_minutes: z.number().int().min(1).max(1440).default(5),
    alert_webhook_url: webhookUrlSchema,
    is_public: z.boolean().default(false)
  })
  .superRefine((value, ctx) => {
    if (value.type === "http" && !value.url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Monitor URL is required for http monitors.",
        path: ["url"]
      });
    }
  });

export const updateMonitorSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    url: monitorUrlSchema.optional(),
    method: monitorMethodSchema.optional(),
    interval_minutes: monitorIntervalSchema.optional(),
    timeout_ms: z.number().int().min(1000).max(30000).optional(),
    heartbeat_grace_minutes: z.number().int().min(1).max(1440).optional(),
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
