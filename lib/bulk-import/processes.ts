import {
  buildRecordLabel,
  getDatabaseErrorMessage,
  normalizeForComparison,
  normalizeText,
  parseDateCell,
} from "./helpers"
import type {
  BulkImportIssue,
  BulkImportModule,
  BulkImportPreparedRecord,
} from "./types"

export type ProcessImportRecord = {
  name: string
  start_date: string
  end_date: string
}

type ProcessCandidate = {
  row: number
  recordLabel: string
  data: ProcessImportRecord
  normalizedName: string
}

export const PROCESSES_BULK_IMPORT: BulkImportModule<ProcessImportRecord> = {
  id: "processes",
  title: "Carga masiva de procesos electorales",
  description:
    "Registre varios procesos electorales con sus fechas de inicio y fin desde un archivo de Excel.",
  templateFileName: "plantilla-procesos-electorales",
  entityName: "proceso electoral",
  columns: [
    {
      key: "name",
      label: "Nombre del proceso",
      required: true,
      description: "Nombre que identificará al proceso electoral.",
      example: "Elecciones Generales 2027",
      aliases: ["Nombre", "Proceso", "Proceso electoral"],
    },
    {
      key: "start_date",
      label: "Fecha de inicio",
      required: true,
      description: "Fecha en formato dd/mm/aaaa o aaaa-mm-dd.",
      example: "15/01/2027",
      aliases: ["Fecha inicio", "Inicio", "Fecha desde"],
    },
    {
      key: "end_date",
      label: "Fecha de fin",
      required: true,
      description: "Fecha de finalización. Debe ser igual o posterior a la fecha de inicio.",
      example: "28/02/2027",
      aliases: ["Fecha fin", "Fin", "Fecha hasta"],
    },
  ],
  instructions: [
    "Complete una fila por cada proceso electoral. No modifique los encabezados de la hoja \"Datos\".",
    "El nombre del proceso es obligatorio y no debe repetirse dentro del mismo archivo.",
    "Las fechas son obligatorias. Puede escribirlas como dd/mm/aaaa o aaaa-mm-dd, o usar celdas con formato de fecha.",
    "La fecha de fin no puede ser anterior a la fecha de inicio.",
    "Las filas con errores no se importarán. Puede corregirlas en el mismo archivo y volver a cargar solo esas filas.",
    "Al importar, las filas válidas se registran de inmediato; al finalizar verá el detalle por fila.",
  ],
  async validate(rows): Promise<{
    records: BulkImportPreparedRecord<ProcessImportRecord>[]
    issues: BulkImportIssue[]
  }> {
    const issues: BulkImportIssue[] = []
    const candidates: ProcessCandidate[] = []

    for (const row of rows) {
      const name = normalizeText(row.values.name)
      const startRaw = row.values.start_date
      const endRaw = row.values.end_date
      const recordLabel = name
      const rowIssues: BulkImportIssue[] = []
      const addIssue = (field: string, message: string) =>
        rowIssues.push({ row: row.row, field, recordLabel, message })

      if (!name) {
        addIssue("Nombre del proceso", "El nombre del proceso es obligatorio.")
      }

      const startDate = parseDateCell(startRaw)
      if (!normalizeText(startRaw)) {
        addIssue("Fecha de inicio", "La fecha de inicio es obligatoria.")
      } else if (!startDate) {
        addIssue(
          "Fecha de inicio",
          "La fecha de inicio no es válida. Use dd/mm/aaaa o aaaa-mm-dd.",
        )
      }

      const endDate = parseDateCell(endRaw)
      if (!normalizeText(endRaw)) {
        addIssue("Fecha de fin", "La fecha de fin es obligatoria.")
      } else if (!endDate) {
        addIssue(
          "Fecha de fin",
          "La fecha de fin no es válida. Use dd/mm/aaaa o aaaa-mm-dd.",
        )
      }

      if (startDate && endDate && endDate < startDate) {
        addIssue(
          "Fecha de fin",
          "La fecha de fin no puede ser anterior a la fecha de inicio.",
        )
      }

      if (rowIssues.length > 0) {
        issues.push(...rowIssues)
        continue
      }

      candidates.push({
        row: row.row,
        recordLabel,
        normalizedName: normalizeForComparison(name),
        data: {
          name,
          start_date: startDate as string,
          end_date: endDate as string,
        },
      })
    }

    const seenNames = new Map<string, number>()
    const records: BulkImportPreparedRecord<ProcessImportRecord>[] = []

    for (const candidate of candidates) {
      const previousRow = seenNames.get(candidate.normalizedName)
      if (previousRow !== undefined) {
        issues.push({
          row: candidate.row,
          field: "Nombre del proceso",
          recordLabel: candidate.recordLabel,
          message: `El nombre del proceso está repetido en el archivo (también aparece en la fila ${previousRow}).`,
        })
        continue
      }

      seenNames.set(candidate.normalizedName, candidate.row)
      records.push({
        row: candidate.row,
        recordLabel: candidate.recordLabel,
        data: candidate.data,
      })
    }

    return { records, issues }
  },
  async insert(records, { supabase, userId, onProgress }) {
    const outcomes = []
    let processed = 0

    for (const item of records) {
      const { error } = await supabase.from("electoral_processes").insert({
        ...item.data,
        image_url: null,
        created_by: userId,
      })

      outcomes.push({
        row: item.row,
        recordLabel: item.recordLabel,
        success: !error,
        message: error
          ? getDatabaseErrorMessage(
              error,
              "No se pudo registrar el proceso electoral.",
            )
          : undefined,
      })

      processed += 1
      onProgress?.(processed, records.length)
    }

    return outcomes
  },
}
