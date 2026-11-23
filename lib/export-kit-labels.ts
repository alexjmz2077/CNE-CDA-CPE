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

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const SLOT_HEIGHT = PAGE_HEIGHT / 2
const CONTENT_X = 16
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_X * 2
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

function drawCutLine(pdf: jsPDF, y: number) {
  pdf.setDrawColor(180, 186, 194)
  pdf.setLineWidth(0.2)
  pdf.setLineDashPattern([2.5, 2.5], 0)
  pdf.line(6, y, PAGE_WIDTH - 6, y)
  pdf.setLineDashPattern([], 0)
}

function drawField(
  pdf: jsPDF,
  label: string,
  value: string | null | undefined,
  top: number,
  options?: { fontSize?: number; valueOffset?: number; maxLines?: number },
) {
  const fontSize = options?.fontSize ?? 15
  const valueOffset = options?.valueOffset ?? 9
  const maxLines = options?.maxLines ?? 2

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8)
  pdf.setTextColor(...COLOR_MUTED)
  pdf.setCharSpace(0.6)
  pdf.text(label.toUpperCase(), CONTENT_X, top)
  pdf.setCharSpace(0)

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(fontSize)
  pdf.setTextColor(...COLOR_TEXT)

  const lines = pdf.splitTextToSize((value || "—").trim(), CONTENT_WIDTH - 2)
  lines.slice(0, maxLines).forEach((line: string, index: number) => {
    pdf.text(line, CONTENT_X, top + valueOffset + index * (fontSize * 0.42))
  })
}

function drawLabel(
  pdf: jsPDF,
  item: KitLabelItem,
  slotIndex: number,
  processImage: LoadedImage | null,
) {
  const slotY = slotIndex * SLOT_HEIGHT

  // Marco de la etiqueta.
  pdf.setDrawColor(190, 196, 204)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(8, slotY + 8, PAGE_WIDTH - 16, SLOT_HEIGHT - 16, 2.5, 2.5, "S")

  // Logo del proceso electoral, esquina superior derecha.
  let titleWidth = CONTENT_WIDTH
  if (processImage) {
    const maxWidth = 52
    const maxHeight = 20
    let imageWidth = maxWidth
    let imageHeight = imageWidth / processImage.aspectRatio

    if (imageHeight > maxHeight) {
      imageHeight = maxHeight
      imageWidth = imageHeight * processImage.aspectRatio
    }

    pdf.addImage(
      processImage.dataUrl,
      "PNG",
      PAGE_WIDTH - CONTENT_X - imageWidth,
      slotY + 17,
      imageWidth,
      imageHeight,
    )

    titleWidth = CONTENT_WIDTH - imageWidth - 8
  }

  // Título institucional.
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(13.5)
  pdf.setTextColor(...COLOR_NAVY)
  const titleLines = pdf.splitTextToSize(
    "Consejo Nacional Electoral Delegación Morona Santiago",
    titleWidth,
  )
  titleLines.slice(0, 3).forEach((line: string, index: number) => {
    pdf.text(line, CONTENT_X, slotY + 25 + index * 7)
  })

  // Separador del encabezado.
  const separatorY = slotY + 46
  pdf.setDrawColor(...COLOR_NAVY)
  pdf.setLineWidth(0.6)
  pdf.line(CONTENT_X, separatorY, PAGE_WIDTH - CONTENT_X, separatorY)

  // Datos del recinto.
  drawField(pdf, "Cantón", item.canton, slotY + 61, {
    fontSize: 16,
    valueOffset: 9.5,
    maxLines: 1,
  })
  drawField(pdf, "Parroquia", item.parish, slotY + 82, {
    fontSize: 16,
    valueOffset: 9.5,
    maxLines: 1,
  })
  drawField(pdf, "Nombre del recinto", item.name, slotY + 104, {
    fontSize: 19,
    valueOffset: 11,
    maxLines: 2,
  })
}

/**
 * Construye el PDF de etiquetas de kits con dos recintos por hoja.
 * Se expone por separado para poder reutilizarlo sin iniciar una descarga.
 */
export async function generateKitLabelsPdf(options: KitLabelsPdfOptions): Promise<jsPDF> {
  if (!options.items.length) {
    throw new Error("No hay recintos seleccionados para generar las etiquetas.")
  }

  const pdf = new jsPDF({
    orientation: "portrait",
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
    const positionInPage = index % 2

    if (index > 0 && positionInPage === 0) {
      pdf.addPage()
    }

    drawLabel(pdf, item, positionInPage, processImage)

    // Línea de corte entre las dos etiquetas de la hoja.
    if (positionInPage === 0) {
      drawCutLine(pdf, SLOT_HEIGHT)
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
