"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import {
  CalendarDays,
  FileDown,
  FileText,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  Settings2,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import {
  buildObjectDescription,
  getActaDateParts,
  getTodayInputValue,
  parseDateInput,
} from "@/lib/acta-utils"
import { getAssignmentRoleLabel } from "@/lib/assignment-utils"
import {
  exportActasPDF,
  type ActaItem,
  type ActaRecipient,
} from "@/lib/export-actas"

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

type ItemDraft = ActaItem & { id: string }

type ActaGenerationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignments: Assignment[]
  processName?: string
  processImageUrl?: string | null
}

const ITEM_STATUSES = ["Bueno", "Regular", "Malo", "Nuevo", "Usado"]

const DEFAULT_INSTITUTIONAL_NAME = "ING. DEYBI RIVERA"
const DEFAULT_INSTITUTIONAL_POSITION =
  "Responsable de la Unidad Provincial de Seguridad Informática y Proyectos Tecnológicos Electorales, Encargado"

const MAX_SIGNATURE_FILE_SIZE = 10 * 1024 * 1024
const SIGNATURE_MAX_WIDTH = 1200
const SIGNATURE_MAX_HEIGHT = 600

let rowCounter = 0

function createRowId() {
  rowCounter += 1
  return `acta-row-${Date.now()}-${rowCounter}`
}

function createItem(description = "PETO", quantity = 1, status = "Bueno"): ItemDraft {
  return {
    id: createRowId(),
    description,
    quantity,
    status,
  }
}

function getFullName(member: Assignment["members"]) {
  return [member.second_name, member.name].filter(Boolean).join(" ")
}

function getDefaultCargo(assignment: Assignment) {
  const roleLabel = getAssignmentRoleLabel(assignment.member_type, assignment.role)
  if (roleLabel && roleLabel !== "Sin rol") {
    return roleLabel
  }
  return assignment.member_type === "CDA" ? "Miembro del CDA" : "Miembro del CPE"
}

async function loadSignatureImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("La firma debe ser una imagen PNG, JPG o WEBP.")
  }

  if (file.size > MAX_SIGNATURE_FILE_SIZE) {
    throw new Error("La imagen de la firma no debe superar los 10 MB.")
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error("No se pudo leer la imagen de la firma."))
      element.src = objectUrl
    })

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("La imagen de la firma no es válida.")
    }

    const scale = Math.min(
      1,
      SIGNATURE_MAX_WIDTH / image.naturalWidth,
      SIGNATURE_MAX_HEIGHT / image.naturalHeight,
    )
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("No se pudo procesar la imagen de la firma.")
    }

    context.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL("image/png")
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function buildRecipients(assignments: Assignment[], items: ItemDraft[]): ActaRecipient[] {
  return assignments.map((assignment) => ({
    name: getFullName(assignment.members),
    cedula: assignment.members.cedula,
    cargo: getDefaultCargo(assignment),
    memberType: assignment.member_type,
    role: getAssignmentRoleLabel(assignment.member_type, assignment.role),
    items: items.map((item) => ({
      description: item.description.trim(),
      quantity: Math.max(1, Math.round(item.quantity)),
      status: item.status.trim() || "Bueno",
    })),
  }))
}

type ItemsEditorProps = {
  items: ItemDraft[]
  onChange: (items: ItemDraft[]) => void
  addLabel?: string
}

