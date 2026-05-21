import { MedusaService } from "@medusajs/framework/utils"

/**
 * Shell service required by the MedusaJS module system.
 * This module owns no entity models — its sole purpose is to carry
 * database performance migrations (indexes) that target tables created
 * by third-party plugins outside this codebase.
 */
class PerformanceIndexesService extends MedusaService({}) {}

export default PerformanceIndexesService
