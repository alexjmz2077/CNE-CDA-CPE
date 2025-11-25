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

export async function exportCredentials(
  data: CredentialData[], 
  processName: string,
  processImageUrl?: string | null
) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "cm",
    format: "a4",
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const credentialWidth = 9
  const credentialHeight = 13
  
  const horizontalMargin = (pageWidth - credentialWidth * 2) / 3
  const verticalMargin = (pageHeight - credentialHeight * 2) / 3

  let credentialCount = 0

  // Determinar qué imagen usar
  const imageUrl = processImageUrl || "/images/CNE_Ec.png"

  for (let i = 0; i < data.length; i++) {
    const member = data[i]
    const positionInPage = credentialCount % 4
    
    if (credentialCount > 0 && credentialCount % 4 === 0) {
      pdf.addPage()
    }

    const col = positionInPage % 2
    const row = Math.floor(positionInPage / 2)

    const xOffset = horizontalMargin + col * (credentialWidth + horizontalMargin)
    const yOffset = verticalMargin + row * (credentialHeight + verticalMargin)

    // Dibujar borde de credencial
    pdf.setDrawColor(200)
    pdf.setLineWidth(0.02)
    pdf.rect(xOffset, yOffset, credentialWidth, credentialHeight)

    // Cargar y agregar imagen del proceso o CNE
    try {
      const { imgData, aspectRatio } = await loadImageWithAspectRatio(imageUrl)
      const imgHeight = 1.8
      const imgWidth = imgHeight * aspectRatio
      const imgX = xOffset + (credentialWidth - imgWidth) / 2
      const imgY = yOffset + 0.5
      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth, imgHeight)
    } catch (error) {
      console.error("Error loading process image, trying default:", error)
      // Si falla cargar la imagen del proceso, intentar con la por defecto
      try {
        const { imgData, aspectRatio } = await loadImageWithAspectRatio("/images/CNE_Ec.png")
        const imgHeight = 1.8
        const imgWidth = imgHeight * aspectRatio
        const imgX = xOffset + (credentialWidth - imgWidth) / 2
        const imgY = yOffset + 0.5
        pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth, imgHeight)
      } catch (fallbackError) {
        console.error("Error loading default CNE image:", fallbackError)
      }
    }

    // Agregar figura decorativa azul en esquina superior derecha
    const curveSize = 2.5
    const curveX = xOffset + credentialWidth
    const curveY = yOffset
    
    pdf.setFillColor(41, 101, 171)
    pdf.setDrawColor(41, 101, 171)
    
    pdf.moveTo(curveX, curveY)
    pdf.lineTo(curveX, curveY + curveSize)
    
    const controlX = curveX - curveSize * 0.01
    const controlY = curveY + curveSize * 0.01
    pdf.curveTo(
      curveX, curveY + curveSize,
      controlX, controlY,
      curveX - curveSize, curveY
    )
    
    pdf.lineTo(curveX, curveY)
    pdf.fill()

    // Área de foto
    const photoWidth = 3
    const photoHeight = 4
    const photoX = xOffset + (credentialWidth - photoWidth) / 2
    const photoY = yOffset + 3
    const cornerRadius = 0.1
    pdf.setDrawColor(200)
    pdf.setLineWidth(0.02)
    pdf.roundedRect(photoX, photoY, photoWidth, photoHeight, cornerRadius, cornerRadius, 'S')
    pdf.setFontSize(12)
    pdf.setTextColor(180)
    pdf.text("FOTO", photoX + photoWidth / 2, photoY + photoHeight / 2, { align: "center" })

    // Campos de texto
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
    let roleColor = roleColors[member.role] || "#000000"
    
    const barHeight = 1.6
    const barY = yOffset + credentialHeight - barHeight

    const r = parseInt(roleColor.slice(1, 3), 16)
    const g = parseInt(roleColor.slice(3, 5), 16)
    const b = parseInt(roleColor.slice(5, 7), 16)
    
    pdf.setFillColor(r, g, b)
    pdf.rect(xOffset, barY, credentialWidth, barHeight, "F")

    // Texto del rol
    pdf.setFontSize(19)
    pdf.setFont("Tahoma", "bold")
    pdf.setTextColor(255, 255, 255)
    
    const words = roleDisplay.toUpperCase().split(" ")
    const lineHeight = 0.6
    
    if (words.length > 2) {
      const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ")
      const line2 = words.slice(Math.ceil(words.length / 2)).join(" ")
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