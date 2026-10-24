"use client"

import { useEffect, useRef, useState } from "react"
import {
  CalendarDays,
  Copy,
  FileDown,
  FileText,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  Settings2,
  Trash2,
  UserRound,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getActaDateParts, getTodayInputValue, parseDateInput } from "@/lib/acta-utils"
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

type RecipientDraft = {
  assignmentId: string
  name: string
  cedula: string
  memberType: "CPE" | "CDA"
  role: string
  cargo: string
  precinct: string | null
  items: ItemDraft[]
}

type ActaGenerationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignments: Assignment[]
  processName?: string
}

const ITEM_STATUSES = ["Bueno", "Regular", "Malo", "Nuevo", "Usado"]

const DEFAULT_INSTITUTIONAL_NAME = "Ing. Deybi Rivera"
const DEFAULT_INSTITUTIONAL_POSITION =
  "Responsable de la Unidad Provincial de Seguridad Informática y Proyectos Tecnológicos Electorales, Encargado"

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

function buildDefaultObject(processName?: string) {
  const name = processName?.trim()
  if (!name) return "PETO"
  if (/^elecciones/i.test(name)) return `PETO para las ${name}`
  if (/^(proceso|consejo|referéndum|referendum)/i.test(name)) return `PETO para el ${name}`
  return `PETO para ${name}`
}

