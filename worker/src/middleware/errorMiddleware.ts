import { errorResponse } from "../utils/response";

export async function withErrorHandling(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    console.error("Unhandled request error", error);

    return errorResponse("INTERNAL_SERVER_ERROR", "Something went wrong.", 500);
  }
}
