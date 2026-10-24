const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

const UNITS = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"]

const SPECIAL_TEENS = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve",
]

const TWENTIES = [
  "veinte",
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve",
]

const TENS = [
  "",
  "",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa",
]

const HUNDREDS = [
  "",
  "ciento",
  "doscientos",
  "trescientos",
  "cuatrocientos",
  "quinientos",
  "seiscientos",
  "setecientos",
  "ochocientos",
  "novecientos",
]

function belowOneThousand(value: number): string {
  if (value <= 0) return ""
  if (value === 100) return "cien"
  if (value < 10) return UNITS[value]
  if (value < 20) return SPECIAL_TEENS[value - 10]
  if (value < 30) return TWENTIES[value - 20]

  if (value < 100) {
    const tens = Math.floor(value / 10)
    const unit = value % 10
    return `${TENS[tens]}${unit ? ` y ${UNITS[unit]}` : ""}`
  }

  const hundreds = Math.floor(value / 100)
  const remainder = value % 100
  return `${HUNDREDS[hundreds]}${remainder ? ` ${belowOneThousand(remainder)}` : ""}`
}

/**
 * Convierte un número entero positivo a su expresión en letras en español.
 * Es suficiente para redactar fechas y cantidades de un acta.
 */
export function numberToSpanishWords(value: number): string {
  const number = Math.abs(Math.trunc(value))
  if (number === 0) return "cero"
  if (number < 1000) return belowOneThousand(number)

  if (number < 1_000_000) {
    const thousands = Math.floor(number / 1000)
    const remainder = number % 1000
    const thousandsText = thousands === 1 ? "mil" : `${belowOneThousand(thousands)} mil`
    return `${thousandsText}${remainder ? ` ${belowOneThousand(remainder)}` : ""}`
  }

  const millions = Math.floor(number / 1_000_000)
  const remainder = number % 1_000_000
  const millionsText =
    millions === 1 ? "un millón" : `${belowOneThousand(millions)} millones`
  return `${millionsText}${remainder ? ` ${numberToSpanishWords(remainder)}` : ""}`
}

/**
 * Devuelve la fecha local de hoy en formato YYYY-MM-DD, sin desplazamientos
 * de zona horaria producidos por toISOString().
 */
export function getTodayInputValue(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Parsea una fecha YYYY-MM-DD como fecha local (evita que el navegador la
 * interprete como UTC y muestre el día anterior).
 */
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

export type ActaDateParts = {
  day: number
  month: string
  year: number
  yearInWords: string
  /** Ej.: "24 de Octubre del año dos mil veintiséis" */
  long: string
}

export function getActaDateParts(dateISO: string): ActaDateParts | null {
  const date = parseDateInput(dateISO)
  if (!date) return null

  const day = date.getDate()
  const month = MONTHS[date.getMonth()]
  const year = date.getFullYear()
  const yearInWords = numberToSpanishWords(year)

  return {
    day,
    month,
    year,
    yearInWords,
    long: `${day} de ${month} del año ${yearInWords}`,
  }
}

/**
 * Limpia un texto para usarlo como nombre de archivo descargable.
 */
export function sanitizeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80)
}
