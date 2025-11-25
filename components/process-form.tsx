"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Upload, X } from "lucide-react"

type ProcessFormProps = {
  process?: {
    id: string
    name: string
    start_date: string
    end_date: string
    image_url?: string
  }
}

export function ProcessForm({ process }: ProcessFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(process?.image_url || null)
  const [shouldDeleteImage, setShouldDeleteImage] = useState(false)
  const [formData, setFormData] = useState({
    name: process?.name || "",
    start_date: process?.start_date || "",
    end_date: process?.end_date || "",
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Por favor seleccione un archivo de imagen válido')
        return
      }
      
      // Validate file size (25MB max)
      if (file.size > 25 * 1024 * 1024) {
        setError('La imagen no debe superar los 25MB')
        return
      }

      setImageFile(file)
      setShouldDeleteImage(false)
      setError(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setShouldDeleteImage(true)
    
    // Limpiar el input file
    const fileInput = document.getElementById('image') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const uploadImage = async (supabase: any, userId: string): Promise<string | null> => {
    if (!imageFile) return null

    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('process-images')
      .upload(filePath, imageFile)

    if (uploadError) {
      throw uploadError
    }

    const { data: { publicUrl } } = supabase.storage
      .from('process-images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const deleteOldImage = async (supabase: any, imageUrl: string) => {
    try {
      const urlParts = imageUrl.split('process-images/')
      if (urlParts.length > 1) {
        const filePath = urlParts[1]
        await supabase.storage
          .from('process-images')
          .remove([filePath])
      }
    } catch (err) {
      console.error('Error deleting old image:', err)
    }
  }

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
      let imageUrl = process?.image_url || null

      // Si el usuario marcó para eliminar la imagen
      if (shouldDeleteImage && process?.image_url) {
        await deleteOldImage(supabase, process.image_url)
        imageUrl = null
      }
      // Si hay una nueva imagen para subir
      else if (imageFile) {
        // Eliminar imagen anterior si existe
        if (process?.image_url) {
          await deleteOldImage(supabase, process.image_url)
        }
        
        const uploadedUrl = await uploadImage(supabase, user.id)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      if (process) {
        const { error } = await supabase
          .from("electoral_processes")
          .update({
            name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", process.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("electoral_processes").insert({
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          image_url: imageUrl,
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

      <div className="space-y-2">
        <Label htmlFor="image">Imagen del Proceso (Opcional)</Label>
        <div className="space-y-4">
          {imagePreview && (
            <div className="relative w-full max-w-md">
              <div className="relative h-48 w-full overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="h-full w-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute right-2 top-2"
                onClick={removeImage}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isLoading}
              className="hidden"
            />
            <Label
              htmlFor="image"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {imagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
            </Label>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF hasta 25MB
            </p>
          </div>
        </div>
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
