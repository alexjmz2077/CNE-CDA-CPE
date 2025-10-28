"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

type Process = {
  id: string
  name: string
}

type Member = {
  id: string
  name: string
  cedula: string
  member_type: "CPE" | "CDA"
}

type AssignmentFormProps = {
  assignment?: {
    id: string
    process_id: string
    member_id: string
    role: string | null
    precinct: string | null
    members: {
      member_type: "CPE" | "CDA"
    }
  }
  processes: Process[]
  members: Member[]
}

export function AssignmentForm({ assignment, processes, members }: AssignmentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemberType, setSelectedMemberType] = useState<"CPE" | "CDA" | null>(
    assignment?.members.member_type || null,
  )
  const [formData, setFormData] = useState({
    process_id: assignment?.process_id || "",
    member_id: assignment?.member_id || "",
    role: assignment?.role || "",
    precinct: assignment?.precinct || "",
  })

  useEffect(() => {
    if (formData.member_id) {
      const member = members.find((m) => m.id === formData.member_id)
      if (member) {
        setSelectedMemberType(member.member_type)
      }
    }
  }, [formData.member_id, members])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

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
        role: selectedMemberType === "CPE" ? formData.role : null,
        precinct: selectedMemberType === "CDA" ? formData.precinct : null,
      }

      if (assignment) {
        // Update existing assignment
        const { error } = await supabase
          .from("assignments")
          .update({
            ...assignmentData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", assignment.id)

        if (error) throw error
      } else {
        // Create new assignment
        const { error } = await supabase.from("assignments").insert({
          ...assignmentData,
          created_by: user.id,
        })

        if (error) throw error
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
      <div className="space-y-2">
        <Label htmlFor="process_id">Proceso Electoral</Label>
        <Select
          value={formData.process_id}
          onValueChange={(value) => setFormData({ ...formData, process_id: value })}
          disabled={isLoading}
          required
        >
          <SelectTrigger id="process_id">
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

      <div className="space-y-2">
        <Label htmlFor="member_id">Miembro</Label>
        <Select
          value={formData.member_id}
          onValueChange={(value) => setFormData({ ...formData, member_id: value })}
          disabled={isLoading}
          required
        >
          <SelectTrigger id="member_id">
            <SelectValue placeholder="Seleccione un miembro" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name} ({member.cedula}) - {member.member_type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedMemberType === "CPE" && (
        <div className="space-y-2">
          <Label htmlFor="role">Rol</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value })}
            disabled={isLoading}
            required
          >
            <SelectTrigger id="role">
              <SelectValue placeholder="Seleccione un rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Supervisor">Supervisor</SelectItem>
              <SelectItem value="Revisor">Revisor</SelectItem>
              <SelectItem value="Digitador">Digitador</SelectItem>
              <SelectItem value="Archivador">Archivador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedMemberType === "CDA" && (
        <div className="space-y-2">
          <Label htmlFor="precinct">Recinto Electoral</Label>
          <Input
            id="precinct"
            placeholder="Ej: Recinto 001 - Escuela Central"
            required
            value={formData.precinct}
            onChange={(e) => setFormData({ ...formData, precinct: e.target.value })}
            disabled={isLoading}
          />
        </div>
      )}

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
