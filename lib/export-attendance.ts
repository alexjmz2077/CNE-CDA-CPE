import jsPDF from "jspdf"

import { sanitizeFileName } from "@/lib/acta-utils"

export type AttendanceMemberType = "CPE" | "CDA"

export type AttendancePdfOptions = {
  memberType: AttendanceMemberType
  members: Array<{ name: string }>
  processName?: string
  processImageUrl?: string | null
  date?: Date
}

type LoadedImage = {
  dataUrl: string
  aspectRatio: number
}

const PAGE_WIDTH = 297
const PAGE_HEIGHT = 210
const MARGIN_X = 8
const MARGIN_BOTTOM = 8
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const TABLE_TOP = 31
const GROUP_HEADER_HEIGHT = 8
const SUBHEADER_HEIGHT = 13
const HEADER_HEIGHT = GROUP_HEADER_HEIGHT + SUBHEADER_HEIGHT
const TABLE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM
const AVAILABLE_BODY_HEIGHT = TABLE_BOTTOM - TABLE_TOP - HEADER_HEIGHT
const MIN_ROWS_PER_PAGE = 10
const MAX_PAGES = 2
const BASE_NAME_FONT_SIZE = 8.5
const BASE_NUMBER_FONT_SIZE = 9
const NUMBER_COLUMN_WIDTH = 9
const NAME_COLUMN_WIDTH = 78
const ATTENDANCE_COLUMN_WIDTH =
  (CONTENT_WIDTH - NUMBER_COLUMN_WIDTH - NAME_COLUMN_WIDTH) / 8
const FALLBACK_LOGO_URL = "/images/CNE_Ec.png"

type AttendanceLayout = {
  rowsPerPage: number
  rowHeight: number
  nameFontSize: number
  numberFontSize: number
  totalPages: number
}

function getAttendanceLayout(memberCount: number): AttendanceLayout {
  // Como máximo dos páginas: si hay más de 20 registros, se reparten
  // proporcionalmente y se reduce la altura de fila y el tamaño del texto.
  const rowsPerPage = Math.max(
    MIN_ROWS_PER_PAGE,
    Math.ceil(memberCount / MAX_PAGES),
  )
  const rowHeight = AVAILABLE_BODY_HEIGHT / rowsPerPage
  const nameLines = rowHeight >= 5 ? 2 : 1
  const namePadding = nameLines === 2 ? 1.2 : 0.8
  const maxNameFont = (rowHeight - namePadding) / (nameLines * 0.45)

  return {
    rowsPerPage,
    rowHeight,
    nameFontSize: Math.min(BASE_NAME_FONT_SIZE, Math.max(4.2, maxNameFont)),
    numberFontSize: Math.min(
      BASE_NUMBER_FONT_SIZE,
      Math.max(4.5, (rowHeight - 0.6) / 0.45),
    ),
    totalPages: Math.min(MAX_PAGES, Math.ceil(memberCount / rowsPerPage)),
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function formatDisplayDate(date: Date): string {
  return `${pad(date.getDate())} / ${pad(date.getMonth() + 1)} / ${date.getFullYear()}`
}

function formatFileDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

async function loadImage(url: string): Promise<LoadedImage | null> {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return null
  }

  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = "anonymous"

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = image.naturalWidth || image.width
        canvas.height = image.naturalHeight || image.height
        const context = canvas.getContext("2d")
        if (!context) {
          resolve(null)
          return
        }

        context.drawImage(image, 0, 0)
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          aspectRatio: canvas.width / canvas.height,
        })
      } catch {
        resolve(null)
      }
    }

    image.onerror = () => resolve(null)
    image.src = url
  })
}

function drawLogo(pdf: jsPDF, logo: LoadedImage | null) {
  if (!logo) return

  const maxWidth = 50
  const maxHeight = 18
  let width = maxWidth
  let height = width / logo.aspectRatio

  if (height > maxHeight) {
    height = maxHeight
    width = height * logo.aspectRatio
  }

  pdf.addImage(
    logo.dataUrl,
    "PNG",
    PAGE_WIDTH - MARGIN_X - width,
    5 + (maxHeight - height) / 2,
    width,
    height,
  )
}

