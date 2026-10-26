import {
  buildRecordLabel,
  fetchInChunks,
  getDatabaseErrorMessage,
  isValidCedula,
  isValidEmail,
  isValidPhone,
  normalizeCedula,
  normalizeEmail,
  normalizeText,
} from "./helpers"
import type {
  BulkImportIssue,
  BulkImportModule,
  BulkImportPreparedRecord,
  BulkImportRawRow,
} from "./types"

export type MemberImportRecord = {
  cedula: string
  name: string
  second_name: string
  phone: string | null
  email: string | null
  address: string | null
}

type MemberCandidate = {
  row: number
  recordLabel: string
  data: MemberImportRecord
  cedula: string
}

export const MEMBERS_BULK_IMPORT: BulkImportModule<MemberImportRecord> = {
  id: "members",
  title: "Carga masiva de personal",
  description:
    "Registre varios miembros del equipo electoral desde un solo archivo de Excel.",
  templateFileName: "plantilla-personal",
  entityName: "miembro",
  columns: [
    {
      key: "cedula",
      label: "Cédula",
      required: true,
      description: "Número de cédula de 10 dígitos. No puede repetirse.",
      example: "1234567890",
      aliases: ["Cedula", "Número de cédula", "Identificación"],
    },
    {
      key: "name",
      label: "Nombres",
      required: true,
      description: "Nombres completos del miembro.",
      example: "Juan Carlos",
      aliases: ["Nombre", "Nombres completos"],
    },
    {
      key: "second_name",
      label: "Apellidos",
      required: true,
      description: "Apellidos completos del miembro.",
      example: "Pérez García",
      aliases: ["Apellido", "Apellidos completos"],
    },
    {
      key: "phone",
      label: "Teléfono",
      required: false,
      description: "Teléfono de contacto. Puede incluir espacios o el prefijo +593.",
      example: "0991234567",
      aliases: ["Telefono", "Celular", "Celular/Teléfono"],
    },
    {
      key: "email",
      label: "Correo",
      required: false,
      description: "Correo electrónico con formato válido.",
      example: "juan.perez@correo.com",
      aliases: ["Correo electrónico", "Email", "E-mail"],
    },
    {
      key: "address",
      label: "Dirección",
      required: false,
      description: "Dirección domiciliaria completa.",
      example: "Av. Amazonas y Calle Bolívar, Macas",
      aliases: ["Direccion", "Domicilio"],
    },
  ],
  instructions: [
    "Complete una fila por cada miembro. No modifique los encabezados de la hoja \"Datos\".",
    "La cédula es obligatoria, debe tener exactamente 10 dígitos y no puede estar registrada previamente.",
    "Formatee la columna Cédula como texto antes de escribir para conservar los ceros iniciales.",
    "Nombres y Apellidos son obligatorios.",
    "Teléfono, Correo y Dirección son opcionales. Si escribe un correo, debe tener un formato válido.",
    "Las filas con errores no se importarán. Puede corregirlas en el mismo archivo y volver a cargar solo esas filas.",
    "Al importar, las filas válidas se registran de inmediato; al finalizar verá el detalle por fila.",
  ],
  async validate(rows, { supabase }): Promise<{
    records: BulkImportPreparedRecord<MemberImportRecord>[]
    issues: BulkImportIssue[]
    globalError?: string
  }> {
    const issues: BulkImportIssue[] = []
    const candidates: MemberCandidate[] = []

    for (const row of rows) {
      const cedula = normalizeCedula(row.values.cedula)
      const name = normalizeText(row.values.name)
      const secondName = normalizeText(row.values.second_name)
      const phone = normalizeText(row.values.phone) || null
      const email = normalizeEmail(row.values.email) || null
      const address = normalizeText(row.values.address) || null
      const recordLabel = buildRecordLabel([
        [name, secondName].filter(Boolean).join(" "),
        cedula,
      ])

      const rowIssues: BulkImportIssue[] = []
      const addIssue = (field: string, message: string) =>
        rowIssues.push({ row: row.row, field, recordLabel, message })

      if (!cedula) {
        addIssue("Cédula", "La cédula es obligatoria.")
      } else if (!isValidCedula(cedula)) {
        addIssue("Cédula", "La cédula debe contener exactamente 10 dígitos.")
      }

      if (!name) addIssue("Nombres", "Los nombres son obligatorios.")
      if (!secondName) addIssue("Apellidos", "Los apellidos son obligatorios.")

      if (phone && !isValidPhone(phone)) {
        addIssue("Teléfono", "El teléfono debe contener entre 7 y 15 dígitos.")
      }
      if (email && !isValidEmail(email)) {
        addIssue("Correo", "El correo electrónico no tiene un formato válido.")
      }

      if (rowIssues.length > 0) {
        issues.push(...rowIssues)
        continue
      }

      candidates.push({
        row: row.row,
        recordLabel,
        cedula,
        data: {
          cedula,
          name,
          second_name: secondName,
          phone,
          email,
          address,
        },
      })
    }

    const seenCedulas = new Map<string, number>()
    const uniqueCandidates: MemberCandidate[] = []

    for (const candidate of candidates) {
      const previousRow = seenCedulas.get(candidate.cedula)
      if (previousRow !== undefined) {
        issues.push({
          row: candidate.row,
          field: "Cédula",
          recordLabel: candidate.recordLabel,
          message: `La cédula ${candidate.cedula} está repetida en el archivo (también aparece en la fila ${previousRow}).`,
        })
        continue
      }

      seenCedulas.set(candidate.cedula, candidate.row)
      uniqueCandidates.push(candidate)
    }

    if (uniqueCandidates.length === 0) {
      return { records: [], issues }
    }

    const { data, error } = await fetchInChunks<{ cedula: string }>(
      uniqueCandidates.map((candidate) => candidate.cedula),
      (chunk) => supabase.from("members").select("cedula").in("cedula", chunk),
    )

    if (error) {
      return {
        records: [],
        issues,
        globalError: getDatabaseErrorMessage(
          error,
          "No se pudieron verificar las cédulas existentes. Intente nuevamente.",
        ),
      }
    }

    const existingCedulas = new Set(
      (data ?? []).map((member) => normalizeCedula(member.cedula)),
    )
    const records: BulkImportPreparedRecord<MemberImportRecord>[] = []

    for (const candidate of uniqueCandidates) {
      if (existingCedulas.has(candidate.cedula)) {
        issues.push({
          row: candidate.row,
          field: "Cédula",
          recordLabel: candidate.recordLabel,
          message: `Ya existe un miembro registrado con la cédula ${candidate.cedula}.`,
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
  async insert(records, { supabase, userId, onProgress }) {
    const outcomes = []
    let processed = 0

    for (const item of records) {
      const { error } = await supabase.from("members").insert({
        ...item.data,
        created_by: userId,
        is_admin: false,
      })

      outcomes.push({
        row: item.row,
        recordLabel: item.recordLabel,
        success: !error,
        message: error
          ? getDatabaseErrorMessage(error, "No se pudo registrar el miembro.")
          : undefined,
      })

      processed += 1
      onProgress?.(processed, records.length)
    }

    return outcomes
  },
}
