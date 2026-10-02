/**
 * NEXUS ECHO — QR Field Marker PDF Generation
 *
 * Generates professional field deployment sheets with exactly 4 QR markers
 * per page in a 2×2 grid. Each marker is a complete self-contained field unit
 * containing: marker ID, QR code, manual fallback code, location, case ref,
 * and deployment status.
 *
 * Uses qrcode's SVG output where possible for crisp vector rendering.
 */

import { QRCodeEntry } from '@/lib/admin'

export interface QRPDFResult {
  success: boolean
  count: number
  pageCount: number
  error?: string
}

const CASE_NO = '037'

const PAGE_WIDTH_MM = 210
const PAGE_HEIGHT_MM = 297
const PAGE_MARGIN_MM = 12
const MARKER_GAP_MM = 10
const MARKER_PER_PAGE = 4

const HEADER_HEIGHT_MM = 12

const QR_SIZE_MM = 32

const MARKER_ID_FONT_PT = 14
const MANUAL_CODE_FONT_PT = 16
const VALUE_FONT_PT = 9

function wrapTextMm(text: string, maxWidthMm: number, fontSizePt: number, maxLines = 3): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  const charWidthPt = fontSizePt * 0.55
  const maxWidthPt = (maxWidthMm / 210) * 72 * 1.5

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = testLine.length * charWidthPt
    if (testWidth <= maxWidthPt) {
      currentLine = testLine
    } else {
      if (currentLine) lines.push(currentLine)
      if (word.length * charWidthPt > maxWidthPt) {
        lines.push(word.slice(0, Math.floor(maxWidthPt / charWidthPt)))
      } else {
        currentLine = word
      }
    }
  }
  if (currentLine) lines.push(currentLine)
  if (lines.length <= maxLines) return lines
  return lines.slice(0, maxLines - 1).concat(['…'])
}

export async function generateQRCodeSheet(
  qrCodes: QRCodeEntry[],
  options?: {
    batchName?: string
    generatedDate?: Date
  },
): Promise<QRPDFResult> {
  if (!qrCodes || qrCodes.length === 0) {
    return { success: false, count: 0, pageCount: 0, error: 'No QR codes to generate' }
  }

  try {
    const QRCodeModule = await import('qrcode')
    const QRCode = QRCodeModule.default ?? QRCodeModule

    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.jsPDF

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const usableWidth = PAGE_WIDTH_MM - 2 * PAGE_MARGIN_MM
    const markerSize = (usableWidth - MARKER_GAP_MM) / 2

    const totalPages = Math.ceil(qrCodes.length / MARKER_PER_PAGE)

    const genDate = options?.generatedDate ?? new Date()
    const batchName = options?.batchName ?? `BATCH-${String(totalPages).padStart(2, '0')}`

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      if (pageIdx > 0) {
        doc.addPage()
      }

  drawPageHeader(doc, pageIdx + 1, totalPages, qrCodes.length, batchName, genDate)

      const pageStart = pageIdx * MARKER_PER_PAGE
      const pageEnd = Math.min(pageStart + MARKER_PER_PAGE, qrCodes.length)

      for (let i = pageStart; i < pageEnd; i++) {
        const item = qrCodes[i]
        const itemIndex = i - pageStart
        const col = itemIndex % 2
        const row = Math.floor(itemIndex / 2)

        const x = PAGE_MARGIN_MM + col * (markerSize + MARKER_GAP_MM)
        const y = PAGE_MARGIN_MM + HEADER_HEIGHT_MM + row * (markerSize + MARKER_GAP_MM)

        await drawMarker(doc, item, x, y, markerSize, QRCode)
      }

      drawPageFooter(doc, pageIdx + 1, totalPages)
    }

    const filename = `NEXUS-ECHO_FIELD-MARKERS_Case-${CASE_NO}_${batchName}.pdf`
    const pdfBlob = doc.output('blob')
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return { success: true, count: qrCodes.length, pageCount: totalPages }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate QR code sheet'
    return { success: false, count: 0, pageCount: 0, error: message }
  }
}

function drawPageHeader(
  doc: any,
  _pageNum: number,
  _totalPages: number,
  totalMarkers: number,
  batchName: string,
  genDate: Date,
) {
  const margin = PAGE_MARGIN_MM

  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.text('NEXUS ECHO', margin, margin + 2)

  doc.setFontSize(7)
  doc.setTextColor(90, 90, 90)
  doc.setFont('helvetica', 'normal')
  doc.text('FIELD MARKER DEPLOYMENT', margin, margin + 5.5)
  doc.text('CLASSIFIED // EYES ONLY', margin, margin + 8)

  doc.setFontSize(7)
  doc.setTextColor(179, 130, 39)
  doc.setFont('helvetica', 'bold')
  doc.text(`CASE / ${CASE_NO}`, PAGE_WIDTH_MM - margin, margin + 2, { align: 'right' })
  doc.setTextColor(90, 90, 90)
  doc.setFont('helvetica', 'normal')
  doc.text(`DEPLOYMENT BATCH / ${batchName}`, PAGE_WIDTH_MM - margin, margin + 5.5, { align: 'right' })
  doc.text(`TOTAL MARKERS / ${totalMarkers}`, PAGE_WIDTH_MM - margin, margin + 8, { align: 'right' })
  doc.setTextColor(90, 90, 90)
  doc.setFontSize(6)
  doc.text(`GENERATED / ${formatDate(genDate)}`, PAGE_WIDTH_MM - margin, margin + 10.5, { align: 'right' })
}

