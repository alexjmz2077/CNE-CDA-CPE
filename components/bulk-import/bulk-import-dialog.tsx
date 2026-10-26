"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  XCircle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getErrorMessage } from "@/lib/bulk-import/helpers"
import {
  BulkImportFileError,
  downloadBulkImportTemplate,
  readBulkImportFile,
} from "@/lib/bulk-import/spreadsheet"
import type {
  BulkImportIssue,
  BulkImportModule,
  BulkImportOutcome,
  BulkImportValidationResult,
} from "@/lib/bulk-import/types"
import { createClient } from "@/lib/supabase/client"

type Stage = "idle" | "validating" | "ready" | "importing" | "done"

type BulkImportDialogProps = {
  module: BulkImportModule<any>
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: () => void
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function groupIssuesByRow(
  issues: BulkImportIssue[],
): Array<[number, BulkImportIssue[]]> {
  const grouped = new Map<number, BulkImportIssue[]>()
  for (const issue of issues) {
    const current = grouped.get(issue.row) ?? []
    current.push(issue)
    grouped.set(issue.row, current)
  }
  return Array.from(grouped.entries()).sort(([rowA], [rowB]) => rowA - rowB)
}

function IssueList({ issues }: { issues: BulkImportIssue[] }) {
  const grouped = useMemo(() => groupIssuesByRow(issues), [issues])

  if (grouped.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        No hay observaciones.
      </p>
    )
  }

  return (
    <div className="max-h-60 divide-y overflow-y-auto rounded-md border">
      {grouped.map(([row, rowIssues]) => (
        <div key={row} className="space-y-1 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="destructive">Fila {row}</Badge>
            {rowIssues[0]?.recordLabel ? (
              <span className="font-medium">{rowIssues[0].recordLabel}</span>
            ) : null}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {rowIssues.map((issue, index) => (
              <li key={`${row}-${index}`}>
                {issue.field ? (
                  <span className="font-medium text-foreground">{issue.field}: </span>
                ) : null}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function OutcomeList({ outcomes }: { outcomes: BulkImportOutcome[] }) {
  if (outcomes.length === 0) return null

  return (
    <div className="max-h-60 divide-y overflow-y-auto rounded-md border">
      {outcomes.map((outcome, index) => (
        <div
          key={`${outcome.row}-${index}`}
          className="flex items-start gap-3 p-3 text-sm"
        >
          {outcome.success ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={outcome.success ? "secondary" : "destructive"}>
                Fila {outcome.row}
              </Badge>
              {outcome.recordLabel ? (
                <span className="font-medium">{outcome.recordLabel}</span>
              ) : null}
            </div>
            <p
              className={
                outcome.success ? "text-muted-foreground" : "text-destructive"
              }
            >
              {outcome.success
                ? "Importado correctamente."
                : outcome.message || "No se pudo importar el registro."}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionTitle({
  title,
  description,
  count,
}: {
  title: string
  description?: string
  count?: number
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {typeof count === "number" ? (
        <Badge variant="outline">{count}</Badge>
      ) : null}
    </div>
  )
}

export function BulkImportDialog({
  module,
  open,
  onOpenChange,
  onImported,
}: BulkImportDialogProps) {
  const [stage, setStage] = useState<Stage>("idle")
  const [fileName, setFileName] = useState<string | null>(null)
  const [validation, setValidation] =
    useState<BulkImportValidationResult<any> | null>(null)
  const [outcomes, setOutcomes] = useState<BulkImportOutcome[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ processed: 0, total: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStage("idle")
    setFileName(null)
    setValidation(null)
    setOutcomes([])
    setError(null)
    setProgress({ processed: 0, total: 0 })
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && stage === "importing") return
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const processFile = async (file: File) => {
    setStage("validating")
    setFileName(file.name)
    setValidation(null)
    setOutcomes([])
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Debe iniciar sesión para importar registros.")
      }

      const rows = await readBulkImportFile(file, module.columns)
      const result = await module.validate(rows, {
        supabase,
        userId: user.id,
      })

      setValidation(result)
      setStage("ready")
    } catch (err) {
      setValidation(null)
      setStage("idle")
      setError(
        getErrorMessage(
          err,
          err instanceof BulkImportFileError
            ? err.message
            : "No se pudo procesar el archivo. Verifique su estructura e intente nuevamente.",
        ),
      )
    }
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) await processFile(file)
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (stage === "validating" || stage === "importing") return
    const file = event.dataTransfer.files?.[0]
    if (file) await processFile(file)
  }

  const handleDownloadTemplate = async () => {
    setError(null)
    try {
      await downloadBulkImportTemplate(module)
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "No se pudo generar la plantilla. Intente nuevamente.",
        ),
      )
    }
  }

  const handleImport = async () => {
    if (!validation || validation.records.length === 0) return

    setStage("importing")
    setError(null)
    setOutcomes([])
    setProgress({ processed: 0, total: validation.records.length })

    try {
      const supabase = createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Debe iniciar sesión para importar registros.")
      }

      const results = await module.insert(validation.records, {
        supabase,
        userId: user.id,
        onProgress: (processed, total) => setProgress({ processed, total }),
      })

      setOutcomes(results)
      setProgress({ processed: results.length, total: results.length })
      setStage("done")

      if (results.some((result) => result.success)) {
        onImported?.()
      }
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudo completar la importación."),
      )
      setStage("ready")
    }
  }

  const issueRowsCount = useMemo(
    () => new Set(validation?.issues.map((issue) => issue.row) ?? []).size,
    [validation],
  )

  const successCount = outcomes.filter((outcome) => outcome.success).length
  const failureCount = outcomes.length - successCount
  const progressPercent =
    progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0

  const summaryTone =
    failureCount === 0 && issueRowsCount === 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : successCount > 0
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-destructive/30 bg-destructive/5 text-destructive"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {module.title}
          </DialogTitle>
          <DialogDescription>{module.description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="space-y-5">
          <section className="rounded-lg border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4" />
                  Estructura del archivo
                </h3>
                <p className="text-xs text-muted-foreground">
                  La primera fila debe contener estos encabezados.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
              >
                <Download className="h-4 w-4" />
                Descargar plantilla
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Columna</TableHead>
                    <TableHead>Obligatoria</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Ejemplo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {module.columns.map((column) => (
                    <TableRow key={column.key}>
                      <TableCell className="font-medium">{column.label}</TableCell>
                      <TableCell>
                        <Badge variant={column.required ? "default" : "outline"}>
                          {column.required ? "Sí" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[220px] text-muted-foreground">
                        {column.description}
                      </TableCell>
                      <TableCell className="min-w-[140px] text-muted-foreground">
                        {column.example}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border-t px-4 py-3">
              <p className="text-sm font-medium">Antes de cargar el archivo</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {module.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div
              className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">
                Seleccione el archivo de Excel o arrástrelo aquí
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Formatos permitidos: .xlsx, .xls y .csv
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={stage === "validating" || stage === "importing"}
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo
                </Button>
                {fileName ? <Badge variant="secondary">{fileName}</Badge> : null}
              </div>
            </div>

            {stage === "validating" ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Validando el archivo y verificando duplicados...
              </div>
            ) : null}
          </section>

          {validation ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {pluralize(validation.records.length, "válido", "válidos")}
                </Badge>
                <Badge variant={issueRowsCount > 0 ? "destructive" : "outline"}>
                  {pluralize(issueRowsCount, "fila con error", "filas con error")}
                </Badge>
                {validation.globalError ? (
                  <Badge variant="destructive">Verificación incompleta</Badge>
                ) : null}
              </div>

              {validation.globalError ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{validation.globalError}</span>
                </div>
              ) : null}

              {stage === "ready" && validation.records.length > 0 ? (
                <div className="space-y-2">
                  <SectionTitle
                    title="Registros listos para importar"
                    description="Solo se importarán las filas sin errores. Al finalizar verá el detalle por fila."
                    count={validation.records.length}
                  />
                  <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
                    {validation.records.map((record) => (
                      <div
                        key={record.row}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge variant="outline">Fila {record.row}</Badge>
                          <span className="truncate">{record.recordLabel}</span>
                        </div>
                        <Badge variant="secondary">Listo</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {validation.issues.length > 0 ? (
                <div className="space-y-2">
                  <SectionTitle
                    title="Observaciones por fila"
                    description="Estas filas no se importarán. Corrija el archivo y vuelva a cargarlo."
                    count={issueRowsCount}
                  />
                  <IssueList issues={validation.issues} />
                </div>
              ) : null}
            </section>
          ) : null}

          {stage === "importing" ? (
            <section className="space-y-2 rounded-md border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando registros...
                </span>
                <span className="font-medium">
                  {progress.processed} de {progress.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                No cierre esta ventana mientras la importación está en curso.
              </p>
            </section>
          ) : null}

          {stage === "done" ? (
            <section className="space-y-3">
              <div className={`rounded-md border p-3 text-sm ${summaryTone}`}>
                {successCount > 0 ? (
                  <p className="flex items-start gap-2 font-medium">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {failureCount === 0 && issueRowsCount === 0
                      ? `Se importaron correctamente ${pluralize(successCount, "registro", "registros")}.`
                      : `Se importaron ${pluralize(successCount, "registro", "registros")} correctamente.`}
                  </p>
                ) : (
                  <p className="flex items-start gap-2 font-medium">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    No se pudo importar ningún registro.
                  </p>
                )}
                {failureCount > 0 ? (
                  <p className="mt-1 pl-6">
                    {pluralize(failureCount, "registro no se pudo importar", "registros no se pudieron importar")} por errores de la base de datos.
                  </p>
                ) : null}
                {issueRowsCount > 0 ? (
                  <p className="mt-1 pl-6">
                    {pluralize(issueRowsCount, "fila se omitió", "filas se omitieron")} por errores de validación.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <SectionTitle
                  title="Resultado por fila"
                  count={outcomes.length}
                />
                <OutcomeList outcomes={outcomes} />
              </div>

              {validation?.issues.length ? (
                <div className="space-y-2">
                  <SectionTitle
                    title="Filas omitidas por validación"
                    description="Corrija estos datos y vuelva a cargar solo las filas pendientes."
                    count={issueRowsCount}
                  />
                  <IssueList issues={validation.issues} />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {stage === "ready" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={reset}
              >
                Elegir otro archivo
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={validation?.records.length === 0}
              >
                <Upload className="h-4 w-4" />
                {validation?.records.length
                  ? `Importar ${pluralize(validation.records.length, "registro válido", "registros válidos")}`
                  : "Sin registros válidos"}
              </Button>
            </>
          ) : null}

          {stage === "done" ? (
            <>
              <Button type="button" variant="outline" onClick={reset}>
                Importar otro archivo
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
            </>
          ) : null}

          {stage === "idle" || stage === "validating" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={stage === "validating"}
            >
              Cancelar
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
