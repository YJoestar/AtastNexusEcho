import { QRCodeEntry } from '@/lib/admin'
import { APP_CONFIG } from '@/app/config'

export interface QRDowloadResult {
  success: boolean
  count: number
  error?: string
}

const PAGE_MARGIN_MM = 12
const QR_SIZE_MM = 35
const GAP_MM = 8
const LABEL_HEIGHT_MM = 20

function estimateTextWidthMm(text: string, fontSizePt = 9): number {
  const avgCharWidthPt = fontSizePt * 0.5
  const totalPt = text.length * avgCharWidthPt
  return (totalPt / 72) * 25.4
}

function wrapText(text: string, maxWidthMm: number, fontSizePt = 9, maxLines = 3): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (estimateTextWidthMm(testLine, fontSizePt) <= maxWidthMm) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)

  if (lines.length <= maxLines) return lines
  return lines.slice(0, maxLines - 1).concat(['…'])
}

function truncate(text: string, maxLines: number, fontSizePt = 9, maxWidthMm = QR_SIZE_MM): string {
  const lines = wrapText(text, maxWidthMm, fontSizePt, maxLines)
  return lines.join('\n')
}

export async function generateQRCodeSheet(
  qrCodes: QRCodeEntry[]
): Promise<QRDowloadResult> {
  if (!qrCodes || qrCodes.length === 0) {
    return { success: false, count: 0, error: 'No QR codes to generate' }
  }

  try {
    const QRCodeModule = await import('qrcode')
    const QRCode = QRCodeModule.default ?? QRCodeModule

    const jsPDFModule = await import('jspdf')
    const { jsPDF } = jsPDFModule

    const items = qrCodes.map(qr => ({
      code: qr.code,
      puzzleNodeCode: qr.puzzleNodeCode,
      puzzleNodeTitle: qr.puzzleNodeTitle || qr.puzzleNodeLocation || '',
      puzzleNodeType: qr.puzzleNodeType,
      puzzleNodeStage: qr.puzzleNodeStage,
      puzzleNodeLocation: qr.puzzleNodeLocation,
    }))

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = 210
    const pageHeight = 297
    const availableWidth = pageWidth - 2 * PAGE_MARGIN_MM
    const availableHeight = pageHeight - 2 * PAGE_MARGIN_MM - 10

    const cols = Math.floor((availableWidth + GAP_MM) / (QR_SIZE_MM + GAP_MM))
    const colWidth = (availableWidth + GAP_MM) / cols
    const rowHeight = QR_SIZE_MM + LABEL_HEIGHT_MM + GAP_MM
    const rows = Math.floor((availableHeight + GAP_MM) / rowHeight)

    const itemsPerPage = cols * rows
    const totalPages = Math.ceil(items.length / itemsPerPage)

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (pageIdx > 0) {
        doc.addPage()
      }

      const pageStart = pageIdx * itemsPerPage
      const pageEnd = Math.min(pageStart + itemsPerPage, items.length)

      doc.setFontSize(8)
      doc.setTextColor(60, 60, 60)
      doc.text(
        `${APP_CONFIG.name} — Physical QR Codes`,
        PAGE_MARGIN_MM,
        PAGE_MARGIN_MM - 3
      )

      for (let i = pageStart; i < pageEnd; i++) {
        const item = items[i]
        const pageItemIndex = i - pageStart
        const col = pageItemIndex % cols
        const row = Math.floor(pageItemIndex / cols)

        const x = PAGE_MARGIN_MM + col * colWidth
        const y = PAGE_MARGIN_MM + 5 + row * rowHeight

        const dataUrl = await QRCode.toDataURL(item.code, {
          width: 336,
          margin: 0,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        })

        doc.addImage(dataUrl, 'PNG', x, y, QR_SIZE_MM, QR_SIZE_MM)

        const labelY = y + QR_SIZE_MM + 3

        doc.setFontSize(9)
        doc.setTextColor(40, 40, 40)
        const codeText = `${item.code} → ${item.puzzleNodeCode}`
        doc.text(codeText, x + 1, labelY)

        doc.setFontSize(7)
        doc.setTextColor(70, 70, 70)
        const title = item.puzzleNodeTitle || item.puzzleNodeLocation || item.puzzleNodeCode
        const titleLines = wrapText(title, QR_SIZE_MM - 2, 7, 3)
        titleLines.forEach((line, idx) => {
          doc.text(line, x + 1, labelY + 4 + idx * 2.2)
        })

        doc.setFontSize(6)
        doc.setTextColor(90, 90, 90)
        const locText = truncate(item.puzzleNodeLocation, 1, 6, QR_SIZE_MM - 2)
        doc.text(locText, x + 1, labelY + 13)

        doc.text(`Stage ${item.puzzleNodeStage}`, x + QR_SIZE_MM - 12, labelY + 13)
      }

      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text(
        `Page ${pageIdx + 1} of ${totalPages} · ${items.length} total QR codes`,
        pageWidth - PAGE_MARGIN_MM,
        pageHeight - 6
      )
      doc.text(
        `Total: ${items.length} QR codes`,
        PAGE_MARGIN_MM,
        pageHeight - 6
      )
    }

    const pdfBlob = doc.output('blob')
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${APP_CONFIG.name.toLowerCase().replace(/\s/g, '-')}-qr-codes.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return { success: true, count: items.length }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate QR code sheet'
    return { success: false, count: 0, error: message }
  }
}
