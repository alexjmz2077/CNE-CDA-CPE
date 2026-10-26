import { normalizeForComparison } from "@/lib/bulk-import/helpers"

export const CANTON_PARISHES: Record<string, string[]> = {
  Morona: [
    "Macas",
    "9 de Octubre",
    "General Proaño",
    "San Isidro",
    "Sinaí",
    "Cuchaentza",
    "Río Blanco",
    "Zuñac",
  ],
  Gualaquiza: [
    "Gualaquiza",
    "Bomboiza",
    "El Ideal",
    "General Proaño",
    "Mercedes del Salado",
    "Nueva Tarqui",
    "San Miguel de Cuyes",
    "Amazanga",
  ],
  "Limón Indanza": [
    "Gral. Leonidas Plaza Gutiérrez",
    "Indanza",
    "San Antonio",
    "Santa Rosa de Limón",
    "Pan de Azúcar",
    "San Miguel de Conchay",
  ],
  Santiago: [
    "Santiago de Méndez",
    "San Luis de El Upano",
    "Copal",
    "Patuca",
    "Tayuza",
    "Chinimpi",
    "San Ildefonso de Limón",
  ],
  Sucúa: [
    "Sucúa",
    "Huambi",
    "Asunción",
    "Santa Marianita de Jesús",
    "Logroño Grande",
    "Yaupi",
  ],
  Palora: [
    "Palora",
    "Sangay",
    "Arapicos",
    "Cumandá",
    "Diez de Agosto",
    "Metentino",
    "Palmira",
  ],
  Huamboya: ["Huamboya", "Chiguaza", "Sucúa"],
  "San Juan Bosco": [
    "San Juan Bosco",
    "San Carlos de Limón",
    "Santiago de Panaza",
    "San Jacinto de Wakambeis",
    "Pan de Azúcar",
  ],
  Taisha: ["Taisha", "Huasaga", "Macuma", "Tuutinentza", "Pumpuentsa"],
  Logroño: ["Logroño", "Shimpis", "Yaupi", "San Agustín"],
  "Pablo Sexto": ["Pablo Sexto"],
  Tiwintza: ["Santiago", "San José de Morona", "Santiago", "Winza"],
  "Sevilla Don Bosco": ["Sevilla Don Bosco"],
}

/** Cantones y parroquias en formato plano para catálogos y plantillas. */
export const CANTON_PARISH_ROWS: string[][] = Object.entries(CANTON_PARISHES).flatMap(
  ([canton, parishes]) =>
    Array.from(new Set(parishes)).map((parish) => [canton, parish]),
)

export function findCanonicalCanton(value: unknown): string | null {
  const normalized = normalizeForComparison(value)
  if (!normalized) return null

  return (
    Object.keys(CANTON_PARISHES).find(
      (canton) => normalizeForComparison(canton) === normalized,
    ) ?? null
  )
}

export function findCanonicalParish(
  canton: string,
  value: unknown,
): string | null {
  const normalized = normalizeForComparison(value)
  if (!normalized) return null

  return (
    CANTON_PARISHES[canton]?.find(
      (parish) => normalizeForComparison(parish) === normalized,
    ) ?? null
  )
}
