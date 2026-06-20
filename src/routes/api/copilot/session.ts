import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { copilotSessionRequestSchema } from "../../../lib/copilot-contracts";
import { copilotErrorResponse, gatewayEnsureSession } from "../../../server/copilot-gateway";

export const Route = createFileRoute("/api/copilot/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: unknown = await request.json();
          const parsed = copilotSessionRequestSchema.parse(body);
          return await gatewayEnsureSession(request, parsed.snapshot);
        } catch (error) {
          if (error instanceof ZodError) {
            return Response.json(
              { error: { code: "BAD_REQUEST", message: "Invalid Copilot session request" } },
              { status: 400 },
            );
          }
          return copilotErrorResponse(error);
        }
      },
    },
  },
});
