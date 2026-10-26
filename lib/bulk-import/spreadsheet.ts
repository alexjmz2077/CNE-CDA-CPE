import { isBlank, normalizeForComparison } from "./helpers"
import type {
  BulkImportColumn,
  BulkImportModule,
  BulkImportRawRow,
} from "./types"

export class BulkImportFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BulkImportFileError"
  }
}

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"]

/**
 * Lee la primera hoja del archivo (o la hoja "Datos" si existe) y devuelve las
 * filas con los valores asociados a la clave de cada columna.
 */
export async function readBulkImportFile(
  file: File,
  columns: BulkImportColumn[],
): Promise<BulkImportRawRow[]> {
  const fileName = file.name.toLowerCase()
  if (!ACCEPTED_EXTENSIONS.some((extension) => fileName.endsWith(extension))) {
    throw new BulkImportFileError(
      "El archivo debe ser de Excel (.xlsx, .xls) o CSV (.csv). Descargue la plantilla para asegurar el formato correcto.",
    )
  }

  const XLSX = await import("xlsx")
  let workbook: Awaited<ReturnType<typeof XLSX.read>>
  try {
    const buffer = await file.arrayBuffer()
    workbook = XLSX.read(buffer, { type: "array", cellDates: false })
  } catch {
    throw new BulkImportFileError(
      "No se pudo leer el archivo. Verifique que no esté dañado y vuelva a intentarlo.",
    )
  }

  if (!workbook.SheetNames.length) {
    throw new BulkImportFileError("El archivo no contiene hojas con datos.")
  }

  const sheetName = workbook.SheetNames.includes("Datos")
    ? "Datos"
    : workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new BulkImportFileError("No se encontró la hoja de datos en el archivo.")
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: true,
  }) as unknown[][]

  if (!matrix.length) {
    throw new BulkImportFileError("El archivo está vacío.")
  }

  const headerToKey = new Map<string, string>()
  for (const column of columns) {
    for (const candidate of [column.label, ...(column.aliases ?? [])]) {
      const normalized = normalizeForComparison(candidate)
      if (normalized && !headerToKey.has(normalized)) {
        headerToKey.set(normalized, column.key)
      }
    }
  }

  let headerIndex = -1
  let matchedColumns = new Map<number, string>()

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? []
    const currentMatches = new Map<number, string>()
    const usedKeys = new Set<string>()

    row.forEach((cell, columnIndex) => {
      const normalized = normalizeForComparison(cell)
      if (!normalized) return
      const key = headerToKey.get(normalized)
      if (!key || usedKeys.has(key)) return
      usedKeys.add(key)
      currentMatches.set(columnIndex, key)
    })

    if (currentMatches.size > 0) {
      headerIndex = rowIndex
      matchedColumns = currentMatches
      break
    }
  }

  if (headerIndex === -1) {
    throw new BulkImportFileError(
      `No se encontró la fila de encabezados. La primera fila de la hoja "${sheetName}" debe contener los nombres de las columnas. Descargue la plantilla para ver la estructura requerida.`,
    )
  }

  const detectedKeys = new Set(matchedColumns.values())
  const missingColumns = columns.filter(
    (column) => column.required && !detectedKeys.has(column.key),
  )

  if (missingColumns.length > 0) {
    const labels = missingColumns.map((column) => `"${column.label}"`).join(", ")
    throw new BulkImportFileError(
      `Faltan columnas obligatorias en el archivo: ${labels}. Descargue la plantilla y conserve los encabezados originales.`,
    )
  }

  const rows: BulkImportRawRow[] = []
  for (let rowIndex = headerIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const sourceRow = matrix[rowIndex] ?? []
    const values: Record<string, unknown> = {}

    matchedColumns.forEach((key, columnIndex) => {
      values[key] = sourceRow[columnIndex] ?? ""
    })

    const isEmptyRow = Object.values(values).every((value) => isBlank(value))
    if (isEmptyRow) continue

    rows.push({ row: rowIndex + 1, values })
  }

  if (rows.length === 0) {
    throw new BulkImportFileError(
      "El archivo no contiene filas de datos. Complete la hoja \"Datos\" debajo de los encabezados.",
    )
  }

  return rows
}

const SHEET_NAME_UNSAFE_REGEX = /[\\/?*[\]:]/g

function safeSheetName(name: string): string {
  return name.replace(SHEET_NAME_UNSAFE_REGEX, " ").slice(0, 31) || "Hoja"
}

function buildColumnWidths(
  rows: Array<Array<string | number>>,
  minimum = 16,
  maximum = 60,
): Array<{ wch: number }> {
  const widths: number[] = []
  rows.forEach((row) => {
    row.forEach((cell, index) => {
      const length = String(cell ?? "").length
      widths[index] = Math.max(widths[index] ?? minimum, Math.min(maximum, length + 2))
    })
  })
  return widths.map((width) => ({ wch: width }))
}

/**
 * Construye el archivo de la plantilla (xlsx) en memoria.
 */
export async function buildBulkImportTemplate(
  module: BulkImportModule<any>,
): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx")
  const workbook = XLSX.utils.book_new()

  const headers = module.columns.map((column) => column.label)
  const dataSheet = XLSX.utils.aoa_to_sheet([headers])
  dataSheet["!cols"] = buildColumnWidths([headers])
  if (headers.length > 0) {
    dataSheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: 0, c: headers.length - 1 },
      }),
    }
  }
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Datos")

  const instructionRows: Array<Array<string | number>> = [
    [`Plantilla de ${module.title}`],
    [module.description],
    [],
    ["Instrucciones generales"],
    ...module.instructions.map((instruction, index) => [`${index + 1}. ${instruction}`]),
    [],
    ["Estructura de columnas"],
    ["Columna", "¿Obligatoria?", "Descripción", "Ejemplo"],
    ...module.columns.map((column) => [
      column.label,
      column.required ? "Sí" : "No",
      column.description,
      column.example,
    ]),
    [],
    [
      "Importante",
      "No modifique los encabezados de la hoja \"Datos\". Puede agregar tantas filas como necesite.",
    ],
  ]
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionRows)
  instructionsSheet["!cols"] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 70 },
    { wch: 30 },
  ]
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instrucciones")

  const exampleRow = module.columns.map((column) => column.example)
  const exampleSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])
  exampleSheet["!cols"] = buildColumnWidths([headers, exampleRow])
  XLSX.utils.book_append_sheet(workbook, exampleSheet, "Ejemplo")

  for (const catalog of module.extraSheets ?? []) {
    const catalogSheet = XLSX.utils.aoa_to_sheet([catalog.headers, ...catalog.rows])
    catalogSheet["!cols"] = buildColumnWidths([catalog.headers, ...catalog.rows])
    catalogSheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: catalog.rows.length, c: catalog.headers.length - 1 },
      }),
    }
    XLSX.utils.book_append_sheet(
      workbook,
      catalogSheet,
      safeSheetName(catalog.sheetName),
    )
  }

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer
}

/**
 * Genera y descarga la plantilla con las hojas "Datos", "Instrucciones" y
 * "Ejemplo", además de los catálogos propios de cada módulo.
 */
export async function downloadBulkImportTemplate(
  module: BulkImportModule<any>,
): Promise<void> {
  const output = await buildBulkImportTemplate(module)
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${module.templateFileName}.xlsx`
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
