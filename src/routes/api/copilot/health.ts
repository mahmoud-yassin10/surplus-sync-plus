import { createFileRoute } from "@tanstack/react-router";
import { copilotErrorResponse, gatewayHealth } from "../../../server/copilot-gateway";

export const Route = createFileRoute("/api/copilot/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return await gatewayHealth();
        } catch (error) {
          return copilotErrorResponse(error);
        }
      },
    },
  },
});
