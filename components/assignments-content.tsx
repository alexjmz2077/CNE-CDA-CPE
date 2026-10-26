"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FileText, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ActaGenerationDialog } from "@/components/acta-generation-dialog"
import { AssignmentFilters } from "@/components/assignment-filters"
import { AssignmentTable } from "@/components/assignment-table"
import { ExportButtons } from "@/components/export-buttons"
import { BulkImportButton } from "@/components/bulk-import/bulk-import-button"

type Process = {
  id: string
  name: string
  image_url?: string | null
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
    second_name: string | null
    cedula: string
    phone: string | null
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
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>(assignments)
  const [actasOpen, setActasOpen] = useState(false)

  const typeFilteredAssignments = useMemo(() => {
    if (memberType === "ALL") {
      return assignments
    }
    return assignments.filter((assignment) => assignment.member_type === memberType)
  }, [assignments, memberType])

  const selectedProcess = processes.find((p) => p.id === selectedProcessId)

  const pdfTitle = selectedProcess
    ? `Lista de Asignaciones: ${selectedProcess.name}`
    : "Lista de Asignaciones"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asignaciones</h1>
          <p className="text-muted-foreground">Gestión de asignaciones de miembros a procesos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkImportButton moduleId="assignments" />
          <Button
            variant="outline"
            className="gap-2 bg-transparent"
            disabled={!selectedProcessId || filteredAssignments.length === 0}
            onClick={() => setActasOpen(true)}
            title="Generar actas de entrega-recepción con los registros filtrados"
          >
            <FileText className="h-4 w-4" />
            Actas
            {filteredAssignments.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {filteredAssignments.length}
              </span>
            ) : null}
          </Button>
          {selectedProcessId ? (
            <ExportButtons
              data={filteredAssignments}
              filename={`asignaciones_${selectedProcess?.name || 'proceso'}`}
              title={`Asignaciones - ${selectedProcess?.name || 'Proceso Electoral'}`}
              enableCredentials={true}
              processImageUrl={selectedProcess?.image_url}
            />
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
            <AssignmentTable
              assignments={typeFilteredAssignments}
              onFilteredAssignmentsChange={setFilteredAssignments}
            />
          )}
        </CardContent>
      </Card>

      <ActaGenerationDialog
        open={actasOpen}
        onOpenChange={setActasOpen}
        assignments={filteredAssignments}
        processName={selectedProcess?.name}
        processImageUrl={selectedProcess?.image_url}
      />
    </div>
  )
}