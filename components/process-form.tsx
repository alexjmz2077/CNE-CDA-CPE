"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

type ProcessFormProps = {
  process?: {
    id: string
    name: string
    start_date: string
    end_date: string
  }
}

export function ProcessForm({ process }: ProcessFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: process?.name || "",
    start_date: process?.start_date || "",
    end_date: process?.end_date || "",
  })

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
      if (process) {
        // Update existing process
        const { error } = await supabase
          .from("electoral_processes")
          .update({
            name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", process.id)

        if (error) throw error
      } else {
        // Create new process
        const { error } = await supabase.from("electoral_processes").insert({
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          created_by: user.id,
        })

        if (error) throw error
      }

      router.push("/dashboard/processes")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el proceso")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Proceso</Label>
        <Input
          id="name"
          placeholder="Ej: Elecciones Presidenciales 2025"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date">Fecha de Inicio</Label>
          <Input
            id="start_date"
            type="date"
            required
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha de Fin</Label>
          <Input
            id="end_date"
            type="date"
            required
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            disabled={isLoading}
          />
        </div>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : process ? "Actualizar Proceso" : "Crear Proceso"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
