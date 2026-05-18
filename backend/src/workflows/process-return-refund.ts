import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { fetchReturnRefundDataStep } from "./steps/fetch-return-refund-data.js"
import { calculateRefundBreakdownStep } from "./steps/calculate-refund-breakdown.js"
import { executePayTrRefundStep } from "./steps/execute-paytr-refund.js"

export interface ProcessReturnRefundInput {
  return_shipment_id: string
  order_return_request_id: string
}

export const processReturnRefundWorkflow = createWorkflow(
  "process-return-refund",
  (input: ProcessReturnRefundInput) => {
    const data = fetchReturnRefundDataStep(input)
    const breakdown = calculateRefundBreakdownStep(data)
    const result = executePayTrRefundStep({
      return_shipment_id: input.return_shipment_id,
      breakdown,
    })
    return new WorkflowResponse(result)
  }
)
