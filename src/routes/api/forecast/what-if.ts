import { createFileRoute } from "@tanstack/react-router";
import { gatewayWhatIfRequestSchema } from "../../../lib/forecast-gateway-types";
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
          const result = await gatewayGetAttendanceWhatIf(parsed.date, parsed.schoolId);
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
            { error: { code: "BAD_REQUEST", message: "Invalid what-if request" } },
            { status: 400 },
          );
        }
      },
    },
  },
});
