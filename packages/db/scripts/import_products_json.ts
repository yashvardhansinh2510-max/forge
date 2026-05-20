import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient, ProductBrand, ProductCategory } from '@prisma/client'

type ExtractedProduct = {
  source: string
  page: number
  sku: string
  name: string
  price: number
  brand_hint: string
  category_hint?: string | null
  image_url?: string | null
}

type Payload = {
  meta: Record<string, unknown>
  products: ExtractedProduct[]
}

const prisma = new PrismaClient()

function mapBrand(brandHint: string): ProductBrand {
  const normalized = brandHint.toUpperCase()
  if (normalized.includes('AXOR')) return ProductBrand.AXOR
  if (normalized.includes('HANSGROHE')) return ProductBrand.HANSGROHE
  if (normalized.includes('GROHE')) return ProductBrand.GROHE
  if (normalized.includes('VITRA')) return ProductBrand.VITRA
  if (normalized.includes('GEBERIT')) return ProductBrand.GEBERIT
  return ProductBrand.OTHER
}

function mapCategory(name: string, hint?: string | null): ProductCategory {
  const text = `${name} ${hint ?? ''}`.toLowerCase()
  if (text.includes('shower')) return ProductCategory.SHOWERS
  if (text.includes('thermostat') || text.includes('smartcontrol')) return ProductCategory.THERMOSTATS
  if (text.includes('wc') || text.includes('toilet') || text.includes('cistern')) return ProductCategory.WCS
  if (text.includes('kitchen')) return ProductCategory.KITCHEN
  if (text.includes('basin')) return ProductCategory.BASINS
  if (text.includes('bathtub') || text.includes('bath tub')) return ProductCategory.BATHTUBS
  if (text.includes('concealed') || text.includes('basic set')) return ProductCategory.CONCEALED
  if (
    text.includes('mixer') ||
    text.includes('faucet') ||
    text.includes('spout') ||
    text.includes('valve')
  ) {
    return ProductCategory.FAUCETS
  }
  return ProductCategory.ACCESSORIES
}

async function main() {
  const fileArg = process.argv[2]
  if (!fileArg) {
    throw new Error('Usage: tsx scripts/import_products_json.ts <path-to-json> [--apply]')
  }
  const apply = process.argv.includes('--apply')
  const sourcePath = path.resolve(fileArg)
  const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as Payload

  const skus = payload.products.map((row) => row.sku)
  const existingRows = await prisma.product.findMany({
    where: { sku: { in: skus } },
    select: { sku: true },
  })
  const existingSkuSet = new Set(existingRows.map((row) => row.sku))

  let createCount = 0
  let updateCount = 0
  const toCreate: Parameters<typeof prisma.product.createMany>[0]['data'] = []
  const toUpdate: Array<{ sku: string; data: Parameters<typeof prisma.product.update>[0]['data'] }> = []

  for (const row of payload.products) {
    const brand = mapBrand(row.brand_hint)
    const category = mapCategory(row.name, row.category_hint ?? null)
    const imageUrl = row.image_url || null
    const price = Math.max(1, Number(row.price) || 0)
    const description = `${row.name} (source: ${row.source} page ${row.page})`

    const existing = existingSkuSet.has(row.sku)

    if (!apply) {
      if (existing) updateCount += 1
      else createCount += 1
      continue
    }

    const commonData = {
      name: row.name,
      description,
      brand,
      category,
      mrp: price,
      imageUrl,
      isActive: true,
    }

    if (existing) {
      toUpdate.push({
        sku: row.sku,
        data: commonData,
      })
      updateCount += 1
    } else {
      toCreate.push({
        sku: row.sku,
        ...commonData,
        gstRate: 18,
        unit: 'pcs',
      })
      createCount += 1
    }
  }

  if (apply) {
    if (toCreate.length > 0) {
      await prisma.product.createMany({
        data: toCreate,
        skipDuplicates: true,
      })
    }

    const chunkSize = 200
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize)
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.product.update({
            where: { sku: item.sku },
            data: item.data,
          }),
        ),
      )
    }
  }

  console.log(JSON.stringify({
    dryRun: !apply,
    sourcePath,
    total: payload.products.length,
    createCount,
    updateCount,
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
