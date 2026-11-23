import jsPDF from "jspdf"

import { sanitizeFileName } from "@/lib/acta-utils"

export type KitLabelItem = {
  id: string
  name: string
  canton: string | null
  parish: string | null
}

export type KitLabelsPdfOptions = {
  items: KitLabelItem[]
  processName?: string | null
  processImageUrl?: string | null
}

type LoadedImage = {
  dataUrl: string
  aspectRatio: number
}

const PAGE_WIDTH = 297
const PAGE_HEIGHT = 210
const SLOT_WIDTH = PAGE_WIDTH / 2
const SLOT_HEIGHT = PAGE_HEIGHT / 2
const CONTENT_MARGIN = 10
const SLOT_CONTENT_WIDTH = SLOT_WIDTH - CONTENT_MARGIN * 2
const DEFAULT_IMAGE_URL = "/images/CNE_Ec.png"

const COLOR_NAVY: [number, number, number] = [21, 62, 92]
const COLOR_TEXT: [number, number, number] = [35, 39, 43]
const COLOR_MUTED: [number, number, number] = [110, 118, 126]

function loadImage(url: string): Promise<LoadedImage | null> {
  if (typeof window === "undefined" || typeof Image === "undefined") {
    return Promise.resolve(null)
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

async function loadProcessImage(url?: string | null): Promise<LoadedImage | null> {
  if (url) {
    const image = await loadImage(url)
    if (image) return image
  }

  return loadImage(DEFAULT_IMAGE_URL)
}

function drawCutLines(pdf: jsPDF) {
  pdf.setDrawColor(180, 186, 194)
  pdf.setLineWidth(0.2)
  pdf.setLineDashPattern([2.5, 2.5], 0)
  pdf.line(SLOT_WIDTH, 5, SLOT_WIDTH, PAGE_HEIGHT - 5)
  pdf.line(5, SLOT_HEIGHT, PAGE_WIDTH - 5, SLOT_HEIGHT)
  pdf.setLineDashPattern([], 0)
}

function drawField(
  pdf: jsPDF,
  label: string,
  value: string | null | undefined,
  centerX: number,
  top: number,
  options?: {
    fontSize?: number
    valueOffset?: number
    maxLines?: number
    uppercase?: boolean
    fitOneLine?: boolean
  },
) {
  const fontSize = options?.fontSize ?? 17
  const valueOffset = options?.valueOffset ?? 10
  const maxLines = options?.maxLines ?? 2
  const maxWidth = SLOT_CONTENT_WIDTH - 4

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8)
  pdf.setTextColor(...COLOR_MUTED)
  pdf.setCharSpace(0.6)
  pdf.text(label.toUpperCase(), centerX, top, { align: "center" })
  pdf.setCharSpace(0)

  pdf.setFont("helvetica", "bold")
  pdf.setTextColor(...COLOR_TEXT)

  const rawValue = (value || "—").trim()
  const text = options?.uppercase ? rawValue.toUpperCase() : rawValue

  let currentFontSize = fontSize
  pdf.setFontSize(currentFontSize)
  let lines = pdf.splitTextToSize(text, maxWidth)

  if (options?.fitOneLine) {
    // Los textos largos se reducen levemente para evitar que se encimen con la sección siguiente.
    while (lines.length > 1 && currentFontSize > 12) {
      currentFontSize -= 0.5
      pdf.setFontSize(currentFontSize)
      lines = pdf.splitTextToSize(text, maxWidth)
    }
  } else if (lines.length > maxLines) {
    currentFontSize = Math.max(fontSize - 3, 10)
    pdf.setFontSize(currentFontSize)
    lines = pdf.splitTextToSize(text, maxWidth)
  }

  lines.slice(0, maxLines).forEach((line: string, index: number) => {
    pdf.text(line, centerX, top + valueOffset + index * (currentFontSize * 0.42), {
      align: "center",
    })
  })
}

function drawLabel(
  pdf: jsPDF,
  item: KitLabelItem,
  column: number,
  row: number,
  processImage: LoadedImage | null,
) {
  const slotX = column * SLOT_WIDTH
  const slotY = row * SLOT_HEIGHT
  const centerX = slotX + SLOT_WIDTH / 2

  // Marco de la etiqueta.
  pdf.setDrawColor(190, 196, 204)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(slotX + 4, slotY + 4, SLOT_WIDTH - 8, SLOT_HEIGHT - 8, 2.5, 2.5, "S")

  // Logo del proceso electoral, esquina superior derecha.
  if (processImage) {
    const maxWidth = 64
    const maxHeight = 26
    let imageWidth = maxWidth
    let imageHeight = imageWidth / processImage.aspectRatio

    if (imageHeight > maxHeight) {
      imageHeight = maxHeight
      imageWidth = imageHeight * processImage.aspectRatio
    }

    const imageX = slotX + SLOT_WIDTH - CONTENT_MARGIN - imageWidth
    const imageY = slotY + 6 + (maxHeight - imageHeight) / 2
    pdf.addImage(processImage.dataUrl, "PNG", imageX, imageY, imageWidth, imageHeight)
  }

  // Título institucional.
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(11)
  pdf.setTextColor(...COLOR_NAVY)
  const titleLines = ["Consejo Nacional Electoral", "Delegación Morona Santiago"]
  titleLines.forEach((line: string, index: number) => {
    pdf.text(line, slotX + CONTENT_MARGIN, slotY + 15 + index * 5.6)
  })

  // Separador del encabezado.
  const separatorY = slotY + 35
  pdf.setDrawColor(...COLOR_NAVY)
  pdf.setLineWidth(0.5)
  pdf.line(slotX + CONTENT_MARGIN, separatorY, slotX + SLOT_WIDTH - CONTENT_MARGIN, separatorY)

  // Datos del recinto, centrados en la etiqueta.
  drawField(pdf, "Cantón", item.canton, centerX, slotY + 40, {
    fontSize: 17,
    valueOffset: 10.5,
    maxLines: 1,
    uppercase: true,
    fitOneLine: true,
  })
  drawField(pdf, "Parroquia", item.parish, centerX, slotY + 59, {
    fontSize: 17,
    valueOffset: 10.5,
    maxLines: 1,
    uppercase: true,
    fitOneLine: true,
  })
  drawField(pdf, "Nombre del recinto", item.name, centerX, slotY + 78, {
    fontSize: 20,
    valueOffset: 10.5,
    maxLines: 2,
  })
}

/**
 * Construye el PDF de etiquetas de kits con cuatro recintos por hoja horizontal.
 * Se expone por separado para poder reutilizarlo sin iniciar una descarga.
 */
export async function generateKitLabelsPdf(options: KitLabelsPdfOptions): Promise<jsPDF> {
  if (!options.items.length) {
    throw new Error("No hay recintos seleccionados para generar las etiquetas.")
  }

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  pdf.setProperties({
    title: "Etiquetas Kits",
    subject: options.processName || "Etiquetas de kits",
    creator: "Sistema de Gestión Electoral",
  })

  const processImage = await loadProcessImage(options.processImageUrl)

  options.items.forEach((item, index) => {
    const positionInPage = index % 4

    if (index > 0 && positionInPage === 0) {
      pdf.addPage()
    }

    const column = positionInPage % 2
    const row = Math.floor(positionInPage / 2)

    drawLabel(pdf, item, column, row, processImage)

    // Líneas de corte entre las cuatro etiquetas de la hoja.
    if (positionInPage === 0) {
      drawCutLines(pdf)
    }
  })

  return pdf
}

export async function exportKitLabelsPDF(options: KitLabelsPdfOptions): Promise<void> {
  const pdf = await generateKitLabelsPdf(options)
  const processName = sanitizeFileName(options.processName || "Proceso_Electoral")
  const date = new Date().toISOString().split("T")[0]
  pdf.save(`Etiquetas_Kits_${processName}_${date}.pdf`)
}
