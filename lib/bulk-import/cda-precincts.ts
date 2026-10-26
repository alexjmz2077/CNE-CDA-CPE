import {
  CANTON_PARISH_ROWS,
  findCanonicalCanton,
  findCanonicalParish,
} from "@/lib/cda-precincts"
import {
  buildRecordLabel,
  getDatabaseErrorMessage,
  isValidEmail,
  isValidPhone,
  normalizeForComparison,
  normalizeText,
  parseBooleanCell,
} from "./helpers"
import type {
  BulkImportIssue,
  BulkImportModule,
  BulkImportPreparedRecord,
  BulkImportRawRow,
} from "./types"

export type CDAPrecinctImportRecord = {
  code: string
  name: string
  canton: string
  parish: string
  address: string | null
  is_enabled: boolean
  rector_name: string | null
  rector_phone: string | null
  rector_email: string | null
  keys_name: string | null
  keys_phone: string | null
}

type CDACandidate = {
  row: number
  recordLabel: string
  data: CDAPrecinctImportRecord
  normalizedCode: string
}

function hasContactData(record: CDAPrecinctImportRecord): boolean {
  return Boolean(
    record.rector_name ||
      record.rector_phone ||
      record.rector_email ||
      record.keys_name ||
      record.keys_phone,
  )
}

