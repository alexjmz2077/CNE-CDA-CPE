"use client"

import { Button } from "@/components/ui/button"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

type Process = {
  id: string
  name: string
}

type AssignmentFiltersProps = {
  processes: Process[]
  selectedProcessId?: string
  memberType: "ALL" | "CPE" | "CDA"
  onMemberTypeChange: (value: "ALL" | "CPE" | "CDA") => void
}

export function AssignmentFilters({ processes, selectedProcessId, memberType, onMemberTypeChange }: AssignmentFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentType = memberType

  const updateParams = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const handleProcessChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams("processId", event.target.value || undefined)
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-1">
        <label htmlFor="process-select" className="text-sm font-medium">
          Proceso Electoral
        </label>
        <select
          id="process-select"
          value={selectedProcessId ?? ""}
          onChange={handleProcessChange}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">Seleccione un proceso</option>
          {processes.map((process) => (
            <option key={process.id} value={process.id}>
              {process.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Tipo</span>
        <div className="flex gap-2">
          <Button
            variant={currentType === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => onMemberTypeChange("ALL")}
          >
            Todas
          </Button>
          <Button
            variant={currentType === "CPE" ? "default" : "outline"}
            size="sm"
            onClick={() => onMemberTypeChange("CPE")}
          >
            CPE
          </Button>
          <Button
            variant={currentType === "CDA" ? "default" : "outline"}
            size="sm"
            onClick={() => onMemberTypeChange("CDA")}
          >
            CDA
          </Button>
        </div>
      </div>
    </div>
  )
}