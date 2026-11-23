"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Loader2, Tags } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { KitLabelItem } from "@/lib/export-kit-labels"

export type KitLabelProcess = {
  id: string
  name: string
  image_url?: string | null
}

type KitLabelsExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: KitLabelItem[]
  processes: KitLabelProcess[]
  isExporting: boolean
  onExport: (selectedIds: string[], processId: string) => Promise<void>
}

export function KitLabelsExportDialog({
  open,
  onOpenChange,
  items,
  processes,
  isExporting,
  onExport,
}: KitLabelsExportDialogProps) {
  const idPrefix = useId()
  const wasOpen = useRef(false)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => items.map((item) => item.id))
  const [selectedProcessId, setSelectedProcessId] = useState<string>(() => processes[0]?.id ?? "")

  useEffect(() => {
    if (open && !wasOpen.current) {
      setSelectedIds(items.map((item) => item.id))
      setSelectedProcessId(processes[0]?.id ?? "")
    }

    wasOpen.current = open
  }, [open, items, processes])

  const selectedIdSet = new Set(selectedIds)
  const selectedCount = items.filter((item) => selectedIdSet.has(item.id)).length
  const allSelected = items.length > 0 && selectedCount === items.length
  const selectedProcess = processes.find((process) => process.id === selectedProcessId)

  const toggleItem = (id: string, checked: boolean) => {
    if (checked) {
      if (selectedIdSet.has(id)) return
      setSelectedIds([...selectedIds, id])
      return
    }

    setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
  }

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
              <Tags className="h-4 w-4" />
            </span>
            Etiquetas Kits
          </DialogTitle>
          <DialogDescription>
            Seleccione el proceso electoral y los CDA para los que desea generar las etiquetas.
            Por defecto están seleccionados todos los recintos filtrados en la tabla.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-2">
            <label htmlFor={`${idPrefix}-process`} className="text-sm font-medium">
              Proceso Electoral
            </label>
            <div className="flex items-center gap-3">
              <select
                id={`${idPrefix}-process`}
                value={selectedProcessId}
                onChange={(event) => setSelectedProcessId(event.target.value)}
                disabled={isExporting || processes.length === 0}
                className="h-10 w-full min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processes.length === 0 ? (
                  <option value="">No hay procesos electorales registrados</option>
                ) : (
                  processes.map((process) => (
                    <option key={process.id} value={process.id}>
                      {process.name}
                    </option>
                  ))
                )}
              </select>
              {selectedProcess?.image_url ? (
                <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProcess.image_url}
                    alt={`Logo de ${selectedProcess.name}`}
                    className="max-h-full max-w-full object-contain"
                  />
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              El logo del proceso seleccionado se colocará en la esquina superior derecha de cada
              etiqueta.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">
                {selectedCount} de {items.length} seleccionados
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(items.map((item) => item.id))}
                  disabled={isExporting || allSelected}
                >
                  Seleccionar todos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  disabled={isExporting || selectedCount === 0}
                >
                  Quitar todos
                </Button>
              </div>
            </div>

            <div className="max-h-[42vh] space-y-1 overflow-y-auto rounded-md border p-1">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No hay recintos filtrados para generar etiquetas.
                </p>
              ) : (
                items.map((item) => {
                  const checkboxId = `${idPrefix}-${item.id}`
                  const checked = selectedIdSet.has(item.id)
                  const location = [item.canton, item.parish].filter(Boolean).join(" / ")

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60 ${
                        checked ? "bg-muted/40" : ""
                      } ${isExporting ? "opacity-60" : ""}`}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={checked}
                        onCheckedChange={(value) => toggleItem(item.id, value === true)}
                        disabled={isExporting}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={checkboxId}
                        className={`min-w-0 flex-1 cursor-pointer select-none ${
                          isExporting ? "cursor-not-allowed" : ""
                        }`}
                      >
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {location || "Sin cantón ni parroquia registrados"}
                        </span>
                      </label>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 items-center justify-between border-t px-6 py-4 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {selectedCount > 0
              ? `Se generará 1 PDF con ${selectedCount} ${
                  selectedCount === 1 ? "etiqueta" : "etiquetas"
                } (4 por hoja).`
              : "Seleccione al menos un recinto."}
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
              onClick={() => onExport(selectedIds, selectedProcessId)}
              disabled={isExporting || selectedCount === 0 || !selectedProcessId}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Tags className="h-4 w-4" />
              )}
              {isExporting ? "Generando etiquetas..." : "Generar etiquetas"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
