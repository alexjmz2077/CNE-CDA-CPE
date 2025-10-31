"use client"

import { Button } from "@/components/ui/button"

type CDAPrecinctFiltersProps = {
  statusFilter: "ALL" | "ENABLED" | "DISABLED"
  onStatusChange: (value: "ALL" | "ENABLED" | "DISABLED") => void
}

export function CDAPrecinctFilters({ statusFilter, onStatusChange }: CDAPrecinctFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2">
        <Button
          variant={statusFilter === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusChange("ALL")}
        >
          Todos
        </Button>
        <Button
          variant={statusFilter === "ENABLED" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusChange("ENABLED")}
        >
          Habilitados
        </Button>
        <Button
          variant={statusFilter === "DISABLED" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusChange("DISABLED")}
        >
          No habilitados
        </Button>
      </div>
    </div>
  )
}