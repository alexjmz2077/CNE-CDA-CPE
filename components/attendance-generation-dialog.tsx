"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, ClipboardCheck, FileDown, Loader2, Users } from "lucide-react"

import {
  AssignmentSelectionList,
  type AssignmentSelectionItem,
} from "@/components/assignment-selection-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getTodayInputValue, parseDateInput } from "@/lib/acta-utils"
import { getAssignmentRoleLabel } from "@/lib/assignment-utils"
import {
  exportAttendancePDF,
  type AttendanceMemberType,
} from "@/lib/export-attendance"

type Assignment = {
  id: string
  member_type: "CPE" | "CDA"
  role: string | null
  cda_precincts?: {
    id: string
    name: string
    canton: string | null
    parish: string | null
  } | null
  members: {
    id: string
    name: string
    second_name: string | null
    cedula: string
    phone: string | null
  }
}

type AttendanceGenerationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignments: Assignment[]
  memberType: AttendanceMemberType
  processName?: string
  processImageUrl?: string | null
}

function getFullName(member: Assignment["members"]) {
  return [member.second_name, member.name].filter(Boolean).join(" ")
}

export function AttendanceGenerationDialog({
  open,
  onOpenChange,
  assignments,
  memberType,
  processName,
  processImageUrl,
}: AttendanceGenerationDialogProps) {
  const wasOpen = useRef(false)
  const [date, setDate] = useState(() => getTodayInputValue())
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>(() =>
    assignments.map((assignment) => assignment.id),
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && !wasOpen.current) {
      setSelectedAssignmentIds(assignments.map((assignment) => assignment.id))
      setDate(getTodayInputValue())
      setError(null)
      setIsGenerating(false)
    }

    wasOpen.current = open
  }, [open, assignments])

  const selectionItems = useMemo<AssignmentSelectionItem[]>(
    () =>
      assignments.map((assignment) => {
        const precinct =
          assignment.member_type === "CDA"
            ? [
                assignment.cda_precincts?.name,
                assignment.cda_precincts?.canton,
                assignment.cda_precincts?.parish,
              ]
                .filter(Boolean)
                .join(" / ") || null
            : null

        return {
          id: assignment.id,
          name: getFullName(assignment.members),
          cedula: assignment.members.cedula,
          memberType: assignment.member_type,
          role: getAssignmentRoleLabel(assignment.member_type, assignment.role),
          precinct,
        }
      }),
    [assignments],
  )

  const selectedAssignments = useMemo(() => {
    const selectedIdSet = new Set(selectedAssignmentIds)
    return assignments.filter((assignment) => selectedIdSet.has(assignment.id))
  }, [assignments, selectedAssignmentIds])

  const handleGenerate = async () => {
    const parsedDate = parseDateInput(date)
    if (!parsedDate) {
      setError("Seleccione una fecha válida para el registro de asistencia.")
      return
    }

    if (selectedAssignments.length === 0) {
      setError("Seleccione al menos un registro para incluir en el PDF.")
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      await exportAttendancePDF({
        memberType,
        date: parsedDate,
        members: selectedAssignments.map((assignment) => ({
          name: getFullName(assignment.members),
        })),
        processName,
        processImageUrl,
      })

      onOpenChange(false)
    } catch (generationError) {
      console.error("Error al generar el registro de asistencia:", generationError)
      setError(
        generationError instanceof Error
          ? generationError.message
          : "No se pudo generar el registro de asistencia. Intente nuevamente.",
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const datePreview = parseDateInput(date)
  const totalMembers = selectedAssignments.length

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isGenerating) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            Generar registro de asistencia {memberType}
          </DialogTitle>
          <DialogDescription>
            {assignments.length === 1 ? (
              <>
                Hay <strong>1</strong> registro filtrado en la tabla.
              </>
            ) : (
              <>
                Hay <strong>{assignments.length}</strong> registros filtrados en la tabla.
              </>
            )}{" "}
            Elija la fecha y marque los registros que irán en el PDF; por defecto están todos
            seleccionados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-2">
            <Label htmlFor="attendance-date" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Fecha del registro
            </Label>
            <Input
              id="attendance-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              {datePreview
                ? "Esta fecha aparecerá como “DÍA:” en el encabezado del PDF."
                : "Seleccione una fecha válida."}
            </p>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">Registros a incluir</h3>
                <p className="text-xs text-muted-foreground">
                  Marque los registros que se imprimirán en el PDF. Por defecto están
                  seleccionados todos los registros filtrados en la tabla.
                </p>
              </div>
            </div>

            <AssignmentSelectionList
              items={selectionItems}
              selectedIds={selectedAssignmentIds}
              onSelectedIdsChange={setSelectedAssignmentIds}
              disabled={isGenerating}
              emptyMessage="No hay registros filtrados para generar el PDF."
              listClassName="max-h-72"
            />
          </section>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 items-center justify-between border-t px-6 py-4 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {totalMembers > 0
              ? `Se generará 1 PDF con ${totalMembers} ${
                  totalMembers === 1 ? "registro" : "registros"
                }.`
              : assignments.length > 0
                ? "Seleccione al menos un registro para generar."
                : "No hay registros filtrados para generar el PDF."}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || totalMembers === 0 || !datePreview}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {isGenerating ? "Generando..." : "Descargar PDF"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
