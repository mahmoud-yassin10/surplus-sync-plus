import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { gatewayWhatIfRequestSchema, mlForecastFeaturesInputSchema } from "../../../lib/forecast-gateway-types";
import { ForecastGatewayError, gatewayGetAttendanceWhatIf } from "../../../server/forecast-gateway";

export const Route = createFileRoute("/api/forecast/what-if")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: unknown = await request.json();
          const parsed = gatewayWhatIfRequestSchema.parse(body);
          if (parsed.scenario !== "attendance-trip-cancelled") {
            return Response.json(
              { error: { code: "BAD_REQUEST", message: "Unsupported what-if scenario" } },
              { status: 400 },
            );
          }
          const features = parsed.features
            ? mlForecastFeaturesInputSchema.parse(parsed.features)
            : undefined;
          const result = await gatewayGetAttendanceWhatIf(
            parsed.date,
            parsed.schoolId,
            features,
            parsed.changes,
          );
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
              { error: { code: "BAD_REQUEST", message: "Invalid what-if request" } },
              { status: 400 },
            );
          }
          return Response.json(
            { error: { code: "BAD_REQUEST", message: "Invalid what-if request" } },
            { status: 400 },
          );
        }
      },
    },
  },
});