function drawPageHeading(
  pdf: jsPDF,
  logo: LoadedImage | null,
  memberType: AttendanceMemberType,
  dateLabel: string,
  showDate: boolean,
) {
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(17)
  pdf.setTextColor(0, 0, 0)
  pdf.text(`REGISTRO DE ASISTENCIA ${memberType}`, PAGE_WIDTH / 2, 14, {
    align: "center",
  })

  drawLogo(pdf, logo)

  if (showDate) {
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(9)
    pdf.text(`DÍA: ${dateLabel}`, MARGIN_X + 1, 24.5)

    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.3)
    pdf.line(MARGIN_X, 26.5, MARGIN_X + 72, 26.5)
  }
}

function drawTableHeader(pdf: jsPDF) {
  const tableX = MARGIN_X
  const nameX = tableX + NUMBER_COLUMN_WIDTH
  const morningX = nameX + NAME_COLUMN_WIDTH
  const afternoonX = morningX + ATTENDANCE_COLUMN_WIDTH * 4
  const groupTop = TABLE_TOP
  const subTop = TABLE_TOP + GROUP_HEADER_HEIGHT

  pdf.setDrawColor(0, 0, 0)
  pdf.setLineWidth(0.2)

  // El número y los nombres ocupan las dos filas del encabezado.
  pdf.rect(tableX, groupTop, NUMBER_COLUMN_WIDTH, HEADER_HEIGHT)
  pdf.rect(nameX, groupTop, NAME_COLUMN_WIDTH, HEADER_HEIGHT)

  // Grupos MAÑANA y TARDE.
  pdf.rect(morningX, groupTop, ATTENDANCE_COLUMN_WIDTH * 4, GROUP_HEADER_HEIGHT)
  pdf.rect(afternoonX, groupTop, ATTENDANCE_COLUMN_WIDTH * 4, GROUP_HEADER_HEIGHT)

  // Subcolumnas de cada jornada.
  for (let index = 0; index < 8; index += 1) {
    pdf.rect(
      morningX + index * ATTENDANCE_COLUMN_WIDTH,
      subTop,
      ATTENDANCE_COLUMN_WIDTH,
      SUBHEADER_HEIGHT,
    )
  }

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8.5)
  pdf.text(
    "NOMBRES Y APELLIDOS",
    nameX + NAME_COLUMN_WIDTH / 2,
    groupTop + HEADER_HEIGHT / 2 + 2.5,
    { align: "center" },
  )

  pdf.setFontSize(9)
  pdf.text(
    "MAÑANA",
    morningX + ATTENDANCE_COLUMN_WIDTH * 2,
    groupTop + GROUP_HEADER_HEIGHT / 2 + 2.5,
    { align: "center" },
  )
  pdf.text(
    "TARDE",
    afternoonX + ATTENDANCE_COLUMN_WIDTH * 2,
    groupTop + GROUP_HEADER_HEIGHT / 2 + 2.5,
    { align: "center" },
  )

  const subheaderLabels = [
    ["HORA DE", "INGRESO"],
    ["FIRMA DE", "INGRESO"],
    ["HORA DE", "SALIDA"],
    ["FIRMA DE", "SALIDA"],
    ["HORA DE", "INGRESO"],
    ["FIRMA DE", "INGRESO"],
    ["HORA DE", "SALIDA"],
    ["FIRMA DE", "SALIDA"],
  ]

  pdf.setFontSize(7.2)
  subheaderLabels.forEach((lines, index) => {
    const centerX =
      morningX + index * ATTENDANCE_COLUMN_WIDTH + ATTENDANCE_COLUMN_WIDTH / 2
    pdf.text(lines[0], centerX, subTop + 4.8, { align: "center" })
    pdf.text(lines[1], centerX, subTop + 9.2, { align: "center" })
  })
}

function drawName(
  pdf: jsPDF,
  name: string,
  x: number,
  y: number,
  rowHeight: number,
  baseFontSize: number,
) {
  const maxWidth = NAME_COLUMN_WIDTH - 4
  const maxLines = rowHeight >= 5 ? 2 : 1
  let fontSize = baseFontSize

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(fontSize)

  let lines: string[] = pdf.splitTextToSize(name, maxWidth)
  while (lines.length > maxLines && fontSize > 4) {
    fontSize -= 0.25
    pdf.setFontSize(fontSize)
    lines = pdf.splitTextToSize(name, maxWidth)
  }

  if (lines.length > maxLines) {
    const lastLine = lines[maxLines - 1] ?? ""
    let trimmed = lastLine
    while (trimmed.length > 0 && pdf.getTextWidth(`${trimmed}…`) > maxWidth) {
      trimmed = trimmed.slice(0, -1)
    }
    lines = [...lines.slice(0, maxLines - 1), `${trimmed}…`]
  }

  const lineHeight = Math.max(1.6, fontSize * 0.45)
  const blockHeight = lines.length * lineHeight
  const ascent = fontSize * 0.35
  const startY = y + (rowHeight - blockHeight) / 2 + ascent

  lines.forEach((line, index) => {
    pdf.text(line, x, startY + index * lineHeight)
  })
}

