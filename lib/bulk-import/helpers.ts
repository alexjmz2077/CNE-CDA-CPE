import type { PostgrestError } from "@supabase/supabase-js"

/**
 * Utilidades compartidas por los importadores masivos. No deben importar
 * dependencias pesadas (por ejemplo `xlsx`) para mantenerse livianas.
 */

const DIACRITICS_REGEX = /[\u0300-\u036f]/g

export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim().length === 0
  return false
}

export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString()
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return ""
    return String(value)
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Normaliza encabezados y valores para comparaciones sin tildes ni mayúsculas. */
export function normalizeForComparison(value: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export function normalizeCedula(value: unknown): string {
  return normalizeText(value)
    .replace(/[\s.\-]/g, "")
    .toUpperCase()
}

export function normalizeEmail(value: unknown): string {
  return normalizeText(value).toLowerCase()
}

export function normalizePhone(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, " ").trim()
}

export function isValidCedula(value: string): boolean {
  return /^\d{10}$/.test(value)
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15
}

export function buildRecordLabel(parts: Array<string | null | undefined>): string {
  return parts.map((part) => normalizeText(part)).filter(Boolean).join(" · ")
}

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function buildIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return `${year}-${pad2(month)}-${pad2(day)}`
}

const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

/**
 * Convierte una celda de Excel (fecha serial, Date, texto dd/mm/aaaa o
 * aaaa-mm-dd) a una fecha ISO `YYYY-MM-DD`. Devuelve null si no es válida.
 */
export function parseDateCell(value: unknown): string | null {
  if (isBlank(value)) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return buildIsoDate(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Serial de Excel: los días se cuentan desde el 30/12/1899.
    if (value < 61 || value > 73415) return null
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000)
    return buildIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  }

  const text = normalizeText(value)
  if (!text) return null

  // 2026-10-26, 2026/10/26 o 2026.10.26 (con hora opcional)
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/.exec(text)
  if (match) {
    return buildIsoDate(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  // 26/10/2026, 26-10-2026 o 26.10.2026
  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(text)
  if (match) {
    const rawYear = Number(match[3])
    const year = rawYear < 100 ? 2000 + rawYear : rawYear
    return buildIsoDate(year, Number(match[2]), Number(match[1]))
  }

  // 26 de octubre de 2026
  match = /^(\d{1,2})\s+de\s+([a-záéíóúüñ]+)\s+de\s+(\d{4})$/i.exec(text)
  if (match) {
    const month = SPANISH_MONTHS[normalizeForComparison(match[2])]
    if (month) return buildIsoDate(Number(match[3]), month, Number(match[1]))
  }

  return null
}

export function parseBooleanCell(
  value: unknown,
  defaultValue = true,
): { value: boolean; error?: string } {
  if (isBlank(value)) return { value: defaultValue }

  if (typeof value === "boolean") return { value }

  if (typeof value === "number") {
    if (value === 1) return { value: true }
    if (value === 0) return { value: false }
    return { value: defaultValue, error: "Use Sí o No." }
  }

  const text = normalizeForComparison(value)
  if (["si", "s", "true", "verdadero", "1", "x", "habilitado", "habilitada"].includes(text)) {
    return { value: true }
  }
  if (["no", "n", "false", "falso", "0", "deshabilitado", "deshabilitada"].includes(text)) {
    return { value: false }
  }

  return { value: defaultValue, error: "Use Sí o No." }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error.trim()) return error
  return fallback
}

const COLUMN_LABELS: Record<string, string> = {
  cedula: "cédula",
  name: "nombre",
  second_name: "apellidos",
  phone: "teléfono",
  email: "correo",
  address: "dirección",
  code: "código",
  canton: "cantón",
  parish: "parroquia",
  is_enabled: "habilitado",
  start_date: "fecha de inicio",
  end_date: "fecha de fin",
  process_id: "proceso",
  member_id: "miembro",
  member_type: "tipo de miembro",
  role: "rol",
  cda_precinct_id: "recinto CDA",
  rector_name: "nombre del rector",
  rector_phone: "teléfono del rector",
  rector_email: "correo del rector",
  keys_name: "nombre del encargado de llaves",
  keys_phone: "teléfono del encargado de llaves",
}

function humanizeColumn(column: string | undefined): string | null {
  if (!column) return null
  return COLUMN_LABELS[column] ?? column.replace(/_/g, " ")
}

/**
 * Traduce los errores de Postgres/Supabase a mensajes entendibles para el
 * usuario. Los importadores agregan el contexto de la fila.
 */
export function getDatabaseErrorMessage(error: unknown, fallback: string): string {
  const dbError = error as Partial<PostgrestError> | null
  const code = dbError?.code
  const message = dbError?.message ?? ""

  if (code === "23505") {
    if (message.includes("members_cedula") || /members.*cedula|cedula.*members/i.test(message)) {
      return "Ya existe un miembro registrado con esa cédula."
    }
    if (/cda_precincts.*code|code.*cda_precincts/i.test(message)) {
      return "Ya existe un CDA con ese código."
    }
    if (/assignments|process_id|member_id/i.test(message)) {
      return "El miembro ya está asignado a este proceso."
    }
    return "Ya existe un registro con esos datos (valor duplicado)."
  }

  if (code === "23502") {
    const column = /column "([^"]+)"/.exec(message)?.[1]
    const label = humanizeColumn(column)
    return label
      ? `Falta un dato obligatorio: ${label}.`
      : "Falta un dato obligatorio en el registro."
  }

  if (code === "23503") {
    if (/cda_precinct_id/.test(message)) return "El recinto CDA indicado no existe."
    if (/process_id/.test(message)) return "El proceso electoral indicado no existe."
    if (/member_id/.test(message)) return "El miembro indicado no existe."
    return "Uno de los datos relacionados no existe o fue eliminado."
  }

  if (code === "23514") {
    return "Los datos no cumplen las validaciones permitidas por el sistema."
  }

  if (code === "42501" || /permission|row-level security|rls/i.test(message)) {
    return "No tiene permisos para realizar esta operación."
  }

  if (code === "PGRST116") {
    return "No se encontró el registro esperado."
  }

  if (/failed to fetch|network|fetch failed/i.test(message)) {
    return "Error de conexión. Verifique su conexión a internet e intente nuevamente."
  }

  return message || fallback
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export async function fetchInChunks<T>(
  values: string[],
  fetcher: (
    chunk: string[],
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const uniqueValues = Array.from(new Set(values.filter((value) => value.length > 0)))
  const data: T[] = []

  for (const chunk of chunkArray(uniqueValues, 150)) {
    const { data: rows, error } = await fetcher(chunk)
    if (error) return { data, error }
    if (rows) data.push(...rows)
  }

  return { data, error: null }
}
