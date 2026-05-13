import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export type AuthInput = z.infer<typeof authSchema>;

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
