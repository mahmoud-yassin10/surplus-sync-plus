import { createFileRoute } from "@tanstack/react-router";
import { copilotErrorResponse, gatewayGetState } from "../../../server/copilot-gateway";

export const Route = createFileRoute("/api/copilot/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await gatewayGetState(request);
        } catch (error) {
          return copilotErrorResponse(error);
        }
      },
    },
  },
});
