import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

type MapEntry = {
  sku: string
  image: string
}

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const SKU_RE = /^[A-Z0-9]{8,12}$/
const prisma = new PrismaClient()

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : undefined
  }
  return {
    csv: get('--csv'),
    imageDir: get('--image-dir'),
    publicDir: get('--public-dir') ?? 'apps/web/public/catalog/exact',
    baseUrl: get('--base-url') ?? '/catalog/exact',
    outJson: get('--out-json'),
    apply: args.includes('--apply'),
  }
}

function parseCsv(csvText: string): MapEntry[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  const header = lines[0]!.split(',').map((h) => h.trim().toLowerCase())
  const skuIndex = header.indexOf('sku')
  const imageIndex = header.indexOf('image')
  const imageUrlIndex = header.indexOf('imageurl')
  const targetIndex = imageIndex >= 0 ? imageIndex : imageUrlIndex
  if (skuIndex === -1 || targetIndex === -1) {
    throw new Error('CSV must include sku and image (or imageUrl) columns')
  }
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim())
    return {
      sku: (cells[skuIndex] ?? '').toUpperCase(),
      image: cells[targetIndex] ?? '',
    }
  }).filter((entry) => entry.sku && entry.image)
}

function scanImageDir(imageDir: string): MapEntry[] {
  const root = path.resolve(imageDir)
  if (!fs.existsSync(root)) return []
  const entries: MapEntry[] = []
  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()!
    const items = fs.readdirSync(current, { withFileTypes: true })
    for (const item of items) {
      const full = path.join(current, item.name)
      if (item.isDirectory()) {
        stack.push(full)
        continue
      }
      const ext = path.extname(item.name).toLowerCase()
      if (!IMAGE_EXTS.has(ext)) continue
      const base = path.basename(item.name, ext).toUpperCase()
      const token = base.split(/[^A-Z0-9]+/).find((part) => SKU_RE.test(part))
      if (!token) continue
      entries.push({ sku: token, image: full })
    }
  }
  return entries
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/')
}

function buildImageMap(
  rawEntries: MapEntry[],
  publicDir: string,
  baseUrl: string,
): Map<string, string> {
  const map = new Map<string, string>()
  ensureDir(publicDir)

  for (const entry of rawEntries) {
    const sku = entry.sku.toUpperCase()
    if (!SKU_RE.test(sku)) continue
    if (map.has(sku)) continue

    if (isUrl(entry.image)) {
      map.set(sku, entry.image)
      continue
    }

    const source = path.resolve(entry.image)
    if (!fs.existsSync(source)) continue
    const ext = path.extname(source).toLowerCase()
    if (!IMAGE_EXTS.has(ext)) continue
    const filename = `${sku}${ext}`
    const target = path.join(publicDir, filename)
    if (!fs.existsSync(target)) {
      fs.copyFileSync(source, target)
    }
    map.set(sku, `${baseUrl}/${filename}`)
  }

  return map
}

async function main() {
  const opts = parseArgs()
  if (!opts.csv && !opts.imageDir) {
    throw new Error('Usage: tsx scripts/apply_exact_image_map.ts [--csv <file>] [--image-dir <dir>] [--apply]')
  }

  const entries: MapEntry[] = []
  if (opts.csv) {
    entries.push(...parseCsv(fs.readFileSync(path.resolve(opts.csv), 'utf8')))
  }
  if (opts.imageDir) {
    entries.push(...scanImageDir(opts.imageDir))
  }

  const imageMap = buildImageMap(entries, path.resolve(opts.publicDir), opts.baseUrl)
  const mappedSkus = Array.from(imageMap.keys())

  const existing = await prisma.product.findMany({
    where: { sku: { in: mappedSkus } },
    select: { sku: true },
  })
  const existingSet = new Set(existing.map((row) => row.sku))
  const updates = mappedSkus.filter((sku) => existingSet.has(sku)).map((sku) => ({
    sku,
    imageUrl: imageMap.get(sku)!,
  }))
  const missingSkus = mappedSkus.filter((sku) => !existingSet.has(sku))

  if (opts.apply) {
    const chunkSize = 200
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize)
      await prisma.$transaction(
        chunk.map((row) =>
          prisma.product.update({
            where: { sku: row.sku },
            data: { imageUrl: row.imageUrl },
          }),
        ),
      )
    }
  }

  const report = {
    dryRun: !opts.apply,
    inputEntries: entries.length,
    mappedSkus: mappedSkus.length,
    updatesReady: updates.length,
    missingSkus: missingSkus.length,
    sampleMissingSkus: missingSkus.slice(0, 20),
  }

  if (opts.outJson) {
    fs.mkdirSync(path.dirname(path.resolve(opts.outJson)), { recursive: true })
    fs.writeFileSync(path.resolve(opts.outJson), JSON.stringify({
      report,
      updates,
      missingSkus,
    }, null, 2))
  }

  console.log(JSON.stringify(report, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
