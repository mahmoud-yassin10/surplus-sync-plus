import { createFileRoute } from "@tanstack/react-router";
import { ZodError } from "zod";
import { copilotProposalActionRequestSchema } from "../../../../../lib/copilot-contracts";
import { copilotErrorResponse, gatewayRejectProposal } from "../../../../../server/copilot-gateway";

export const Route = createFileRoute("/api/copilot/proposals/$proposalId/reject")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const body: unknown = await request.json();
          const parsed = copilotProposalActionRequestSchema.parse(body);
          return await gatewayRejectProposal(request, params.proposalId, parsed.snapshot);
        } catch (error) {
          if (error instanceof ZodError) {
            return Response.json(
              { error: { code: "BAD_REQUEST", message: "Invalid Copilot rejection request" } },
              { status: 400 },
            );
          }
          return copilotErrorResponse(error);
        }
      },
    },
  },
});
