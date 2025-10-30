"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchDropdown } from "@/components/ui/search-dropdown"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { PostgrestError } from "@supabase/supabase-js"

type Process = {
  id: string
  name: string
}

type Member = {
  id: string
  name: string
  cedula: string
}

type Precinct = {
  id: string
  code: string
  name: string
  canton?: string
  parroquia?: string
  parish?: string
}

type AssignmentFormProps = {
  assignment?: {
    id: string
    process_id: string
    member_id: string
    member_type: "CPE" | "CDA"
    role: string | null
    cda_precinct_id: string | null
  }
  processes?: Process[]
  members?: Member[]
  precincts?: Precinct[]
}

const CPE_ROLE_OPTIONS = [
  { value: "Supervisor", label: "Supervisor" },
  { value: "Revisor", label: "Revisor de Firmas" },
  { value: "Digitador", label: "Digitador" },
  { value: "Archivador", label: "Archivo de Actas" },
  { value: "Receptor", label: "Receptor de Actas" },
  { value: "Operador", label: "Operador de Escáner" },
]

export function AssignmentForm({ assignment, processes = [], members = [], precincts = [] }: AssignmentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemberType, setSelectedMemberType] = useState<"CPE" | "CDA" | null>(
    assignment?.member_type || null,
  )
  const [formData, setFormData] = useState({
    process_id: assignment?.process_id || "",
    member_id: assignment?.member_id || "",
    role: assignment?.role || "",
    cda_precinct_id: assignment?.cda_precinct_id || "",
  })

  const handleMemberTypeChange = (type: "CPE" | "CDA") => {
    setSelectedMemberType(type)
    setFormData((prev) => ({
      ...prev,
      role: type === "CPE" ? prev.role : "",
      cda_precinct_id: type === "CDA" ? prev.cda_precinct_id : "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (selectedMemberType === "CPE" && !formData.role) {
      setError("Seleccione un rol válido para miembros CPE")
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Usuario no autenticado")
      setIsLoading(false)
      return
    }

    try {
      const assignmentData = {
        process_id: formData.process_id,
        member_id: formData.member_id,
        member_type: selectedMemberType,
        role: selectedMemberType === "CPE" ? formData.role || null : null,
        cda_precinct_id: selectedMemberType === "CDA" ? formData.cda_precinct_id : null,
      }

      const handleDatabaseError = (dbError: PostgrestError) => {
        if (dbError.code === "23505") {
          setError("Este miembro ya está asignado al proceso seleccionado.")
        } else {
          setError(dbError.message || "Error al guardar la asignación")
        }
      }

      let mutationError: PostgrestError | null = null

      if (assignment) {
        const { error } = await supabase
          .from("assignments")
          .update({
            ...assignmentData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", assignment.id)
        mutationError = error
      } else {
        const { error } = await supabase.from("assignments").insert([
          {
            ...assignmentData,
            created_by: user.id,
          },
        ])
        mutationError = error
      }

      if (mutationError) {
        handleDatabaseError(mutationError)
        return
      }

      router.push("/dashboard/assignments")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la asignación")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Proceso electoral</span>
          <Select
            value={formData.process_id}
            onValueChange={(value) => setFormData({ ...formData, process_id: value })}
            disabled={isLoading}
          >
            <SelectTrigger className="rounded-full">
              <SelectValue placeholder="Seleccione un proceso" />
            </SelectTrigger>
            <SelectContent>
              {processes.map((process) => (
                <SelectItem key={process.id} value={process.id}>
                  {process.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <SearchDropdown
            placeholder="Buscar miembro por nombre o cédula"
            searchPlaceholder="Escriba nombre o cédula…"
            emptyText="No se encontraron miembros"
            items={members.map((member) => ({
              value: member.id,
              label: member.name,
              description: member.cedula,
            }))}
            value={formData.member_id}
            onValueChange={(value) => setFormData({ ...formData, member_id: value })}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Tipo de miembro</span>
          <Select
            value={selectedMemberType ?? undefined}
            onValueChange={(value) => handleMemberTypeChange(value as "CPE" | "CDA")}
            disabled={isLoading}
          >
            <SelectTrigger className="rounded-full">
              <SelectValue placeholder="Seleccione el tipo de miembro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CPE">Miembro CPE</SelectItem>
              <SelectItem value="CDA">Miembro CDA</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedMemberType === "CPE" ? (
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Rol</span>
            <Select
              value={formData.role || undefined}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              disabled={isLoading}
            >
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="Seleccione el rol" />
              </SelectTrigger>
              <SelectContent>
                {CPE_ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {selectedMemberType === "CDA" ? (
          <SearchDropdown
            placeholder="Buscar recinto CDA"
            searchPlaceholder="Código, nombre, cantón o parroquia…"
            emptyText="No se encontraron recintos"
            items={precincts.map((precinct) => ({
              value: precinct.id,
              label: precinct.name,
              description: [precinct.code, precinct.canton, precinct.parroquia ?? precinct.parish]
                .filter(Boolean)
                .join(" · "),
            }))}
            value={formData.cda_precinct_id}
            onValueChange={(value) => setFormData({ ...formData, cda_precinct_id: value })}
            disabled={isLoading}
          />
        ) : null}
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading || !selectedMemberType}>
          {isLoading ? "Guardando..." : assignment ? "Actualizar Asignación" : "Crear Asignación"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
