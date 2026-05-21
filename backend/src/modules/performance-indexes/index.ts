import { Module }                    from "@medusajs/framework/utils"
import PerformanceIndexesService     from "./service"

export const PERFORMANCE_INDEXES_MODULE = "performanceIndexes"

export default Module(PERFORMANCE_INDEXES_MODULE, {
  service: PerformanceIndexesService,
})
