const CPE_ROLE_LABELS: Record<string, string> = {
  Supervisor: "Supervisor",
  Revisor: "Revisor de Firmas",
  "Revisor de Firmas": "Revisor de Firmas",
  Digitador: "Digitador",
  Archivador: "Archivador de Actas",
  "Archivador de Actas": "Archivador de Actas",
  Receptor: "Receptor de Actas",
  "Receptor de Actas": "Receptor de Actas",
  Operador: "Operador de Escáner",
  "Operador de Escáner": "Operador de Escáner",
  Asistente: "Asistente de Escáner",
  "Asistente de Escáner": "Asistente de Escáner",
  Administrador: "Administrador Técnico Provincial",
  "Administrador Técnico Provincial": "Administrador Técnico Provincial",
}

const CDA_ROLE_LABELS: Record<string, string> = {
  Operador: "Operador de Escáner",
  "Operador de Escáner": "Operador de Escáner",
  Asistente: "Asistente de Escáner",
  "Asistente de Escáner": "Asistente de Escáner",
}

/**
 * Devuelve la etiqueta visible del rol de una asignación según el tipo de miembro.
 * Tanto CPE como CDA incluyen "Operador de Escáner" y "Asistente de Escáner";
 * CPE además maneja roles administrativos y de archivo.
 */
export function getAssignmentRoleLabel(
  memberType: "CPE" | "CDA" | string | null | undefined,
  role: string | null | undefined,
): string {
  if (!role) return "Sin rol"
  const labels = memberType === "CDA" ? CDA_ROLE_LABELS : CPE_ROLE_LABELS
  return labels[role] ?? role
}

/**
 * Normaliza un texto para búsquedas: quita acentos y pasa a minúsculas,
 * de modo que "escaner" encuentre "Escáner".
 */
export function normalizeForSearch(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}
