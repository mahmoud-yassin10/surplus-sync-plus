import { createFileRoute } from "@tanstack/react-router";
import { gatewayForecastRequestSchema } from "../../lib/forecast-gateway-types";
import { ForecastGatewayError, gatewayGetForecast } from "../../server/forecast-gateway";

export const Route = createFileRoute("/api/forecast")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: unknown = await request.json();
          const parsed = gatewayForecastRequestSchema.parse(body);
          const result = await gatewayGetForecast(parsed.date, parsed.schoolId);
          return Response.json(result);
        } catch (error) {
          if (error instanceof ForecastGatewayError) {
            return Response.json(
              {
                error: { code: error.code, message: error.message },
                provenance: error.provenance,
              },
              { status: error.status },
            );
          }
          return Response.json(
            { error: { code: "BAD_REQUEST", message: "Invalid forecast request" } },
            { status: 400 },
          );
        }
      },
    },
  },
});
