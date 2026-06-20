import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { copilotMessageRequestSchema } from "../../../lib/copilot-contracts";
import { copilotErrorResponse, gatewaySendMessage } from "../../../server/copilot-gateway";

export const Route = createFileRoute("/api/copilot/message")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: unknown = await request.json();
          const parsed = copilotMessageRequestSchema.parse(body);
          return await gatewaySendMessage(request, parsed.message, parsed.snapshot);
        } catch (error) {
          if (error instanceof ZodError) {
            return Response.json(
              { error: { code: "BAD_REQUEST", message: "Invalid Copilot message request" } },
              { status: 400 },
            );
          }
          return copilotErrorResponse(error);
        }
      },
    },
  },
});
