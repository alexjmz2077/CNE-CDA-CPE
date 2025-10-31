"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AssignmentFilters } from "@/components/assignment-filters"
import { AssignmentTable } from "@/components/assignment-table"
import { ExportButtons } from "@/components/export-buttons"

type Process = {
  id: string
  name: string
}

type MemberTypeFilter = "ALL" | "CPE" | "CDA"

type Assignment = {
  id: string
  process_id: string
  member_id: string
  member_type: "CPE" | "CDA"
  role: string | null
  cda_precinct_id: string | null
  cda_precincts?: {
    id: string
    name: string
    canton: string | null
    parish: string | null
  } | null
  created_at: string
  electoral_processes: {
    id: string
    name: string
  }
  members: {
    id: string
    name: string
    cedula: string
  }
}

type AssignmentsContentProps = {
  processes: Process[]
  selectedProcessId?: string
  assignments: Assignment[]
  assignmentsError?: string | null
  initialMemberType?: MemberTypeFilter
}

export function AssignmentsContent({
  processes,
  selectedProcessId,
  assignments,
  assignmentsError,
  initialMemberType = "ALL",
}: AssignmentsContentProps) {
  const [memberType, setMemberType] = useState<MemberTypeFilter>(initialMemberType)

  const filteredAssignments = useMemo(() => {
    if (memberType === "ALL") {
      return assignments
    }
    return assignments.filter((assignment) => assignment.member_type === memberType)
  }, [assignments, memberType])

  const selectedProcess = processes.find((p) => p.id === selectedProcessId)

  const exportData = useMemo(
    () =>
      filteredAssignments.map((assignment) => ({
        Miembro: assignment.members?.name ?? "-",
        Cédula: assignment.members?.cedula ?? "-",
        Tipo: assignment.member_type,
        "Rol/Recinto":
          assignment.member_type === "CPE"
            ? assignment.role || "-"
            : `Recinto: ${assignment.cda_precincts?.name ?? "-"} (${[
                assignment.cda_precincts?.canton,
                assignment.cda_precincts?.parish,
              ]
                .filter(Boolean)
                .join(" / ") || "-"})`,
      })),
    [filteredAssignments],
  )

  const pdfTitle = selectedProcess
    ? `Lista de Asignaciones: ${selectedProcess.name}`
    : "Lista de Asignaciones"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asignaciones</h1>
          <p className="text-muted-foreground">Gestión de asignaciones de miembros a procesos</p>
        </div>
        <div className="flex gap-2">
          {selectedProcessId ? (
            <ExportButtons data={exportData} filename="asignaciones" title={pdfTitle} />
          ) : null}
          <Link href="/dashboard/assignments/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Asignación
            </Button>
          </Link>
        </div>
      </div>

      <AssignmentFilters
        processes={processes}
        selectedProcessId={selectedProcessId}
        memberType={memberType}
        onMemberTypeChange={setMemberType}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Asignaciones</CardTitle>
          <CardDescription>Todas las asignaciones registradas en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentsError ? (
            <div className="text-sm text-destructive">Error al cargar las asignaciones</div>
          ) : !selectedProcessId ? (
            <div className="text-sm text-muted-foreground">
              Seleccione un proceso electoral para ver las asignaciones.
            </div>
          ) : (
            <AssignmentTable assignments={filteredAssignments} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}