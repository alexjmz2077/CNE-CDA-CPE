"use client"

import { useEffect, useRef, useState } from "react"
import { IdCard, Loader2 } from "lucide-react"

import { AssignmentSelectionList, type AssignmentSelectionItem } from "@/components/assignment-selection-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type CredentialsExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: AssignmentSelectionItem[]
  isExporting: boolean
  onExport: (selectedIds: string[]) => Promise<void>
}

export function CredentialsExportDialog({
  open,
  onOpenChange,
  items,
  isExporting,
  onExport,
}: CredentialsExportDialogProps) {
  const wasOpen = useRef(false)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => items.map((item) => item.id))

  useEffect(() => {
    if (open && !wasOpen.current) {
      setSelectedIds(items.map((item) => item.id))
    }

    wasOpen.current = open
  }, [open, items])

  const selectedCount = items.filter((item) => selectedIds.includes(item.id)).length

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isExporting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <IdCard className="h-4 w-4" />
            </span>
            Exportar credenciales
          </DialogTitle>
          <DialogDescription>
            Seleccione de quiénes desea generar la credencial. Por defecto están seleccionados
            todos los registros filtrados en la tabla.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AssignmentSelectionList
            items={items}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            disabled={isExporting}
            emptyMessage="No hay asignaciones filtradas para exportar."
            listClassName="max-h-[50vh]"
          />
        </div>

        <DialogFooter className="shrink-0 items-center justify-between border-t px-6 py-4 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedCount > 0
              ? `Se generará 1 PDF con ${selectedCount} ${
                  selectedCount === 1 ? "credencial" : "credenciales"
                }.`
              : "Seleccione al menos una credencial."}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => onExport(selectedIds)}
              disabled={isExporting || selectedCount === 0}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IdCard className="h-4 w-4" />
              )}
              {isExporting ? "Generando credenciales..." : "Generar credenciales"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
