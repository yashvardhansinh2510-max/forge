import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requirePermission } from '@/lib/auth'
import {
  parseProductImageCsv,
  type ProductImageImportError,
  type ProductImageImportRow,
} from '@/lib/products-image-import'

type ImportPayload = {
  dryRun?: boolean
  rows?: Array<{
    sku?: string
    imageUrl?: string
    name?: string
    brand?: string
  }>
}

function parseRowsFromJson(payload: ImportPayload): ProductImageImportRow[] {
  return (payload.rows ?? []).map((row, index) => ({
    rowNumber: index + 1,
    sku: (row.sku ?? '').trim(),
    imageUrl: (row.imageUrl ?? '').trim(),
    name: row.name?.trim(),
    brand: row.brand?.trim(),
  }))
}

async function parseRowsFromRequest(req: NextRequest): Promise<{ rows: ProductImageImportRow[]; dryRun: boolean }> {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const dryRun = formData.get('dryRun') !== 'false'
    const file = formData.get('file')
    const csv = formData.get('csv')
    const csvText =
      typeof csv === 'string'
        ? csv
        : file instanceof File
          ? await file.text()
          : ''
    return { rows: parseProductImageCsv(csvText), dryRun }
  }

  const body = await req.json() as ImportPayload
  return {
    rows: parseRowsFromJson(body),
    dryRun: body.dryRun !== false,
  }
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    await requirePermission('Images', 'Import')
    const { rows, dryRun } = await parseRowsFromRequest(req)
    const errors: ProductImageImportError[] = []
    const duplicates = new Set<string>()
    const seenSkus = new Set<string>()
    const validRows: ProductImageImportRow[] = []

    for (const row of rows) {
      if (!row.sku) {
        errors.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          code: 'MISSING_SKU',
          message: 'SKU is required.',
        })
        continue
      }
      if (!row.imageUrl) {
        errors.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          code: 'MISSING_IMAGE_URL',
          message: 'imageUrl is required.',
        })
        continue
      }

      try {
        const url = new URL(row.imageUrl)
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Only http(s) URLs are allowed')
        }
      } catch {
        errors.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          code: 'INVALID_URL',
          message: 'imageUrl must be a valid http(s) URL.',
        })
        continue
      }

      if (seenSkus.has(row.sku)) {
        duplicates.add(row.sku)
      }
      seenSkus.add(row.sku)
      validRows.push(row)
    }

    for (const sku of duplicates) {
      const duplicateRows = validRows.filter((row) => row.sku === sku)
      for (const row of duplicateRows) {
        errors.push({
          rowNumber: row.rowNumber,
          sku: row.sku,
          code: 'DUPLICATE_SKU',
          message: `Duplicate SKU '${sku}' in upload.`,
        })
      }
    }

    const dedupedRows = validRows.filter((row) => !duplicates.has(row.sku))
    const dbProducts = await prisma.product.findMany({
      where: {
        sku: {
          in: dedupedRows.map((row) => row.sku),
        },
      },
      select: {
        id: true,
        sku: true,
        name: true,
        brand: true,
        imageUrl: true,
      },
    })

    const productBySku = new Map(dbProducts.map((product) => [product.sku, product]))
    const rowsToApply = dedupedRows.filter((row) => {
      if (productBySku.has(row.sku)) return true
      errors.push({
        rowNumber: row.rowNumber,
        sku: row.sku,
        code: 'UNKNOWN_SKU',
        message: `SKU '${row.sku}' was not found in product catalog.`,
      })
      return false
    })

    const updatesPreview = rowsToApply.map((row) => {
      const product = productBySku.get(row.sku)
      return {
        rowNumber: row.rowNumber,
        sku: row.sku,
        productName: product?.name ?? '',
        brand: product?.brand ?? '',
        oldImageUrl: product?.imageUrl ?? null,
        newImageUrl: row.imageUrl,
      }
    })

    if (!dryRun && updatesPreview.length > 0) {
      await prisma.$transaction(
        updatesPreview.map((row) =>
          prisma.product.update({
            where: { sku: row.sku },
            data: { imageUrl: row.newImageUrl },
          }),
        ),
      )
    }

    return NextResponse.json({
      dryRun,
      summary: {
        totalRows: rows.length,
        validRows: rowsToApply.length,
        invalidRows: errors.length,
        duplicateSkus: duplicates.size,
        unknownSkus: errors.filter((error) => error.code === 'UNKNOWN_SKU').length,
        willUpdate: updatesPreview.length,
        updated: dryRun ? 0 : updatesPreview.length,
      },
      errors: errors.sort((a, b) => a.rowNumber - b.rowNumber),
      updated: updatesPreview,
      generatedAt: new Date().toISOString(),
    })
  })
}
