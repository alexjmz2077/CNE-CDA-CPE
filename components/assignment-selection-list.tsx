"use client"

import { useId } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export type AssignmentSelectionItem = {
  id: string
  name: string
  cedula: string
  memberType: string
  role: string
  precinct?: string | null
}

type AssignmentSelectionListProps = {
  items: AssignmentSelectionItem[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  disabled?: boolean
  emptyMessage?: string
  listClassName?: string
}

export function AssignmentSelectionList({
  items,
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
  emptyMessage = "No hay registros para seleccionar.",
  listClassName,
}: AssignmentSelectionListProps) {
  const idPrefix = useId()
  const selectedIdSet = new Set(selectedIds)
  const allSelected = items.length > 0 && items.every((item) => selectedIdSet.has(item.id))
  const selectedCount = items.filter((item) => selectedIdSet.has(item.id)).length

  const toggleItem = (id: string, checked: boolean) => {
    if (checked) {
      if (selectedIdSet.has(id)) return
      onSelectedIdsChange([...selectedIds, id])
      return
    }

    onSelectedIdsChange(selectedIds.filter((selectedId) => selectedId !== id))
  }

  return (
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
            onClick={() => onSelectedIdsChange(items.map((item) => item.id))}
            disabled={disabled || allSelected}
          >
            Seleccionar todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectedIdsChange([])}
            disabled={disabled || selectedCount === 0}
          >
            Quitar todos
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "max-h-72 space-y-1 overflow-y-auto rounded-md border p-1",
          listClassName,
        )}
      >
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          items.map((item) => {
            const checkboxId = `${idPrefix}-${item.id}`
            const checked = selectedIdSet.has(item.id)

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60",
                  checked && "bg-muted/40",
                  disabled && "opacity-60",
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onCheckedChange={(value) => toggleItem(item.id, value === true)}
                  disabled={disabled}
                  className="mt-0.5"
                />
                <label
                  htmlFor={checkboxId}
                  className={cn(
                    "min-w-0 flex-1 cursor-pointer select-none",
                    disabled && "cursor-not-allowed",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <Badge variant={item.memberType === "CPE" ? "default" : "secondary"}>
                      {item.memberType}
                    </Badge>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    C.I. {item.cedula || "—"}
                    {item.role && item.role !== "Sin rol" ? ` · ${item.role}` : ""}
                    {item.precinct ? ` · ${item.precinct}` : ""}
                  </span>
                </label>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
