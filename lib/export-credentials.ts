import jsPDF from "jspdf"

type CredentialData = {
  name: string
  secondName: string | null
  cedula: string
  role: string
}

const roleColors: Record<string, string> = {
  "Operador de Escáner": "#00b376",
  "Digitador": "#016357",
  "Supervisor": "#006cb0",
  "Revisor de Firmas": "#f04e54",
  "Archivador de Actas": "#ef2b4f",
  "Receptor de Actas": "#8a2429",
  "CDA": "#00b376",
}

const getRoleDisplay = (role: string): string => {
  return role === "CDA" ? "Operador de Escáner" : role
}

export async function exportCredentials(data: CredentialData[], processName: string) {
  const pdf = new jsPDF({
    orientation: "portrait", // Cambiado a portrait
    unit: "cm",
    format: "a4",
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const credentialWidth = 9 // cm (mantiene el mismo tamaño)
  const credentialHeight = 13 // cm (mantiene el mismo tamaño)
  
  // Calcular márgenes para centrar las credenciales
  const horizontalMargin = (pageWidth - credentialWidth * 2) / 3 // Espacio entre y alrededor de las columnas
  const verticalMargin = (pageHeight - credentialHeight * 2) / 3 // Espacio entre y alrededor de las filas

  let credentialCount = 0

  for (let i = 0; i < data.length; i++) {
    const member = data[i]
    const positionInPage = credentialCount % 4 // 0, 1, 2, 3
    
    // Si es la quinta credencial (índice 4, 8, 12...), agregar nueva página
    if (credentialCount > 0 && credentialCount % 4 === 0) {
      pdf.addPage()
    }

    // Calcular posición basada en una cuadrícula 2x2
    const col = positionInPage % 2 // 0 = izquierda, 1 = derecha
    const row = Math.floor(positionInPage / 2) // 0 = arriba, 1 = abajo

    // Calcular posición X de la credencial
    const xOffset = horizontalMargin + col * (credentialWidth + horizontalMargin)

    // Calcular posición Y de la credencial
    const yOffset = verticalMargin + row * (credentialHeight + verticalMargin)

    // Dibujar borde de credencial
    pdf.setDrawColor(200)
    pdf.setLineWidth(0.02)
    pdf.rect(xOffset, yOffset, credentialWidth, credentialHeight)

    // Cargar y agregar imagen del CNE
    try {
      const { imgData, aspectRatio } = await loadImageWithAspectRatio("/images/CNE_Ec.png")
      // Mantener proporciones originales de la imagen
      const imgHeight = 1.8
      const imgWidth = imgHeight * aspectRatio
      const imgX = xOffset + (credentialWidth - imgWidth) / 2
      const imgY = yOffset + 0.5
      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth, imgHeight)
    } catch (error) {
      console.error("Error loading CNE image:", error)
    }

    // Agregar figura decorativa azul en esquina superior derecha
    const curveSize = 2.5 // Tamaño de la curva en cm
    const curveX = xOffset + credentialWidth
    const curveY = yOffset
    
    // Dibujar la figura curva azul
    pdf.setFillColor(41, 101, 171) // Color #2965ab
    pdf.setDrawColor(41, 101, 171)
    
    // Crear path para la figura curva
    // Comenzar en la esquina superior derecha
    pdf.moveTo(curveX, curveY)
    
    // Línea hacia abajo
    pdf.lineTo(curveX, curveY + curveSize)
    
    // Curva bezier cuadrática hacia la izquierda
    // Punto de control en el medio para crear la curva
    const controlX = curveX - curveSize * 0.01
    const controlY = curveY + curveSize * 0.01
    pdf.curveTo(
      curveX, curveY + curveSize,           // Punto inicial
      controlX, controlY,                    // Punto de control
      curveX - curveSize, curveY             // Punto final
    )
    
    // Línea de regreso a la esquina
    pdf.lineTo(curveX, curveY)
    
    // Rellenar la figura
    pdf.fill()

    // Área de foto - rectángulo vertical con bordes redondeados
    const photoWidth = 3 // cm
    const photoHeight = 4 // cm
    const photoX = xOffset + (credentialWidth - photoWidth) / 2
    const photoY = yOffset + 3
    const cornerRadius = 0.1
    pdf.setDrawColor(200)
    pdf.setLineWidth(0.02)
    pdf.roundedRect(photoX, photoY, photoWidth, photoHeight, cornerRadius, cornerRadius, 'S')
    pdf.setFontSize(12)
    pdf.setTextColor(180)
    pdf.text("FOTO", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" })

    // Campos de texto - más arriba para no solaparse
    const fieldsY = yOffset + 7.5
    const fieldHeight = 1.1
    const fieldMargin = 0.2

    // Nombres
    pdf.setDrawColor(100)
    pdf.setLineWidth(0.01)
    pdf.roundedRect(xOffset + 0.5, fieldsY, credentialWidth - 1, fieldHeight, cornerRadius, cornerRadius, 'S')
    pdf.setFontSize(12)
    pdf.setTextColor(0)
    pdf.setFont("Tahoma", "normal")
    // Centrar verticalmente el texto en el campo
    pdf.text(member.name || "", xOffset + credentialWidth / 2, fieldsY + fieldHeight / 2, { 
      align: "center",
      baseline: "middle"
    })

    // Apellidos
    pdf.roundedRect(xOffset + 0.5, fieldsY + fieldHeight + fieldMargin, credentialWidth - 1, fieldHeight, cornerRadius, cornerRadius, 'S')
    pdf.text(member.secondName || "", xOffset + credentialWidth / 2, fieldsY + fieldHeight + fieldMargin + fieldHeight / 2, { 
      align: "center",
      baseline: "middle"
    })

    // Cédula
    pdf.roundedRect(xOffset + 0.5, fieldsY + (fieldHeight + fieldMargin) * 2, credentialWidth - 1, fieldHeight, cornerRadius, cornerRadius, 'S')
    pdf.text(member.cedula || "", xOffset + credentialWidth / 2, fieldsY + (fieldHeight + fieldMargin) * 2 + fieldHeight / 2, { 
      align: "center",
      baseline: "middle"
    })

    // Barra de color con rol
    const roleDisplay = getRoleDisplay(member.role || "")
    // Buscar el color usando el rol original (sin transformar)
    let roleColor = roleColors[member.role] || "#000000"
    
    const barHeight = 1.6
    const barY = yOffset + credentialHeight - barHeight

    // Convertir color hex a RGB
    const r = parseInt(roleColor.slice(1, 3), 16)
    const g = parseInt(roleColor.slice(3, 5), 16)
    const b = parseInt(roleColor.slice(5, 7), 16)
    
    pdf.setFillColor(r, g, b)
    pdf.rect(xOffset, barY, credentialWidth, barHeight, "F")

    // Texto del rol
    pdf.setFontSize(19)
    pdf.setFont("Tahoma", "bold")
    pdf.setTextColor(255, 255, 255)
    
    // Dividir el texto en dos líneas si es necesario
    const words = roleDisplay.toUpperCase().split(" ")
    const lineHeight = 0.6 // Espacio de interlineado
    
    if (words.length > 2) {
      const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ")
      const line2 = words.slice(Math.ceil(words.length / 2)).join(" ")
      // Centrar verticalmente las dos líneas
      const totalTextHeight = lineHeight
      const startY = barY + (barHeight - totalTextHeight) / 2
      pdf.text(line1, xOffset + credentialWidth / 2, startY, { 
        align: "center",
        baseline: "middle"
      })
      pdf.text(line2, xOffset + credentialWidth / 2, startY + lineHeight, { 
        align: "center",
        baseline: "middle"
      })
    } else {
      // Centrar verticalmente una línea
      pdf.text(roleDisplay.toUpperCase(), xOffset + credentialWidth / 2, barY + barHeight / 2, { 
        align: "center",
        baseline: "middle"
      })
    }

    credentialCount++
  }

  pdf.save(`Credenciales_${processName}_${new Date().toISOString().split("T")[0]}.pdf`)
}

async function loadImageWithAspectRatio(url: string): Promise<{ imgData: string; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "Anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const imgData = canvas.toDataURL("image/png")
        const aspectRatio = img.width / img.height
        resolve({ imgData, aspectRatio })
      } else {
        reject(new Error("Could not get canvas context"))
      }
    }
    img.onerror = reject
    img.src = url
  })
}