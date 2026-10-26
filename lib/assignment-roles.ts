import { normalizeForComparison } from "@/lib/bulk-import/helpers"

export type AssignmentMemberType = "CPE" | "CDA"

export type AssignmentRoleOption = {
  value: string
  label: string
}

export const CPE_ROLE_OPTIONS: AssignmentRoleOption[] = [
  { value: "Supervisor", label: "Supervisor" },
  { value: "Revisor de Firmas", label: "Revisor de Firmas" },
  { value: "Digitador", label: "Digitador" },
  { value: "Archivador de Actas", label: "Archivador de Actas" },
  { value: "Receptor de Actas", label: "Receptor de Actas" },
  { value: "Operador de Escáner", label: "Operador de Escáner" },
  {
    value: "Administrador Técnico Provincial",
    label: "Administrador Técnico Provincial",
  },
]

export const CDA_ROLE_OPTIONS: AssignmentRoleOption[] = [
  { value: "Operador de Escáner", label: "Operador de Escáner" },
  { value: "Asistente de Escáner", label: "Asistente de Escáner" },
]

export function getAssignmentRoleOptions(
  memberType: AssignmentMemberType,
): AssignmentRoleOption[] {
  return memberType === "CDA" ? CDA_ROLE_OPTIONS : CPE_ROLE_OPTIONS
}

export function normalizeAssignmentMemberType(
  value: unknown,
): AssignmentMemberType | null {
  const normalized = normalizeForComparison(value)
  if (normalized === "cpe") return "CPE"
  if (normalized === "cda") return "CDA"
  return null
}

/** Devuelve el valor canónico del rol (con tildes) o null si no es válido. */
export function findAssignmentRole(
  memberType: AssignmentMemberType,
  value: unknown,
): string | null {
  const normalized = normalizeForComparison(value)
  if (!normalized) return null

  const option = getAssignmentRoleOptions(memberType).find(
    (role) =>
      normalizeForComparison(role.value) === normalized ||
      normalizeForComparison(role.label) === normalized,
  )

  return option?.value ?? null
}