function ItemsEditor({ items, onChange, addLabel = "Agregar ítem" }: ItemsEditorProps) {
  const updateItem = (id: string, patch: Partial<ItemDraft>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    if (items.length <= 1) return
    onChange(items.filter((item) => item.id !== id))
  }

  const addItem = () => {
    onChange([...items, createItem("", 1, "Bueno")])
  }

  return (
    <div className="space-y-2">
      <div className="hidden gap-2 px-1 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_84px_128px_36px]">
        <span>Descripción</span>
        <span>Cantidad</span>
        <span>Estado</span>
        <span className="sr-only">Acciones</span>
      </div>

      {items.map((item, index) => (
        <div
          key={item.id}
          className="grid gap-2 rounded-md border bg-background/60 p-2 md:grid-cols-[minmax(0,1fr)_84px_128px_36px] md:items-center md:border-0 md:bg-transparent md:p-0"
        >
          <Input
            value={item.description}
            onChange={(event) => updateItem(item.id, { description: event.target.value })}
            placeholder={index === 0 ? "Ej.: PETO, equipo de cómputo, material electoral..." : "Descripción del ítem"}
            aria-label={`Descripción del ítem ${index + 1}`}
          />
          <Input
            type="number"
            min={1}
            step={1}
            value={item.quantity}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10)
              updateItem(item.id, { quantity: Number.isNaN(parsed) ? 0 : parsed })
            }}
            onBlur={() => {
              if (!item.quantity || item.quantity < 1) {
                updateItem(item.id, { quantity: 1 })
              }
            }}
            aria-label={`Cantidad del ítem ${index + 1}`}
          />
          <select
            value={item.status}
            onChange={(event) => updateItem(item.id, { status: event.target.value })}
            aria-label={`Estado del ítem ${index + 1}`}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            {ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeItem(item.id)}
            disabled={items.length <= 1}
            aria-label={`Quitar ítem ${index + 1}`}
            className="justify-self-start text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  )
}

export function ActaGenerationDialog({
  open,
  onOpenChange,
  assignments,
  processName,
  processImageUrl,
}: ActaGenerationDialogProps) {
  const wasOpen = useRef(false)
  const errorRef = useRef<HTMLDivElement | null>(null)
  const signatureInputRef = useRef<HTMLInputElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isProcessingSignature, setIsProcessingSignature] = useState(false)
  const [institutionalSignature, setInstitutionalSignature] = useState<string | null>(null)
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>(() =>
    assignments.map((assignment) => assignment.id),
  )
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ItemDraft[]>([createItem()])
  const [form, setForm] = useState({
    city: "Macas",
    date: getTodayInputValue(),
    object: "PETO",
    institutionalSignerName: DEFAULT_INSTITUTIONAL_NAME,
    institutionalSignerPosition: DEFAULT_INSTITUTIONAL_POSITION,
  })

  useEffect(() => {
    if (open && !wasOpen.current) {
      setItems([createItem("PETO", 1, "Bueno")])
      setSelectedAssignmentIds(assignments.map((assignment) => assignment.id))
      setError(null)
      setIsProcessingSignature(false)
      setInstitutionalSignature(null)
      if (signatureInputRef.current) {
        signatureInputRef.current.value = ""
      }
      setForm({
        city: "Macas",
        date: getTodayInputValue(),
        object: "PETO",
        institutionalSignerName: DEFAULT_INSTITUTIONAL_NAME,
        institutionalSignerPosition: DEFAULT_INSTITUTIONAL_POSITION,
      })
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

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSignatureChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError(null)
    setIsProcessingSignature(true)

    try {
      const signatureDataUrl = await loadSignatureImage(file)
      setInstitutionalSignature(signatureDataUrl)
    } catch (signatureError) {
      console.error("Error al cargar la firma:", signatureError)
      setError(
        signatureError instanceof Error
          ? signatureError.message
          : "No se pudo cargar la imagen de la firma.",
      )
    } finally {
      setIsProcessingSignature(false)
    }
  }

  const removeSignature = () => {
    setInstitutionalSignature(null)
    if (signatureInputRef.current) {
      signatureInputRef.current.value = ""
    }
  }

  const validate = (): string | null => {
    if (!form.object.trim()) return "Ingrese el objeto o los objetos de la entrega."
    if (!form.city.trim()) return "Ingrese la ciudad donde se suscribe el acta."
    if (!parseDateInput(form.date)) return "Seleccione una fecha válida para el acta."
    if (!form.institutionalSignerName.trim()) return "Ingrese el nombre del encargado institucional."
    if (!form.institutionalSignerPosition.trim()) return "Ingrese el cargo del encargado institucional."
    if (!assignments.length) return "No hay registros filtrados para generar actas."
    if (!selectedAssignments.length) return "Seleccione al menos un acta para generar."
    if (!items.length) return "Agregue al menos un ítem de entrega."

    const invalidItem = items.find(
      (item) => !item.description.trim() || !Number.isFinite(item.quantity) || item.quantity < 1,
    )
    if (invalidItem) {
      return "Complete la descripción y la cantidad de todos los ítems."
    }

    return null
  }

  const handleGenerate = async () => {
    if (isProcessingSignature) return

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      await exportActasPDF({
        city: form.city.trim(),
        date: form.date,
        object: form.object.trim(),
        processName,
        processImageUrl,
        institutionalSignerName: form.institutionalSignerName.trim(),
        institutionalSignerPosition: form.institutionalSignerPosition.trim(),
        institutionalSignatureImage: institutionalSignature,
        recipients: buildRecipients(selectedAssignments, items),
      })

      onOpenChange(false)
    } catch (generationError) {
      console.error("Error al generar las actas:", generationError)
      setError(
        generationError instanceof Error
          ? generationError.message
          : "No se pudieron generar las actas. Intente nuevamente.",
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const datePreview = getActaDateParts(form.date)
  const objectDescription = buildObjectDescription(form.object, processName)
  const totalSigners = selectedAssignments.length

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [error])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isGenerating) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            Generar actas de entrega - recepción
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
            Seleccione abajo de quiénes generar el acta; por defecto están todos marcados. Se
            generará un solo PDF con un acta por página.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Datos generales</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acta-object">Objeto de la entrega</Label>
              <Textarea
                id="acta-object"
                value={form.object}
                onChange={(event) => updateForm("object", event.target.value)}
                placeholder="Ej.: PETO, equipos de cómputo, material electoral..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Escriba solo el objeto o los objetos. El proceso electoral se agrega
                automáticamente: “{objectDescription || "[objeto]"}”.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="acta-city" className="gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Ciudad
                </Label>
                <Input
                  id="acta-city"
                  value={form.city}
                  onChange={(event) => updateForm("city", event.target.value)}
                  placeholder="Macas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acta-date" className="gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Fecha del acta
                </Label>
                <Input
                  id="acta-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => updateForm("date", event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {datePreview
                    ? `Se redactará: “a los ${datePreview.long}”.`
                    : "Seleccione una fecha válida."}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acta-institutional-name" className="gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                Encargado institucional
              </Label>
              <Input
                id="acta-institutional-name"
                value={form.institutionalSignerName}
                onChange={(event) => updateForm("institutionalSignerName", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="acta-institutional-position">Cargo del encargado institucional</Label>
              <Input
                id="acta-institutional-position"
                value={form.institutionalSignerPosition}
                onChange={(event) =>
                  updateForm("institutionalSignerPosition", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Firma del que entrega conforme</Label>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                aria-label="Seleccionar imagen de la firma del que entrega conforme"
                onChange={handleSignatureChange}
              />

              {institutionalSignature ? (
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-20 w-44 shrink-0 items-center justify-center rounded-md border bg-white p-2">
                      <img
                        src={institutionalSignature}
                        alt="Vista previa de la firma del encargado"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium">Firma cargada</p>
                      <p className="text-xs text-muted-foreground">
                        Se colocará justo debajo de “ENTREGA CONFORME”.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => signatureInputRef.current?.click()}
                      disabled={isProcessingSignature}
                    >
                      Cambiar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={removeSignature}
                      disabled={isProcessingSignature}
                      aria-label="Quitar firma"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Suba una imagen de la firma. Se mostrará debajo de “ENTREGA CONFORME”.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureInputRef.current?.click()}
                    disabled={isProcessingSignature}
                    className="gap-2"
                  >
                    {isProcessingSignature ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isProcessingSignature ? "Procesando..." : "Subir firma"}
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Formatos permitidos: PNG, JPG o WEBP. La imagen se ajusta automáticamente al
                espacio de la firma.
              </p>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">Actas a generar</h3>
                <p className="text-xs text-muted-foreground">
                  Seleccione de quiénes se generará el acta. Por defecto están seleccionados todos
                  los registros filtrados en la tabla.
                </p>
              </div>
            </div>

            <AssignmentSelectionList
              items={selectionItems}
              selectedIds={selectedAssignmentIds}
              onSelectedIdsChange={setSelectedAssignmentIds}
              disabled={isGenerating}
              emptyMessage="No hay registros filtrados para generar actas."
              listClassName="max-h-64"
            />
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">Detalle de los ítems a entregar</h3>
                <p className="text-xs text-muted-foreground">
                  Descripción, cantidad y estado. El estado predeterminado es “Bueno”.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Ítems de todas las actas</p>
                <p className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "ítem" : "ítems"}
                </p>
              </div>
              <ItemsEditor items={items} onChange={setItems} />
            </div>

            <p className="text-xs text-muted-foreground">
              Los nombres, cédulas y cargos de los firmantes se toman automáticamente de los
              registros filtrados.
            </p>
          </section>

          {error ? (
            <div
              ref={errorRef}
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 items-center justify-between border-t px-6 py-4 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {totalSigners > 0
              ? `Se generará 1 PDF con ${totalSigners} ${
                  totalSigners === 1 ? "acta" : "actas"
                } (una por página).`
              : assignments.length > 0
                ? "Seleccione al menos un acta para generar."
                : "No hay registros filtrados para generar actas."}
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
              disabled={isGenerating || isProcessingSignature || totalSigners === 0}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {isGenerating
                ? "Generando actas..."
                : `Generar ${totalSigners || ""} ${
                    totalSigners === 1 ? "acta" : "actas"
                  }`.replace(/\s+/g, " ").trim()}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
