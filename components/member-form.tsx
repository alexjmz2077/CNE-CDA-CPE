"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

type MemberFormProps = {
  member?: {
    id: string
    cedula: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
    member_type: "CPE" | "CDA"
  }
}

export function MemberForm({ member }: MemberFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    cedula: member?.cedula || "",
    name: member?.name || "",
    phone: member?.phone || "",
    email: member?.email || "",
    address: member?.address || "",
    member_type: member?.member_type || "CPE",
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
      if (member) {
        // Update existing member
        const { error } = await supabase
          .from("members")
          .update({
            cedula: formData.cedula,
            name: formData.name,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            member_type: formData.member_type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", member.id)

        if (error) throw error
      } else {
        // Create new member
        const { error } = await supabase.from("members").insert({
          cedula: formData.cedula,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          member_type: formData.member_type,
          created_by: user.id,
        })

        if (error) throw error
      }

      router.push("/dashboard/members")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el miembro")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cedula">Cédula</Label>
          <Input
            id="cedula"
            placeholder="1234567890"
            required
            value={formData.cedula}
            onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member_type">Tipo de Miembro</Label>
          <Select
            value={formData.member_type}
            onValueChange={(value) => setFormData({ ...formData, member_type: value as "CPE" | "CDA" })}
            disabled={isLoading}
          >
            <SelectTrigger id="member_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CPE">CPE</SelectItem>
              <SelectItem value="CDA">CDA</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre Completo</Label>
        <Input
          id="name"
          placeholder="Juan Pérez García"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="0987654321"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="ejemplo@correo.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Textarea
          id="address"
          placeholder="Dirección completa"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          disabled={isLoading}
          rows={3}
        />
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : member ? "Actualizar Miembro" : "Registrar Miembro"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