function buildRecipients(assignments: Assignment[], templateItems: ItemDraft[]): RecipientDraft[] {
  return assignments.map((assignment) => {
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
      assignmentId: assignment.id,
      name: getFullName(assignment.members),
      cedula: assignment.members.cedula,
      memberType: assignment.member_type,
      role: getAssignmentRoleLabel(assignment.member_type, assignment.role),
      cargo: getDefaultCargo(assignment),
      precinct,
      items: templateItems.map((item) => ({ ...item, id: createRowId() })),
    }
  })
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
}: ActaGenerationDialogProps) {
  const wasOpen = useRef(false)
  const errorRef = useRef<HTMLDivElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customizeItems, setCustomizeItems] = useState(false)
  const [items, setItems] = useState<ItemDraft[]>([createItem()])
  const [recipients, setRecipients] = useState<RecipientDraft[]>([])
  const [form, setForm] = useState({
    city: "Macas",
    date: getTodayInputValue(),
    object: buildDefaultObject(processName),
    institutionalSignerName: DEFAULT_INSTITUTIONAL_NAME,
    institutionalSignerPosition: DEFAULT_INSTITUTIONAL_POSITION,
    institutionalSignerCedula: "",
  })

  useEffect(() => {
    if (open && !wasOpen.current) {
      const templateItems = [createItem("PETO", 1, "Bueno")]
      setItems(templateItems)
      setRecipients(buildRecipients(assignments, templateItems))
      setCustomizeItems(false)
      setError(null)
      setForm({
        city: "Macas",
        date: getTodayInputValue(),
        object: buildDefaultObject(processName),
        institutionalSignerName: DEFAULT_INSTITUTIONAL_NAME,
        institutionalSignerPosition: DEFAULT_INSTITUTIONAL_POSITION,
        institutionalSignerCedula: "",
      })
    }

    wasOpen.current = open
  }, [open, assignments, processName])

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const updateRecipientCargo = (assignmentId: string, cargo: string) => {
    setRecipients((current) =>
      current.map((recipient) =>
        recipient.assignmentId === assignmentId ? { ...recipient, cargo } : recipient,
      ),
    )
  }

  const updateRecipientItems = (assignmentId: string, nextItems: ItemDraft[]) => {
    setRecipients((current) =>
      current.map((recipient) =>
        recipient.assignmentId === assignmentId ? { ...recipient, items: nextItems } : recipient,
      ),
    )
  }

  const handleCustomizeChange = (checked: boolean) => {
    setCustomizeItems(checked)
    if (checked) {
      setRecipients((current) =>
        current.map((recipient) => ({
          ...recipient,
          items: items.map((item) => ({ ...item, id: createRowId() })),
        })),
      )
    }
  }

  const copyGeneralItemsToAll = () => {
    setRecipients((current) =>
      current.map((recipient) => ({
        ...recipient,
        items: items.map((item) => ({ ...item, id: createRowId() })),
      })),
    )
  }

  const validate = (): string | null => {
    if (!form.object.trim()) return "Ingrese el motivo u objeto de la entrega."
    if (!form.city.trim()) return "Ingrese la ciudad donde se suscribe el acta."
    if (!parseDateInput(form.date)) return "Seleccione una fecha válida para el acta."
    if (!form.institutionalSignerName.trim()) return "Ingrese el nombre del encargado institucional."
    if (!form.institutionalSignerPosition.trim()) return "Ingrese el cargo del encargado institucional."
    if (!recipients.length) return "No hay registros filtrados para generar actas."
    if (!items.length) return "Agregue al menos un ítem de entrega."

    const invalidItem = items.find(
      (item) => !item.description.trim() || !Number.isFinite(item.quantity) || item.quantity < 1,
    )
    if (invalidItem) {
      return "Complete la descripción y la cantidad de todos los ítems generales."
    }

    for (const recipient of recipients) {
      if (!recipient.cargo.trim()) {
        return `Ingrese el cargo del firmante ${recipient.name}.`
      }

      if (customizeItems) {
        const invalidRecipientItem = recipient.items.find(
          (item) =>
            !item.description.trim() || !Number.isFinite(item.quantity) || item.quantity < 1,
        )
        if (invalidRecipientItem) {
          return `Complete los ítems personalizados del acta de ${recipient.name}.`
        }
      }
    }

    return null
  }

  const handleGenerate = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const recipientsData: ActaRecipient[] = recipients.map((recipient) => ({
        name: recipient.name,
        cedula: recipient.cedula,
        cargo: recipient.cargo.trim(),
        memberType: recipient.memberType,
        role: recipient.role,
        precinct: recipient.precinct,
        items: (customizeItems ? recipient.items : items).map((item) => ({
          description: item.description.trim(),
          quantity: Math.max(1, Math.round(item.quantity)),
          status: item.status.trim() || "Bueno",
        })),
      }))

      await exportActasPDF({
        city: form.city.trim(),
        date: form.date,
        object: form.object.trim(),
        processName,
        institutionalSignerName: form.institutionalSignerName.trim(),
        institutionalSignerPosition: form.institutionalSignerPosition.trim(),
        institutionalSignerCedula: form.institutionalSignerCedula.trim(),
        recipients: recipientsData,
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
  const totalSigners = recipients.length

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
                Se usará únicamente el <strong>1</strong> registro filtrado en la tabla.
              </>
            ) : (
              <>
                Se usarán únicamente los <strong>{assignments.length}</strong> registros filtrados
                en la tabla.
              </>
            )}{" "}
            Se generará un solo PDF con un acta por página.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Datos generales</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acta-object">Motivo / Objeto de la entrega</Label>
              <Textarea
                id="acta-object"
                value={form.object}
                onChange={(event) => updateForm("object", event.target.value)}
                placeholder="Ej.: PETO para las Elecciones Seccionales y CPCCS 2027"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Se insertará en la frase: “se realiza el Acta Entrega Recepción de{" "}
                {form.object.trim() || "[objeto]"}”.
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

            <div className="grid gap-4 md:grid-cols-2">
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
                <Label htmlFor="acta-institutional-cedula">C.I. del encargado (opcional)</Label>
                <Input
                  id="acta-institutional-cedula"
                  value={form.institutionalSignerCedula}
                  onChange={(event) => updateForm("institutionalSignerCedula", event.target.value)}
                  placeholder="Se deja en blanco si no aplica"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="acta-institutional-position">Cargo del encargado institucional</Label>
                <Input
                  id="acta-institutional-position"
                  value={form.institutionalSignerPosition}
                  onChange={(event) =>
                    updateForm("institutionalSignerPosition", event.target.value)
                  }
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="font-semibold">Detalle de los ítems a entregar</h3>
                  <p className="text-xs text-muted-foreground">
                    Descripción, cantidad y estado. El estado predeterminado es “Bueno”.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <Switch
                  id="customize-items"
                  checked={customizeItems}
                  onCheckedChange={handleCustomizeChange}
                />
                <Label htmlFor="customize-items" className="cursor-pointer text-sm font-normal">
                  Personalizar ítems por acta
                </Label>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {customizeItems ? "Ítems generales (plantilla)" : "Ítems de todas las actas"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "ítem" : "ítems"}
                </p>
              </div>
              <ItemsEditor items={items} onChange={setItems} />
              {customizeItems ? (
                <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Al activar la personalización, cada acta partió de esta lista. Puede ajustarla
                    individualmente abajo.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyGeneralItemsToAll}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar a todas las actas
                  </Button>
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-semibold">
                  Firmantes por acta ({totalSigners}{" "}
                  {totalSigners === 1 ? "registro" : "registros"})
                </h3>
                <p className="text-xs text-muted-foreground">
                  El cargo se completa automáticamente según el rol de la asignación y puede
                  editarlo.
                </p>
              </div>
            </div>

            {recipients.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay registros filtrados. Ajuste los filtros de la tabla para continuar.
              </div>
            ) : (
              <div className="space-y-3">
                {recipients.map((recipient, index) => (
                  <div key={recipient.assignmentId} className="space-y-3 rounded-lg border p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {index + 1}.
                          </span>
                          <p className="font-medium">{recipient.name}</p>
                          <Badge variant={recipient.memberType === "CPE" ? "default" : "secondary"}>
                            {recipient.memberType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          C.I. {recipient.cedula} · {recipient.role}
                          {recipient.precinct ? ` · ${recipient.precinct}` : ""}
                        </p>
                      </div>

                      <div className="w-full space-y-1.5 md:w-80">
                        <Label
                          htmlFor={`recipient-cargo-${recipient.assignmentId}`}
                          className="text-xs"
                        >
                          Cargo del firmante
                        </Label>
                        <Input
                          id={`recipient-cargo-${recipient.assignmentId}`}
                          value={recipient.cargo}
                          onChange={(event) =>
                            updateRecipientCargo(recipient.assignmentId, event.target.value)
                          }
                          placeholder="Cargo que se mostrará en el acta"
                        />
                      </div>
                    </div>

                    {customizeItems ? (
                      <details className="group rounded-md border bg-background/70">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
                          <span className="flex items-center gap-2">
                            <ListChecks className="h-4 w-4 text-primary" />
                            Ítems de esta acta ({recipient.items.length})
                          </span>
                          <span className="text-xs text-muted-foreground group-open:hidden">
                            Editar
                          </span>
                          <span className="hidden text-xs text-muted-foreground group-open:inline">
                            Ocultar
                          </span>
                        </summary>
                        <div className="border-t p-3">
                          <ItemsEditor
                            items={recipient.items}
                            onChange={(nextItems) =>
                              updateRecipientItems(recipient.assignmentId, nextItems)
                            }
                          />
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
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
              : "No hay actas para generar."}
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
              disabled={isGenerating || totalSigners === 0}
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
