import {
  CDA_ROLE_OPTIONS,
  CPE_ROLE_OPTIONS,
  findAssignmentRole,
  getAssignmentRoleOptions,
  normalizeAssignmentMemberType,
  type AssignmentMemberType,
} from "@/lib/assignment-roles"
import {
  buildRecordLabel,
  fetchInChunks,
  getDatabaseErrorMessage,
  isValidCedula,
  normalizeCedula,
  normalizeForComparison,
  normalizeText,
} from "./helpers"
import type {
  BulkImportIssue,
  BulkImportModule,
  BulkImportPreparedRecord,
  BulkImportRawRow,
} from "./types"

export type AssignmentImportRecord = {
  process_id: string
  member_id: string
  member_type: AssignmentMemberType
  role: string
  cda_precinct_id: string | null
}

type ProcessRow = {
  id: string
  name: string
}

type MemberRow = {
  id: string
  cedula: string
  name: string
  second_name: string | null
}

type PrecinctRow = {
  id: string
  code: string
  name: string
  is_enabled: boolean
}

type AssignmentCandidate = {
  row: number
  recordLabel: string
  key: string
  processName: string
  data: AssignmentImportRecord
}

type ParsedAssignmentRow = {
  source: BulkImportRawRow
  processName: string
  cedula: string
  memberTypeRaw: unknown
  roleRaw: string
  precinctCode: string
}

