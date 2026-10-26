import type { SupabaseClient } from "@supabase/supabase-js"

export type BulkImportColumn = {
  /** Identificador interno de la columna. */
  key: string
  /** Encabezado que se muestra en la plantilla. */
  label: string
  required?: boolean
  description: string
  example: string
  /** Encabezados alternativos aceptados al leer el archivo. */
  aliases?: string[]
}

export type BulkImportRawRow = {
  /** Número de fila del archivo (1-based, contando el encabezado). */
  row: number
  values: Record<string, unknown>
}

export type BulkImportIssue = {
  row: number
  field?: string
  recordLabel?: string
  message: string
}

export type BulkImportPreparedRecord<T> = {
  row: number
  recordLabel: string
  data: T
}

export type BulkImportValidationResult<T> = {
  records: BulkImportPreparedRecord<T>[]
  issues: BulkImportIssue[]
  globalError?: string
}

export type BulkImportOutcome = {
  row: number
  recordLabel: string
  success: boolean
  message?: string
}

export type BulkImportContext = {
  supabase: SupabaseClient
  userId: string
}

export type BulkImportImportContext = BulkImportContext & {
  onProgress?: (processed: number, total: number) => void
}

export type BulkImportCatalog = {
  sheetName: string
  headers: string[]
  rows: (string | number)[][]
}

export type BulkImportValidator<T> = (
  rows: BulkImportRawRow[],
  context: BulkImportContext,
) => Promise<BulkImportValidationResult<T>>

export type BulkImportInserter<T> = (
  records: BulkImportPreparedRecord<T>[],
  context: BulkImportImportContext,
) => Promise<BulkImportOutcome[]>

export type BulkImportModule<T> = {
  /** Identificador usado por los botones para resolver el módulo. */
  id: BulkImportModuleId
  /** Título que se muestra en el diálogo. */
  title: string
  /** Descripción corta del contenido del archivo. */
  description: string
  /** Nombre del archivo de plantilla, sin extensión. */
  templateFileName: string
  /** Nombre singular de la entidad (miembro, proceso, CDA, asignación). */
  entityName: string
  columns: BulkImportColumn[]
  instructions: string[]
  /** Hojas adicionales que se incluyen en la plantilla (catálogos). */
  extraSheets?: BulkImportCatalog[]
  validate: BulkImportValidator<T>
  insert: BulkImportInserter<T>
}

export type BulkImportModuleId = "members" | "processes" | "cda-precincts" | "assignments"
