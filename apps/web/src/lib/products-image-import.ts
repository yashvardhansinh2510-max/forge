export interface ProductImageImportRow {
  rowNumber: number
  sku: string
  imageUrl: string
  name?: string
  brand?: string
}

export interface ProductImageImportError {
  rowNumber: number
  sku: string
  code: 'MISSING_SKU' | 'MISSING_IMAGE_URL' | 'INVALID_URL' | 'DUPLICATE_SKU' | 'UNKNOWN_SKU'
  message: string
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  result.push(current.trim())
  return result
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '')
}

export function parseProductImageCsv(csvText: string): ProductImageImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return []

  const headers = splitCsvLine(lines[0] ?? '').map(normalizeHeader)
  const skuIndex = headers.findIndex((header) => header === 'sku')
  const imageUrlIndex = headers.findIndex((header) => header === 'imageurl')
  const nameIndex = headers.findIndex((header) => header === 'name')
  const brandIndex = headers.findIndex((header) => header === 'brand')

  if (skuIndex === -1 || imageUrlIndex === -1) {
    throw new Error('CSV must include sku and imageUrl headers')
  }

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line)
    return {
      rowNumber: index + 2,
      sku: (values[skuIndex] ?? '').trim(),
      imageUrl: (values[imageUrlIndex] ?? '').trim(),
      name: nameIndex >= 0 ? (values[nameIndex] ?? '').trim() : undefined,
      brand: brandIndex >= 0 ? (values[brandIndex] ?? '').trim() : undefined,
    }
  })
}