export const ASSIGNMENTS_BULK_IMPORT: BulkImportModule<AssignmentImportRecord> = {
  id: "assignments",
  title: "Carga masiva de asignaciones",
  description:
    "Asigne varios miembros a procesos electorales desde un archivo de Excel. El proceso y el miembro deben existir previamente.",
  templateFileName: "plantilla-asignaciones",
  entityName: "asignación",
  columns: [
    {
      key: "process_name",
      label: "Proceso electoral",
      required: true,
      description: "Nombre exacto de un proceso ya registrado en el sistema.",
      example: "Elecciones Generales 2027",
      aliases: ["Proceso", "Nombre del proceso", "Proceso electoral"],
    },
    {
      key: "member_cedula",
      label: "Cédula del miembro",
      required: true,
      description: "Cédula de 10 dígitos de un miembro ya registrado.",
      example: "1234567890",
      aliases: ["Cédula", "Cedula", "Miembro", "Cédula miembro"],
    },
    {
      key: "member_type",
      label: "Tipo de miembro",
      required: true,
      description: "CPE o CDA. Define los roles disponibles.",
      example: "CPE",
      aliases: ["Tipo", "Tipo miembro"],
    },
    {
      key: "role",
      label: "Rol",
      required: true,
      description: "Rol que desempeñará el miembro. Debe corresponder al tipo indicado.",
      example: "Digitador",
      aliases: ["Cargo", "Rol asignado"],
    },
    {
      key: "precinct_code",
      label: "Código del CDA",
      required: false,
      description: "Solo para tipo CDA. Opcional; el recinto debe existir y estar habilitado.",
      example: "CDA-001",
      aliases: ["Recinto CDA", "CDA", "Código CDA"],
    },
  ],
  instructions: [
    "Complete una fila por cada asignación. No modifique los encabezados de la hoja \"Datos\".",
    "El proceso electoral debe existir previamente. Escriba su nombre exacto, tal como aparece en el módulo de Procesos Electorales.",
    "El miembro debe existir previamente. Use su cédula de 10 dígitos sin puntos ni guiones.",
    "El tipo de miembro debe ser CPE o CDA. El rol debe corresponder a ese tipo; consulte la hoja \"Roles\".",
    "El código del CDA es opcional y solo aplica a asignaciones de tipo CDA. Si lo indica, el recinto debe existir y estar habilitado.",
    "No se puede asignar al mismo miembro dos veces al mismo proceso, ni repetir la combinación dentro del archivo.",
    "Las filas con errores no se importarán. Puede corregirlas en el mismo archivo y volver a cargar solo esas filas.",
    "Al importar, las filas válidas se registran de inmediato; al finalizar verá el detalle por fila.",
  ],
  extraSheets: [
    {
      sheetName: "Roles",
      headers: ["Tipo de miembro", "Rol"],
      rows: [
        ...CPE_ROLE_OPTIONS.map((role) => ["CPE", role.value]),
        ...CDA_ROLE_OPTIONS.map((role) => ["CDA", role.value]),
      ],
    },
  ],
  async validate(rows, { supabase }): Promise<{
    records: BulkImportPreparedRecord<AssignmentImportRecord>[]
    issues: BulkImportIssue[]
    globalError?: string
  }> {
    const issues: BulkImportIssue[] = []
    const parsedRows: ParsedAssignmentRow[] = rows.map((row) => ({
      source: row,
      processName: normalizeText(row.values.process_name),
      cedula: normalizeCedula(row.values.member_cedula),
      memberTypeRaw: row.values.member_type,
      roleRaw: normalizeText(row.values.role),
      precinctCode: normalizeText(row.values.precinct_code),
    }))

    const { data: processData, error: processError } = await supabase
      .from("electoral_processes")
      .select("id, name")
      .order("created_at", { ascending: false })

    if (processError) {
      return {
        records: [],
        issues,
        globalError: getDatabaseErrorMessage(
          processError,
          "No se pudieron consultar los procesos electorales.",
        ),
      }
    }

    const processesByName = new Map<string, ProcessRow[]>()
    for (const process of (processData ?? []) as ProcessRow[]) {
      const key = normalizeForComparison(process.name)
      const existing = processesByName.get(key) ?? []
      existing.push(process)
      processesByName.set(key, existing)
    }

    const cedulas = parsedRows
      .map((row) => row.cedula)
      .filter((cedula) => isValidCedula(cedula))

    const membersByCedula = new Map<string, MemberRow>()
    if (cedulas.length > 0) {
      const { data, error } = await fetchInChunks<MemberRow>(
        cedulas,
        (chunk) =>
          supabase
            .from("members")
            .select("id, cedula, name, second_name")
            .in("cedula", chunk),
      )

      if (error) {
        return {
          records: [],
          issues,
          globalError: getDatabaseErrorMessage(
            error,
            "No se pudieron consultar los miembros registrados.",
          ),
        }
      }

      for (const member of data ?? []) {
        membersByCedula.set(normalizeCedula(member.cedula), member)
      }
    }

    const precinctsByCode = new Map<string, PrecinctRow>()
    const hasPrecinctCodes = parsedRows.some((row) => row.precinctCode.length > 0)

    if (hasPrecinctCodes) {
      const { data, error } = await supabase
        .from("cda_precincts")
        .select("id, code, name, is_enabled")

      if (error) {
        return {
          records: [],
          issues,
          globalError: getDatabaseErrorMessage(
            error,
            "No se pudieron consultar los recintos CDA.",
          ),
        }
      }

      for (const precinct of (data ?? []) as PrecinctRow[]) {
        precinctsByCode.set(normalizeForComparison(precinct.code), precinct)
      }
    }

    const candidates: AssignmentCandidate[] = []

    for (const parsed of parsedRows) {
      const { source } = parsed
      const rowIssues: BulkImportIssue[] = []

      const processMatches =
        processesByName.get(normalizeForComparison(parsed.processName)) ?? []
      const process = processMatches.length === 1 ? processMatches[0] : null

      const member = membersByCedula.get(parsed.cedula)
      const memberType = normalizeAssignmentMemberType(parsed.memberTypeRaw)
      const role = memberType ? findAssignmentRole(memberType, parsed.roleRaw) : null

      const memberLabel = member
        ? buildRecordLabel([
            [member.name, member.second_name].filter(Boolean).join(" "),
            normalizeCedula(member.cedula),
          ])
        : parsed.cedula
      const recordLabel = buildRecordLabel([memberLabel, parsed.processName])

      const addIssue = (field: string, message: string) =>
        rowIssues.push({ row: source.row, field, recordLabel, message })

      if (!parsed.processName) {
        addIssue("Proceso electoral", "El nombre del proceso electoral es obligatorio.")
      } else if (processMatches.length === 0) {
        addIssue(
          "Proceso electoral",
          `No existe un proceso electoral con el nombre "${parsed.processName}". Regístrelo primero o corrija el nombre.`,
        )
      } else if (processMatches.length > 1) {
        addIssue(
          "Proceso electoral",
          `Hay más de un proceso electoral con el nombre "${parsed.processName}". Corrija los nombres duplicados antes de importar.`,
        )
      }

      if (!parsed.cedula) {
        addIssue("Cédula del miembro", "La cédula del miembro es obligatoria.")
      } else if (!isValidCedula(parsed.cedula)) {
        addIssue(
          "Cédula del miembro",
          "La cédula debe contener exactamente 10 dígitos.",
        )
      } else if (!member) {
        addIssue(
          "Cédula del miembro",
          `No existe un miembro registrado con la cédula ${parsed.cedula}. Regístrelo primero.`,
        )
      }

      if (!memberType) {
        addIssue("Tipo de miembro", "El tipo de miembro debe ser CPE o CDA.")
      } else if (!parsed.roleRaw) {
        addIssue("Rol", "El rol es obligatorio.")
      } else if (!role) {
        const validRoles = getAssignmentRoleOptions(memberType)
          .map((option) => option.value)
          .join(", ")
        addIssue(
          "Rol",
          `El rol "${parsed.roleRaw}" no es válido para un miembro ${memberType}. Roles permitidos: ${validRoles}.`,
        )
      }

      let precinctId: string | null = null
      if (parsed.precinctCode) {
        if (memberType === "CPE") {
          addIssue(
            "Código del CDA",
            "Solo las asignaciones de tipo CDA pueden tener un recinto CDA.",
          )
        } else if (memberType === "CDA") {
          const precinct = precinctsByCode.get(
            normalizeForComparison(parsed.precinctCode),
          )
          if (!precinct) {
            addIssue(
              "Código del CDA",
              `No existe un CDA con el código ${parsed.precinctCode}.`,
            )
          } else if (!precinct.is_enabled) {
            addIssue(
              "Código del CDA",
              `El CDA con código ${parsed.precinctCode} está deshabilitado.`,
            )
          } else {
            precinctId = precinct.id
          }
        }
      }

      if (rowIssues.length > 0 || !process || !member || !memberType || !role) {
        issues.push(...rowIssues)
        continue
      }

      candidates.push({
        row: source.row,
        recordLabel,
        key: `${process.id}:${member.id}`,
        processName: process.name,
        data: {
          process_id: process.id,
          member_id: member.id,
          member_type: memberType,
          role,
          cda_precinct_id: precinctId,
        },
      })
    }

    const seenAssignments = new Map<string, number>()
    const uniqueCandidates: AssignmentCandidate[] = []

    for (const candidate of candidates) {
      const previousRow = seenAssignments.get(candidate.key)
      if (previousRow !== undefined) {
        issues.push({
          row: candidate.row,
          field: "Asignación",
          recordLabel: candidate.recordLabel,
          message: `El miembro ya está asignado al proceso "${candidate.processName}" en la fila ${previousRow} del archivo.`,
        })
        continue
      }

      seenAssignments.set(candidate.key, candidate.row)
      uniqueCandidates.push(candidate)
    }

    if (uniqueCandidates.length === 0) {
      return { records: [], issues }
    }

    const processIds = uniqueCandidates.map((candidate) => candidate.data.process_id)
    const { data: assignmentData, error: assignmentError } = await fetchInChunks<{
      process_id: string
      member_id: string
    }>(processIds, (chunk) =>
      supabase
        .from("assignments")
        .select("process_id, member_id")
        .in("process_id", chunk),
    )

    if (assignmentError) {
      return {
        records: [],
        issues,
        globalError: getDatabaseErrorMessage(
          assignmentError,
          "No se pudieron verificar las asignaciones existentes.",
        ),
      }
    }

    const existingAssignments = new Set(
      (assignmentData ?? []).map(
        (assignment) => `${assignment.process_id}:${assignment.member_id}`,
      ),
    )
    const records: BulkImportPreparedRecord<AssignmentImportRecord>[] = []

    for (const candidate of uniqueCandidates) {
      if (existingAssignments.has(candidate.key)) {
        issues.push({
          row: candidate.row,
          field: "Asignación",
          recordLabel: candidate.recordLabel,
          message: `El miembro ya está asignado al proceso "${candidate.processName}".`,
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
      const { error } = await supabase.from("assignments").insert({
        ...item.data,
        created_by: userId,
      })

      outcomes.push({
        row: item.row,
        recordLabel: item.recordLabel,
        success: !error,
        message: error
          ? getDatabaseErrorMessage(error, "No se pudo registrar la asignación.")
          : undefined,
      })

      processed += 1
      onProgress?.(processed, records.length)
    }

    return outcomes
  },
}
