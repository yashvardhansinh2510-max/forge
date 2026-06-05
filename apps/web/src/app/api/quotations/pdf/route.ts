import { NextRequest } from 'next/server'
import puppeteer from 'puppeteer-core'

// System Chrome — avoids bundling a separate Chromium download
const CHROME_PATHS: Record<string, string> = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux:  '/usr/bin/google-chrome',
  win32:  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
}

function getChromePath(): string {
  const path = CHROME_PATHS[process.platform]
  if (!path) throw new Error(`No Chrome path configured for platform: ${process.platform}`)
  return path
}

export async function POST(request: NextRequest) {
  const { html, filename } = await request.json() as { html: string; filename?: string }

  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    // 'load' waits for all resources (images, fonts) before resolving.
    // Data URI fallback images (SVG) fire instantly; external URLs are awaited here.
    await page.setContent(html, { waitUntil: 'load' })
    // Extra settle for any late CSS paint (background colours, gradients)
    await new Promise(r => setTimeout(r, 300))

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      // Margins declared in @page CSS; set 0 here to avoid doubling
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })

    const disposition = `attachment; filename="${filename ?? 'Quotation.pdf'}"`
    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
      },
    })
  } finally {
    await browser.close()
  }
}
