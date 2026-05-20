import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

async function main() {
  const outArg = process.argv[2] ?? 'packages/db/data/image-map-template.csv'
  const outputPath = path.resolve(outArg)
  const rows = await prisma.product.findMany({
    where: { imageUrl: null },
    select: {
      sku: true,
      name: true,
      brand: true,
    },
    orderBy: [{ brand: 'asc' }, { sku: 'asc' }],
  })

  const header = ['sku', 'image', 'name', 'brand']
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push([
      csvEscape(row.sku),
      csvEscape(''),
      csvEscape(row.name),
      csvEscape(row.brand),
    ].join(','))
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
  console.log(JSON.stringify({
    outputPath,
    rows: rows.length,
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