function drawPageFooter(doc: any, pageNum: number, totalPages: number) {
  const margin = PAGE_MARGIN_MM
  doc.setFontSize(6)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `NEXUS ECHO — FIELD MARKER SHEET • PAGE ${pageNum} OF ${totalPages}`,
    PAGE_WIDTH_MM / 2,
    PAGE_HEIGHT_MM - margin + 2,
    { align: 'center' },
  )
}

async function drawMarker(
  doc: any,
  item: QRCodeEntry,
  x: number,
  y: number,
  size: number,
  QRCode: any,
) {
  const markerId = item.markerId ?? item.code
  const manualCode = item.manualCode ?? item.code
  const caseNumber = item.caseNumber ?? CASE_NO
  const building = item.building ?? item.puzzleNodeLocation ?? 'UNKNOWN LOCATION'
  const status = item.deploymentStatus ?? 'GENERATED'

  const contentX = x
  const contentY = y
  const contentWidth = size - 2
  const contentHeight = size - 2

  doc.setDrawColor(140, 140, 140)
  doc.setLineWidth(0.5)
  doc.roundedRect(contentX, contentY, contentWidth, contentHeight, 0.5, 0.5, 'S')

  const labelTop = contentY + 3

  doc.setFontSize(8)
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.text('NEXUS ECHO', contentX + 2, labelTop)

  doc.setFontSize(6)
  doc.setTextColor(90, 90, 90)
  doc.setFont('helvetica', 'normal')
  doc.text('FIELD MARKER', contentX + contentWidth - 2, labelTop, { align: 'right' })

  const dividerY = labelTop + 2
  doc.setDrawColor(140, 140, 140)
  doc.setLineWidth(0.25)
  doc.line(contentX + 2, dividerY, contentX + contentWidth - 2, dividerY)

  const markerIdY = dividerY + 3
  doc.setFontSize(6)
  doc.setTextColor(90, 90, 90)
  doc.text('MARKER ID', contentX + 2, markerIdY)

  doc.setFontSize(MARKER_ID_FONT_PT)
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.text(markerId, contentX + 2, markerIdY + 4)

  const qrX = contentX + 2
  const qrY = markerIdY + 7
  const qrSize = QR_SIZE_MM

  const qrDataUrl = await QRCode.toDataURL(item.code, {
    width: 336,
    margin: 0,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'Q',
  })

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  const manualX = qrX + qrSize + 3
  const manualY = qrY + 2
  doc.setFontSize(6)
  doc.setTextColor(90, 90, 90)
  doc.text('MANUAL CODE', manualX, manualY)

  doc.setFontSize(MANUAL_CODE_FONT_PT)
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'bold')
  doc.text(manualCode, manualX, manualY + 4)

  const locY = qrY + qrSize + 3
  doc.setFontSize(6)
  doc.setTextColor(90, 90, 90)
  doc.text('LOCATION', contentX + 2, locY)

  const locLines = wrapTextMm(building, contentWidth - 4, VALUE_FONT_PT, 2)
  doc.setFontSize(VALUE_FONT_PT)
  doc.setTextColor(40, 40, 40)
  locLines.forEach((line, idx) => {
    doc.text(line, contentX + 2, locY + 2 + idx * 2.5)
  })

  const caseY = locY + locLines.length * 2.5 + 4

  doc.setFontSize(6)
  doc.setTextColor(90, 90, 90)

  const leftColX = contentX + 2
  const rightColX = contentX + contentWidth / 2

  doc.text('CASE', leftColX, caseY)
  doc.setFontSize(VALUE_FONT_PT)
  doc.setTextColor(40, 40, 40)
  doc.text(`INCIDENT ${caseNumber}`, leftColX, caseY + 3)

  doc.setFontSize(6)
  doc.setTextColor(90, 90, 90)
  doc.text('NODE', rightColX, caseY)
  doc.setFontSize(VALUE_FONT_PT)
  doc.setTextColor(40, 40, 40)
  doc.text(item.puzzleNodeCode, rightColX, caseY + 3)

  doc.setFontSize(6)
  doc.setTextColor(90, 90, 90)
  doc.text('STATUS', leftColX, caseY + 7)
  doc.setFontSize(VALUE_FONT_PT)

  const statusColor: [number, number, number] =
    status === 'DEPLOYED' || status === 'VERIFIED'
      ? [179, 130, 39]
      : status === 'DISABLED'
        ? [158, 59, 52]
        : [90, 90, 90]
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  doc.text(status, leftColX, caseY + 10)

  doc.setFontSize(6)
  doc.setTextColor(90, 90, 90)
  doc.text('STAGE', rightColX, caseY + 7)
  doc.setFontSize(VALUE_FONT_PT)
  doc.setTextColor(40, 40, 40)
  doc.text(`STAGE ${item.puzzleNodeStage ?? 1}`, rightColX, caseY + 10)
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
