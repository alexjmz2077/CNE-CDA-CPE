"use client"

import { FileSpreadsheet } from "lucide-react"
import { getBulkImportModule } from "@/lib/bulk-import"
import type { BulkImportModuleId } from "@/lib/bulk-import/types"
import { BulkImportButton } from "./bulk-import-button"

type BulkImportCalloutProps = {
  moduleId: BulkImportModuleId
  onImported?: () => void
}

export function BulkImportCallout({
  moduleId,
  onImported,
}: BulkImportCalloutProps) {
  const bulkImportModule = getBulkImportModule(moduleId)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">¿Tiene muchos registros?</p>
          <p className="text-xs text-muted-foreground">
            Cárguelos desde Excel con la estructura guiada de{" "}
            {bulkImportModule.entityName}. Descargue la plantilla y obtenga el
            detalle de cada fila al finalizar.
          </p>
        </div>
      </div>
      <BulkImportButton
        moduleId={moduleId}
        onImported={onImported}
        label="Carga masiva"
        className="shrink-0"
      />
    </div>
  )
}