export const CDA_PRECINCTS_BULK_IMPORT: BulkImportModule<CDAPrecinctImportRecord> = {
  id: "cda-precincts",
  title: "Carga masiva de recintos CDA",
  description:
    "Registre varios recintos CDA con su ubicación y datos de contacto desde un archivo de Excel.",
  templateFileName: "plantilla-recintos-cda",
  entityName: "CDA",
  columns: [
    {
      key: "code",
      label: "Código del CDA",
      required: true,
      description: "Código único del recinto. No puede repetirse.",
      example: "CDA-001",
      aliases: ["Código", "Codigo", "Código CDA"],
    },
    {
      key: "name",
      label: "Nombre del CDA",
      required: true,
      description: "Nombre del centro de digitación avanzada.",
      example: "Unidad Educativa Macas",
      aliases: ["Nombre", "Recinto", "Nombre del recinto"],
    },
    {
      key: "canton",
      label: "Cantón",
      required: true,
      description: "Cantón de la provincia de Morona Santiago. Use el catálogo incluido.",
      example: "Morona",
      aliases: ["Canton"],
    },
    {
      key: "parish",
      label: "Parroquia",
      required: true,
      description: "Parroquia correspondiente al cantón seleccionado.",
      example: "Macas",
      aliases: ["Parroquia"],
    },
    {
      key: "address",
      label: "Dirección",
      required: false,
      description: "Dirección del recinto CDA.",
      example: "Av. Amazonas y Calle Bolívar, Macas",
      aliases: ["Direccion", "Dirección del CDA"],
    },
    {
      key: "is_enabled",
      label: "Habilitado",
      required: false,
      description: "Sí o No. Si se deja vacío se asume Sí.",
      example: "Sí",
      aliases: ["Estado", "Activo"],
    },
    {
      key: "rector_name",
      label: "Nombre del rector",
      required: false,
      description: "Nombre de la autoridad del plantel. Opcional.",
      example: "María López",
      aliases: ["Rector", "Nombre rector"],
    },
    {
      key: "rector_phone",
      label: "Teléfono del rector",
      required: false,
      description: "Teléfono del rector. Opcional.",
      example: "0987654321",
      aliases: ["Teléfono rector", "Telefono rector"],
    },
    {
      key: "rector_email",
      label: "Correo del rector",
      required: false,
      description: "Correo electrónico del rector. Opcional.",
      example: "rector@correo.com",
      aliases: ["Correo rector", "Email rector"],
    },
    {
      key: "keys_name",
      label: "Nombre del encargado de llaves",
      required: false,
      description: "Nombre de la persona encargada de las llaves. Opcional.",
      example: "Pedro Ruiz",
      aliases: ["Encargado de llaves", "Nombre llaves"],
    },
    {
      key: "keys_phone",
      label: "Teléfono del encargado de llaves",
      required: false,
      description: "Teléfono del encargado de llaves. Opcional.",
      example: "0998765432",
      aliases: ["Teléfono llaves", "Telefono llaves"],
    },
  ],
  instructions: [
    "Complete una fila por cada recinto CDA. No modifique los encabezados de la hoja \"Datos\".",
    "El código y el nombre del CDA son obligatorios. El código no puede repetirse.",
    "Use los valores de la hoja \"Cantones y Parroquias\" para el cantón y la parroquia. La parroquia debe pertenecer al cantón indicado.",
    "Habilitado acepta Sí o No. Si se deja vacío se asume Sí.",
    "Los datos del rector y del encargado de llaves son opcionales. Si registra teléfonos o correos, se validará su formato.",
    "El código puede ser alfanumérico. Si empieza con ceros, formatee la columna como texto.",
    "Las filas con errores no se importarán. Puede corregirlas en el mismo archivo y volver a cargar solo esas filas.",
    "Al importar, las filas válidas se registran de inmediato; al finalizar verá el detalle por fila.",
  ],
  extraSheets: [
    {
      sheetName: "Cantones y Parroquias",
      headers: ["Cantón", "Parroquia"],
      rows: CANTON_PARISH_ROWS,
    },
  ],
  async validate(rows, { supabase }): Promise<{
    records: BulkImportPreparedRecord<CDAPrecinctImportRecord>[]
    issues: BulkImportIssue[]
    globalError?: string
  }> {
    const issues: BulkImportIssue[] = []
    const candidates: CDACandidate[] = []

    const buildParsedRow = (row: BulkImportRawRow) => {
      const code = normalizeText(row.values.code)
      const name = normalizeText(row.values.name)
      const cantonRaw = normalizeText(row.values.canton)
      const parishRaw = normalizeText(row.values.parish)
      const address = normalizeText(row.values.address) || null
      const rectorName = normalizeText(row.values.rector_name) || null
      const rectorPhone = normalizeText(row.values.rector_phone) || null
      const rectorEmail = normalizeText(row.values.rector_email) || null
      const keysName = normalizeText(row.values.keys_name) || null
      const keysPhone = normalizeText(row.values.keys_phone) || null
      return {
        code,
        name,
        cantonRaw,
        parishRaw,
        address,
        rectorName,
        rectorPhone,
        rectorEmail,
        keysName,
        keysPhone,
      }
    }

    for (const row of rows) {
      const parsed = buildParsedRow(row)
      const recordLabel = buildRecordLabel([parsed.code, parsed.name])
      const rowIssues: BulkImportIssue[] = []
      const addIssue = (field: string, message: string) =>
        rowIssues.push({ row: row.row, field, recordLabel, message })

      if (!parsed.code) addIssue("Código del CDA", "El código del CDA es obligatorio.")
      if (!parsed.name) addIssue("Nombre del CDA", "El nombre del CDA es obligatorio.")

      let canton: string | null = null
      if (!parsed.cantonRaw) {
        addIssue("Cantón", "El cantón es obligatorio.")
      } else {
        canton = findCanonicalCanton(parsed.cantonRaw)
        if (!canton) {
          addIssue(
            "Cantón",
            `El cantón "${parsed.cantonRaw}" no es válido. Use el catálogo de la plantilla.`,
          )
        }
      }

      let parish: string | null = null
      if (!parsed.parishRaw) {
        addIssue("Parroquia", "La parroquia es obligatoria.")
      } else if (canton) {
        parish = findCanonicalParish(canton, parsed.parishRaw)
        if (!parish) {
          addIssue(
            "Parroquia",
            `La parroquia "${parsed.parishRaw}" no pertenece al cantón "${canton}". Revise el catálogo.`,
          )
        }
      }

      const enabled = parseBooleanCell(row.values.is_enabled, true)
      if (enabled.error) {
        addIssue("Habilitado", "El campo Habilitado debe ser Sí o No.")
      }

      if (parsed.rectorPhone && !isValidPhone(parsed.rectorPhone)) {
        addIssue(
          "Teléfono del rector",
          "El teléfono del rector debe contener entre 7 y 15 dígitos.",
        )
      }
      if (parsed.rectorEmail && !isValidEmail(parsed.rectorEmail)) {
        addIssue(
          "Correo del rector",
          "El correo del rector no tiene un formato válido.",
        )
      }
      if (parsed.keysPhone && !isValidPhone(parsed.keysPhone)) {
        addIssue(
          "Teléfono del encargado de llaves",
          "El teléfono del encargado de llaves debe contener entre 7 y 15 dígitos.",
        )
      }

      if (rowIssues.length > 0) {
        issues.push(...rowIssues)
        continue
      }

      candidates.push({
        row: row.row,
        recordLabel,
        normalizedCode: normalizeForComparison(parsed.code),
        data: {
          code: parsed.code,
          name: parsed.name,
          canton: canton as string,
          parish: parish as string,
          address: parsed.address,
          is_enabled: enabled.value,
          rector_name: parsed.rectorName,
          rector_phone: parsed.rectorPhone,
          rector_email: parsed.rectorEmail,
          keys_name: parsed.keysName,
          keys_phone: parsed.keysPhone,
        },
      })
    }

    const seenCodes = new Map<string, number>()
    const uniqueCandidates: CDACandidate[] = []

    for (const candidate of candidates) {
      const previousRow = seenCodes.get(candidate.normalizedCode)
      if (previousRow !== undefined) {
        issues.push({
          row: candidate.row,
          field: "Código del CDA",
          recordLabel: candidate.recordLabel,
          message: `El código ${candidate.data.code} está repetido en el archivo (también aparece en la fila ${previousRow}).`,
        })
        continue
      }

      seenCodes.set(candidate.normalizedCode, candidate.row)
      uniqueCandidates.push(candidate)
    }

    if (uniqueCandidates.length === 0) {
      return { records: [], issues }
    }

    // Se consultan todos los códigos para comparar sin distinguir mayúsculas,
    // minúsculas ni tildes.
    const { data, error } = await supabase.from("cda_precincts").select("code")

    if (error) {
      return {
        records: [],
        issues,
        globalError: getDatabaseErrorMessage(
          error,
          "No se pudieron verificar los códigos de CDA existentes. Intente nuevamente.",
        ),
      }
    }

    const existingCodes = new Set(
      (data ?? []).map((precinct) => normalizeForComparison(precinct.code)),
    )
    const records: BulkImportPreparedRecord<CDAPrecinctImportRecord>[] = []

    for (const candidate of uniqueCandidates) {
      if (existingCodes.has(candidate.normalizedCode)) {
        issues.push({
          row: candidate.row,
          field: "Código del CDA",
          recordLabel: candidate.recordLabel,
          message: `Ya existe un CDA con el código ${candidate.data.code}.`,
        })
        continue
      }

      records.push({
        row: candidate.row,
        recordLabel: candidate.recordLabel,
        data: candidate.data,
      })
    }

    return { records, issues }
  },
  async insert(records, { supabase, onProgress }) {
    const outcomes = []
    let processed = 0

    for (const item of records) {
      const { data: inserted, error } = await supabase
        .from("cda_precincts")
        .insert({
          code: item.data.code,
          name: item.data.name,
          canton: item.data.canton,
          parish: item.data.parish,
          address: item.data.address,
          is_enabled: item.data.is_enabled,
        })
        .select("id")
        .single()

      if (error || !inserted) {
        outcomes.push({
          row: item.row,
          recordLabel: item.recordLabel,
          success: false,
          message: getDatabaseErrorMessage(
            error,
            "No se pudo registrar el CDA.",
          ),
        })
        processed += 1
        onProgress?.(processed, records.length)
        continue
      }

      if (hasContactData(item.data)) {
        const { error: contactError } = await supabase
          .from("cda_precinct_contacts")
          .insert({
            precinct_id: inserted.id,
            rector_name: item.data.rector_name ?? "",
            rector_phone: item.data.rector_phone,
            rector_email: item.data.rector_email,
            keys_name: item.data.keys_name,
            keys_phone: item.data.keys_phone,
          })

        if (contactError) {
          // Evita dejar un recinto sin contacto cuando el contacto era parte
          // de la misma fila.
          await supabase.from("cda_precincts").delete().eq("id", inserted.id)

          outcomes.push({
            row: item.row,
            recordLabel: item.recordLabel,
            success: false,
            message: `El CDA no se guardó porque falló el registro del contacto: ${getDatabaseErrorMessage(
              contactError,
              "error desconocido",
            )}`,
          })
          processed += 1
          onProgress?.(processed, records.length)
          continue
        }
      }

      outcomes.push({
        row: item.row,
        recordLabel: item.recordLabel,
        success: true,
      })
      processed += 1
      onProgress?.(processed, records.length)
    }

    return outcomes
  },
}
