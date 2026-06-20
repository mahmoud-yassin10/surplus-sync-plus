import { createFileRoute } from "@tanstack/react-router";
import { copilotErrorResponse, gatewayReset } from "../../../server/copilot-gateway";

export const Route = createFileRoute("/api/copilot/reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await gatewayReset(request);
        } catch (error) {
          return copilotErrorResponse(error);
        }
      },
    },
  },
});
