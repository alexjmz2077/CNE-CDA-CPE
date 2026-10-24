import jsPDF from "jspdf"

import { getActaDateParts, sanitizeFileName } from "@/lib/acta-utils"

export type ActaItem = {
  description: string
  quantity: number
  status: string
}

export type ActaRecipient = {
  name: string
  cedula: string
  cargo: string
  memberType: string
  role: string
  precinct?: string | null
  items: ActaItem[]
}

export type ActaPdfOptions = {
  city: string
  date: string
  object: string
  processName?: string
  institutionalSignerName: string
  institutionalSignerPosition: string
  institutionalSignerCedula?: string
  recipients: ActaRecipient[]
}

type LoadedLogo = {
  dataUrl: string
  aspectRatio: number
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN_X = 18
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const CONTENT_TOP = 52
const CONTENT_BOTTOM = 267
const FOOTER_LINE_Y = 278
const SIGNATURE_BLOCK_HEIGHT = 58

const COLOR_NAVY: [number, number, number] = [21, 62, 92]
const COLOR_GOLD: [number, number, number] = [229, 181, 22]
const COLOR_TEXT: [number, number, number] = [35, 39, 43]
const COLOR_MUTED: [number, number, number] = [110, 118, 126]
const COLOR_TABLE_HEAD: [number, number, number] = [235, 240, 245]

const TABLE_COLUMNS = [
  { key: "item", width: 14, align: "center" as const },
  { key: "description", width: 108, align: "left" as const },
  { key: "quantity", width: 18, align: "center" as const },
  { key: "status", width: 34, align: "center" as const },
]

async function loadImage(url: string): Promise<LoadedLogo | null> {
  if (typeof window === "undefined" || typeof Image === "undefined") return null

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

function drawLetterhead(pdf: jsPDF, logo: LoadedLogo | null, processName?: string) {
  // Decoración institucional en las esquinas.
  pdf.setFillColor(...COLOR_GOLD)
  pdf.triangle(0, 0, 32, 0, 0, 60, "F")
  pdf.setFillColor(...COLOR_NAVY)
  pdf.triangle(0, 0, 22, 0, 0, 42, "F")

  pdf.setFillColor(...COLOR_GOLD)
  pdf.triangle(PAGE_WIDTH, PAGE_HEIGHT, PAGE_WIDTH - 28, PAGE_HEIGHT, PAGE_WIDTH, PAGE_HEIGHT - 46, "F")
  pdf.setFillColor(...COLOR_NAVY)
  pdf.triangle(PAGE_WIDTH, PAGE_HEIGHT, PAGE_WIDTH - 18, PAGE_HEIGHT, PAGE_WIDTH, PAGE_HEIGHT - 30, "F")

  // Encabezado izquierdo.
  pdf.setTextColor(...COLOR_NAVY)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(5.6)
  pdf.text("DELEGACIÓN PROVINCIAL ELECTORAL DE", 25, 17)
  pdf.text("MORONA SANTIAGO", 25, 20.4)

  // Logotipo institucional.
  if (logo) {
    const logoHeight = 18
    const logoWidth = logoHeight * logo.aspectRatio
    pdf.addImage(
      logo.dataUrl,
      "PNG",
      PAGE_WIDTH / 2 - logoWidth / 2,
      7.5,
      logoWidth,
      logoHeight,
    )
  } else {
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(15)
    pdf.setTextColor(...COLOR_NAVY)
    pdf.text("CNE", PAGE_WIDTH / 2, 18, { align: "center" })
  }

  // Identificación del proceso electoral.
  const rightText = processName?.trim() || "ELECCIONES SECCIONALES Y CPCCS 2027"
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(5.8)
  pdf.setTextColor(...COLOR_NAVY)
  const rightLines = pdf.splitTextToSize(rightText.toUpperCase(), 55).slice(0, 3)
  rightLines.forEach((line: string, index: number) => {
    pdf.text(line, PAGE_WIDTH - 18, 12.5 + index * 3, { align: "right" })
  })

  if (/2027/.test(rightText)) {
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(5)
    pdf.setTextColor(180, 140, 0)
    pdf.text(
      "76 años de democracia",
      PAGE_WIDTH - 18,
      12.5 + rightLines.length * 3 + 1.4,
      { align: "right" },
    )
  }

  // Línea separadora del encabezado.
  pdf.setDrawColor(205, 211, 218)
  pdf.setLineWidth(0.25)
  pdf.line(MARGIN_X, 32, PAGE_WIDTH - MARGIN_X, 32)

  drawFooter(pdf)
}

function drawFooter(pdf: jsPDF) {
  pdf.setDrawColor(210, 216, 222)
  pdf.setLineWidth(0.2)
  pdf.line(MARGIN_X, FOOTER_LINE_Y, PAGE_WIDTH - MARGIN_X, FOOTER_LINE_Y)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(6.4)
  pdf.setTextColor(...COLOR_MUTED)
  pdf.text("Dirección: Manuel Moncayo y 24 de mayo", PAGE_WIDTH / 2, 282.5, {
    align: "center",
  })
  pdf.text("Teléf.: 07 370 1930  |  Macas - Ecuador", PAGE_WIDTH / 2, 286.2, {
    align: "center",
  })
}

function drawPageTitle(pdf: jsPDF, continuation = false) {
  pdf.setFont("times", "bold")
  pdf.setFontSize(continuation ? 12 : 14)
  pdf.setTextColor(...COLOR_NAVY)
  pdf.text(
    continuation
      ? "ACTA ENTREGA - RECEPCIÓN (continuación)"
      : "ACTA ENTREGA - RECEPCIÓN",
    PAGE_WIDTH / 2,
    42,
    { align: "center" },
  )

  pdf.setDrawColor(...COLOR_NAVY)
  pdf.setLineWidth(0.35)
  const lineWidth = continuation ? 82 : 70
  pdf.line(PAGE_WIDTH / 2 - lineWidth / 2, 44.5, PAGE_WIDTH / 2 + lineWidth / 2, 44.5)
}

function startPage(pdf: jsPDF, logo: LoadedLogo | null, processName: string | undefined, continuation: boolean) {
  if (continuation) {
    pdf.addPage()
  }
  drawLetterhead(pdf, logo, processName)
  drawPageTitle(pdf, continuation)
  return CONTENT_TOP
}

function drawParagraph(pdf: jsPDF, text: string, y: number, options?: { fontSize?: number; lineHeight?: number }) {
  const fontSize = options?.fontSize ?? 9.5
  const lineHeight = options?.lineHeight ?? 4.65

  pdf.setFont("times", "normal")
  pdf.setFontSize(fontSize)
  pdf.setTextColor(...COLOR_TEXT)

  const lines = pdf.splitTextToSize(text, CONTENT_WIDTH)
  lines.forEach((line: string) => {
    pdf.text(line, MARGIN_X, y)
    y += lineHeight
  })

  return y
}

function getTableRowHeight(pdf: jsPDF, item: ActaItem): number {
  pdf.setFont("times", "normal")
  pdf.setFontSize(8.6)
  const description = item.description?.trim() || "-"
  const lines = pdf.splitTextToSize(description, TABLE_COLUMNS[1].width - 6)
  return Math.max(7.5, lines.length * 3.7 + 3.6)
}

function drawTableHeader(pdf: jsPDF, y: number): number {
  const height = 7.5

  pdf.setFillColor(...COLOR_TABLE_HEAD)
  pdf.rect(MARGIN_X, y, CONTENT_WIDTH, height, "F")

  pdf.setDrawColor(130, 140, 150)
  pdf.setLineWidth(0.2)
  pdf.rect(MARGIN_X, y, CONTENT_WIDTH, height, "S")

  pdf.setFont("times", "bold")
  pdf.setFontSize(8)
  pdf.setTextColor(...COLOR_NAVY)

  let x = MARGIN_X
  const labels = ["ITEM", "DESCRIPCIÓN", "CANT.", "ESTADO"]
  TABLE_COLUMNS.forEach((column, index) => {
    if (index > 0) {
      pdf.line(x, y, x, y + height)
    }
    pdf.text(labels[index], x + column.width / 2, y + height / 2 + 1.1, {
      align: "center",
    })
    x += column.width
  })

  return y + height
}

function drawTableRow(pdf: jsPDF, y: number, index: number, item: ActaItem): number {
  const height = getTableRowHeight(pdf, item)
  const description = item.description?.trim() || "-"
  const quantity = Number.isFinite(item.quantity) ? item.quantity : 1
  const status = item.status?.trim() || "Bueno"

  pdf.setDrawColor(150, 158, 166)
  pdf.setLineWidth(0.18)
  pdf.rect(MARGIN_X, y, CONTENT_WIDTH, height, "S")

  let x = MARGIN_X
  TABLE_COLUMNS.forEach((column, columnIndex) => {
    if (columnIndex > 0) {
      pdf.line(x, y, x, y + height)
    }

    pdf.setTextColor(...COLOR_TEXT)

    if (column.key === "description") {
      pdf.setFont("times", "normal")
      pdf.setFontSize(8.6)
      const lines = pdf.splitTextToSize(description, column.width - 6)
      const textY = y + (height - lines.length * 3.7) / 2 + 3
      lines.forEach((line: string, lineIndex: number) => {
        pdf.text(line, x + 3, textY + lineIndex * 3.7)
      })
    } else {
      pdf.setFont("times", "normal")
      pdf.setFontSize(8.4)
      const value =
        column.key === "item" ? String(index + 1) : column.key === "quantity" ? String(quantity) : status
      pdf.text(value, x + column.width / 2, y + height / 2 + 1.1, {
        align: "center",
      })
    }

    x += column.width
  })

  return y + height
}

function drawClosingParagraph(pdf: jsPDF, y: number): number {
  return drawParagraph(
    pdf,
    "Para constancia de lo actuado en fe de conformidad y aceptación, suscriben la presente acta en dos ejemplares de igual tenor y efecto las personas que han intervenido en esta diligencia.",
    y,
    { fontSize: 9, lineHeight: 4.4 },
  )
}

function drawSignatureText(
  pdf: jsPDF,
  params: {
    centerX: number
    y: number
    name: string
    cedula: string
    cargo: string
    isInstitutional?: boolean
  },
) {
  const maxWidth = 68
  const { centerX, y, name, cedula, cargo, isInstitutional } = params

  pdf.setTextColor(...COLOR_TEXT)
  pdf.setFont("times", "bold")
  pdf.setFontSize(8.5)
  const nameLines = pdf.splitTextToSize(name, maxWidth)
  nameLines.forEach((line: string, index: number) => {
    pdf.text(line, centerX, y + index * 3.5, { align: "center" })
  })

  let currentY = y + nameLines.length * 3.5 + 3.4

  pdf.setFont("times", "normal")
  pdf.setFontSize(7.8)
  const cedulaText = cedula?.trim()
    ? `C.I. ${cedula.trim()}`
    : "C.I. ____________________________"
  pdf.text(cedulaText, centerX, currentY, { align: "center" })
  currentY += 4

  const cargoLabel = isInstitutional ? "CARGO: " : "Cargo: "
  const cargoLines = pdf.splitTextToSize(`${cargoLabel}${cargo}`, maxWidth)
  pdf.setFontSize(7.2)
  cargoLines.forEach((line: string, index: number) => {
    pdf.text(line, centerX, currentY + index * 3.2, { align: "center" })
  })
}

function drawSignatures(
  pdf: jsPDF,
  y: number,
  options: ActaPdfOptions,
  recipient: ActaRecipient,
) {
  const leftX = 59
  const rightX = 151
  const labelY = y + 7

  pdf.setFont("times", "bold")
  pdf.setFontSize(9.2)
  pdf.setTextColor(...COLOR_TEXT)
  pdf.text("ENTREGA CONFORME", leftX, labelY, { align: "center" })
  pdf.text("RECIBE CONFORME", rightX, labelY, { align: "center" })

  drawSignatureText(pdf, {
    centerX: leftX,
    y: labelY + 16,
    name: options.institutionalSignerName,
    cedula: options.institutionalSignerCedula ?? "",
    cargo: options.institutionalSignerPosition,
    isInstitutional: true,
  })

  drawSignatureText(pdf, {
    centerX: rightX,
    y: labelY + 16,
    name: recipient.name,
    cedula: recipient.cedula,
    cargo: recipient.cargo,
  })
}

function drawPageNumbers(pdf: jsPDF) {
  const totalPages = pdf.getNumberOfPages()

  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(6.2)
    pdf.setTextColor(...COLOR_MUTED)
    pdf.text(`Página ${page} de ${totalPages}`, PAGE_WIDTH / 2, 291, {
      align: "center",
    })
  }
}

function drawActa(pdf: jsPDF, logo: LoadedLogo | null, options: ActaPdfOptions, recipient: ActaRecipient) {
  const dateParts = getActaDateParts(options.date)
  if (!dateParts) {
    throw new Error("La fecha seleccionada no es válida.")
  }

  let y = startPage(pdf, logo, options.processName, false)

  const objectText = options.object.trim().replace(/\.$/, "")
  const institutionalName = options.institutionalSignerName.trim()
  const institutionalPosition = options.institutionalSignerPosition.trim()
  const recipientName = recipient.name.trim()
  const recipientCedula = recipient.cedula.trim()

  const intro = `En las instalaciones de la Delegación Provincial Electoral de Morona Santiago, en la ciudad de ${options.city.trim()}, a los ${dateParts.long}, se realiza el Acta Entrega Recepción de ${objectText}, entre ${recipientName}${recipientCedula ? ` con C.I. ${recipientCedula}` : ""}, y el ${institutionalName}, ${institutionalPosition} de la Delegación Provincial Electoral de Morona Santiago, según el siguiente detalle:`

  y = drawParagraph(pdf, intro, y)
  y += 5

  const items = recipient.items.length > 0 ? recipient.items : [{ description: "-", quantity: 1, status: "Bueno" }]
  const rowHeights = items.map((item) => getTableRowHeight(pdf, item))
  const closingAndSignatureHeight = 17 + SIGNATURE_BLOCK_HEIGHT

  y = drawTableHeader(pdf, y)

  items.forEach((item, index) => {
    const rowHeight = rowHeights[index]
    const remainingRowsHeight = rowHeights
      .slice(index)
      .reduce((total, height) => total + height, 0)
    const remainingFitsOnFreshPage =
      remainingRowsHeight + closingAndSignatureHeight <= CONTENT_BOTTOM - CONTENT_TOP

    const shouldBreakForSignatures =
      index > 0 &&
      remainingFitsOnFreshPage &&
      y + remainingRowsHeight + closingAndSignatureHeight > CONTENT_BOTTOM &&
      y >= CONTENT_BOTTOM - 72

    if (shouldBreakForSignatures || y + rowHeight > CONTENT_BOTTOM) {
      y = startPage(pdf, logo, options.processName, true)
      y = drawTableHeader(pdf, y)
    }
    y = drawTableRow(pdf, y, index, item)
  })

  y += 5

  if (y + 13 + SIGNATURE_BLOCK_HEIGHT > CONTENT_BOTTOM) {
    y = startPage(pdf, logo, options.processName, true)
  }

  y = drawClosingParagraph(pdf, y)
  y += 4

  if (y + SIGNATURE_BLOCK_HEIGHT > CONTENT_BOTTOM) {
    y = startPage(pdf, logo, options.processName, true)
  }

  drawSignatures(pdf, y, options, recipient)
}

/**
 * Construye el documento PDF con un acta por página. Se expone por separado
 * para poder reutilizarlo o probarlo sin iniciar una descarga.
 */
export async function generateActasPdf(options: ActaPdfOptions): Promise<jsPDF> {
  if (!options.recipients.length) {
    throw new Error("No hay registros filtrados para generar actas.")
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  pdf.setProperties({
    title: "Actas de Entrega - Recepción",
    subject: options.processName || "Actas de entrega - recepción",
    creator: "Sistema de Gestión Electoral",
  })

  const logo = await loadImage("/images/CNE_Ec.png")

  options.recipients.forEach((recipient, index) => {
    if (index > 0) {
      pdf.addPage()
    }
    drawActa(pdf, logo, options, recipient)
  })

  drawPageNumbers(pdf)
  return pdf
}

export async function exportActasPDF(options: ActaPdfOptions): Promise<void> {
  const pdf = await generateActasPdf(options)
  const processName = sanitizeFileName(options.processName || "Proceso_Electoral")
  pdf.save(`Actas_Entrega_Recepcion_${processName}_${options.date}.pdf`)
}
