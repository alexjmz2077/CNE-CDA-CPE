import { ASSIGNMENTS_BULK_IMPORT } from "./assignments"
import { CDA_PRECINCTS_BULK_IMPORT } from "./cda-precincts"
import { MEMBERS_BULK_IMPORT } from "./members"
import { PROCESSES_BULK_IMPORT } from "./processes"
import type { BulkImportModule, BulkImportModuleId } from "./types"

export const BULK_IMPORT_MODULES: Record<BulkImportModuleId, BulkImportModule<any>> = {
  members: MEMBERS_BULK_IMPORT,
  processes: PROCESSES_BULK_IMPORT,
  "cda-precincts": CDA_PRECINCTS_BULK_IMPORT,
  assignments: ASSIGNMENTS_BULK_IMPORT,
}

export function getBulkImportModule(
  id: BulkImportModuleId,
): BulkImportModule<any> {
  return BULK_IMPORT_MODULES[id]
}

export { ASSIGNMENTS_BULK_IMPORT, CDA_PRECINCTS_BULK_IMPORT, MEMBERS_BULK_IMPORT, PROCESSES_BULK_IMPORT }
export type { BulkImportModuleId }
export * from "./types"