function drawRow(
  pdf: jsPDF,
  y: number,
  rowNumber: number,
  name: string | undefined,
  rowHeight: number,
  nameFontSize: number,
  numberFontSize: number,
) {
  const tableX = MARGIN_X
  const nameX = tableX + NUMBER_COLUMN_WIDTH
  const attendanceX = nameX + NAME_COLUMN_WIDTH

  pdf.setDrawColor(0, 0, 0)
  pdf.setLineWidth(0.2)

  pdf.rect(tableX, y, NUMBER_COLUMN_WIDTH, rowHeight)
  pdf.rect(nameX, y, NAME_COLUMN_WIDTH, rowHeight)

  for (let index = 0; index < 8; index += 1) {
    pdf.rect(
      attendanceX + index * ATTENDANCE_COLUMN_WIDTH,
      y,
      ATTENDANCE_COLUMN_WIDTH,
      rowHeight,
    )
  }

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(numberFontSize)
  pdf.setTextColor(0, 0, 0)
  pdf.text(
    String(rowNumber),
    tableX + NUMBER_COLUMN_WIDTH / 2,
    y + rowHeight / 2 + numberFontSize * 0.32,
    { align: "center" },
  )

  if (name?.trim()) {
    drawName(pdf, name.trim(), nameX + 2, y, rowHeight, nameFontSize)
  }
}

function drawTableFrame(pdf: jsPDF) {
  pdf.setDrawColor(0, 0, 0)
  pdf.setLineWidth(0.35)
  pdf.rect(MARGIN_X, TABLE_TOP, CONTENT_WIDTH, TABLE_BOTTOM - TABLE_TOP)
}

export async function generateAttendancePdf(
  options: AttendancePdfOptions,
): Promise<jsPDF> {
  const members = options.members
    .map((member) => ({ name: member.name?.trim() ?? "" }))
    .filter((member) => member.name.length > 0)

  if (members.length === 0) {
    throw new Error("No hay registros para generar el registro de asistencia.")
  }

  const date = options.date ?? new Date()
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  pdf.setProperties({
    title: `Registro de Asistencia ${options.memberType}`,
    subject:
      options.processName?.trim() ||
      `Registro de asistencia ${options.memberType}`,
    creator: "Sistema de Gestión Electoral",
  })

  const processLogo = options.processImageUrl
    ? await loadImage(options.processImageUrl)
    : null
  const logo = processLogo ?? (await loadImage(FALLBACK_LOGO_URL))
  const dateLabel = formatDisplayDate(date)
  const layout = getAttendanceLayout(members.length)

  for (let page = 0; page < layout.totalPages; page += 1) {
    if (page > 0) {
      pdf.addPage()
    }

    drawPageHeading(pdf, logo, options.memberType, dateLabel, page === 0)
    drawTableHeader(pdf)

    const pageMembers = members.slice(
      page * layout.rowsPerPage,
      (page + 1) * layout.rowsPerPage,
    )

    for (let row = 0; row < layout.rowsPerPage; row += 1) {
      const member = pageMembers[row]
      drawRow(
        pdf,
        TABLE_TOP + HEADER_HEIGHT + row * layout.rowHeight,
        page * layout.rowsPerPage + row + 1,
        member?.name,
        layout.rowHeight,
        layout.nameFontSize,
        layout.numberFontSize,
      )
    }

    drawTableFrame(pdf)
  }

  return pdf
}

export async function exportAttendancePDF(
  options: AttendancePdfOptions,
): Promise<void> {
  const pdf = await generateAttendancePdf(options)
  const date = options.date ?? new Date()
  const processName =
    sanitizeFileName(options.processName || "") || "Proceso_Electoral"

  pdf.save(
    `Registro_Asistencia_${options.memberType}_${processName}_${formatFileDate(date)}.pdf`,
  )
}
