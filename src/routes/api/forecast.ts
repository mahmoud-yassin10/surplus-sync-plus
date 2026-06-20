import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { gatewayForecastRequestSchema, mlForecastFeaturesInputSchema } from "../../lib/forecast-gateway-types";
import { ForecastGatewayError, gatewayGetForecast } from "../../server/forecast-gateway";

export const Route = createFileRoute("/api/forecast")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: unknown = await request.json();
          const parsed = gatewayForecastRequestSchema.parse(body);
          const features = parsed.features
            ? mlForecastFeaturesInputSchema.parse(parsed.features)
            : undefined;
          const result = await gatewayGetForecast(parsed.date, parsed.schoolId, features);
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
          if (error instanceof ZodError) {
            return Response.json(
              { error: { code: "BAD_REQUEST", message: "Invalid forecast request" } },
              { status: 400 },
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
