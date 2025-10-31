"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CANTON_PARISHES: Record<string, string[]> = {
  Morona: ["Macas", "9 de Octubre", "General Proaño", "San Isidro", "Sinaí", "Cuchaentza", "Río Blanco", "Zuñac"],
  Gualaquiza: ["Gualaquiza", "Bomboiza", "El Ideal", "General Proaño", "Mercedes del Salado", "Nueva Tarqui", "San Miguel de Cuyes", "Amazanga"],
  "Limón Indanza": ["Gral. Leonidas Plaza Gutiérrez", "Indanza", "San Antonio", "Santa Rosa de Limón", "Pan de Azúcar", "San Miguel de Conchay"],
  Santiago: ["Santiago de Méndez", "San Luis de El Upano", "Copal", "Patuca", "Tayuza", "Chinimpi", "San Ildefonso de Limón"],
  Sucúa: ["Sucúa", "Huambi", "Asunción", "Santa Marianita de Jesús", "Logroño Grande", "Yaupi"],
  Palora: ["Palora", "Sangay", "Arapicos", "Cumandá", "Diez de Agosto", "Metentino", "Palmira"],
  Huamboya: ["Huamboya", "Chiguaza", "Sucúa"],
  "San Juan Bosco": ["San Juan Bosco", "San Carlos de Limón", "Santiago de Panaza", "San Jacinto de Wakambeis", "Pan de Azúcar"],
  Taisha: ["Taisha", "Huasaga", "Macuma", "Tuutinentza", "Pumpuentsa"],
  Logroño: ["Logroño", "Shimpis", "Yaupi", "San Agustín"],
  "Pablo Sexto": ["Pablo Sexto"],
  Tiwintza: ["Santiago", "San José de Morona", "Santiago", "Winza"],
  "Sevilla Don Bosco": ["Sevilla Don Bosco"],
}

type Precinct = {
  id: string
  code: string
  name: string
  canton: string
  parish: string
  address: string
  is_enabled: boolean
}

type Contact = {
  id?: string
  rector_name: string
  rector_phone: string | null
  rector_email: string | null
  keys_name: string | null
  keys_phone: string | null
}

type Props = {
  precinct?: Precinct
  contact?: Contact | null
}

export function CDAPrecinctForm({ precinct, contact }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: precinct?.code ?? "",
    name: precinct?.name ?? "",
    canton: precinct?.canton ?? "Morona",
    parish:
      precinct?.parish ??
      (precinct?.canton && CANTON_PARISHES[precinct.canton]
        ? CANTON_PARISHES[precinct.canton][0]
        : CANTON_PARISHES.Morona[0]),
    address: precinct?.address ?? "",
    is_enabled: precinct?.is_enabled ?? true,
    rector_name: contact?.rector_name ?? "",
    rector_phone: contact?.rector_phone ?? "",
    rector_email: contact?.rector_email ?? "",
    keys_name: contact?.keys_name ?? "",
    keys_phone: contact?.keys_phone ?? "",
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      if (precinct) {
        const { error: precinctError } = await supabase
          .from("cda_precincts")
          .update({
            code: formData.code,
            name: formData.name,
            canton: formData.canton,
            parish: formData.parish,
            address: formData.address,
            is_enabled: formData.is_enabled,
            updated_at: new Date().toISOString(),
          })
          .eq("id", precinct.id)

        if (precinctError) throw new Error(precinctError.message)

        const { error: contactError } = await supabase.from("cda_precinct_contacts").upsert({
          id: contact?.id,
          precinct_id: precinct.id,
          rector_name: formData.rector_name,
          rector_phone: formData.rector_phone || null,
          rector_email: formData.rector_email || null,
          keys_name: formData.keys_name || null,
          keys_phone: formData.keys_phone || null,
          updated_at: new Date().toISOString(),
        })

        if (contactError) throw new Error(contactError.message)
      } else {
        const { data: inserted, error: precinctError } = await supabase
          .from("cda_precincts")
          .insert({
            code: formData.code,
            name: formData.name,
            canton: formData.canton,
            parish: formData.parish,
            address: formData.address,
            is_enabled: formData.is_enabled,
          })
          .select()
          .single()

        if (precinctError) throw new Error(precinctError.message)

        if (!inserted) throw new Error("No se pudo obtener el CDA creado")

        const { error: contactError } = await supabase.from("cda_precinct_contacts").insert({
          precinct_id: inserted.id,
          rector_name: formData.rector_name,
          rector_phone: formData.rector_phone || null,
          rector_email: formData.rector_email || null,
          keys_name: formData.keys_name || null,
          keys_phone: formData.keys_phone || null,
        })

        if (contactError) throw new Error(contactError.message)
      }

      router.push("/dashboard/cda-precincts")
      router.refresh()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Error al guardar el CDA")
    } finally {
      setIsLoading(false)
    }
  }

  const parishOptions = formData.canton ? CANTON_PARISHES[formData.canton] ?? [] : []

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Código del CDA</Label>
          <Input
            id="code"
            required
            value={formData.code}
            onChange={(event) => setFormData({ ...formData, code: event.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del CDA</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(event) => setFormData({ ...formData, name: event.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="canton">Cantón</Label>
          <Select
            value={formData.canton}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                canton: value,
                parish: (CANTON_PARISHES[value] ?? [])[0] ?? "",
              }))
            }
            disabled={isLoading}
          >
            <SelectTrigger id="canton">
              <SelectValue placeholder="Seleccione un cantón" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(CANTON_PARISHES).map((canton) => (
                <SelectItem key={canton} value={canton}>
                  {canton}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="parish">Parroquia</Label>
          <Select
            value={formData.parish}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                parish: value,
              }))
            }
            disabled={isLoading || parishOptions.length === 0}
          >
            <SelectTrigger id="parish">
              <SelectValue placeholder="Seleccione una parroquia" />
            </SelectTrigger>
            <SelectContent>
              {parishOptions.map((parish) => (
                <SelectItem key={parish} value={parish}>
                  {parish}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Dirección del CDA</Label>
          <Textarea
            id="address"
            
            value={formData.address}
            onChange={(event) => setFormData({ ...formData, address: event.target.value })}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="is_enabled"
          checked={formData.is_enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
          disabled={isLoading}
        />
        <Label htmlFor="is_enabled" className="font-normal">
          CDA habilitado
        </Label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <h3 className="text-sm font-medium text-muted-foreground">Información del rector</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rector_name">Nombre</Label>
          <Input
            id="rector_name"
            
            value={formData.rector_name}
            onChange={(event) => setFormData({ ...formData, rector_name: event.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rector_phone">Teléfono</Label>
          <Input
            id="rector_phone"
            value={formData.rector_phone ?? ""}
            onChange={(event) => setFormData({ ...formData, rector_phone: event.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rector_email">Email</Label>
          <Input
            id="rector_email"
            type="email"
            value={formData.rector_email ?? ""}
            onChange={(event) => setFormData({ ...formData, rector_email: event.target.value })}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <h3 className="text-sm font-medium text-muted-foreground">Encargado de llaves</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="keys_name">Nombre</Label>
          <Input
            id="keys_name"
            value={formData.keys_name ?? ""}
            onChange={(event) => setFormData({ ...formData, keys_name: event.target.value })}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="keys_phone">Teléfono</Label>
          <Input
            id="keys_phone"
            value={formData.keys_phone ?? ""}
            onChange={(event) => setFormData({ ...formData, keys_phone: event.target.value })}
            disabled={isLoading}
          />
        </div>
      </div>

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : precinct ? "Actualizar CDA" : "Crear CDA"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}