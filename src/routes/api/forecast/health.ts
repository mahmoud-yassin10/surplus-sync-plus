import { createFileRoute } from "@tanstack/react-router";
import { gatewayGetHealth } from "../../../server/forecast-gateway";

export const Route = createFileRoute("/api/forecast/health")({
  server: {
    handlers: {
      GET: async () => {
        const health = await gatewayGetHealth();
        const status = health.status === "ok" ? 200 : health.status === "degraded" ? 200 : 503;
        return Response.json(health, { status });
      },
    },
  },
});
