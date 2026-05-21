import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import fs from 'fs/promises'
import path from 'path'

const SETTINGS_PATH = path.join(process.cwd(), 'src/lib/company-settings.json')

type TollFree = Record<string, string>
type CompanySettings = {
  name: string
  gstin: string
  address: string
  phone: string
  email: string
  tollFree: TollFree
}

async function read(): Promise<CompanySettings> {
  const raw = await fs.readFile(SETTINGS_PATH, 'utf-8')
  return JSON.parse(raw) as CompanySettings
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
  }
  try {
    return NextResponse.json(await read())
  } catch {
    return NextResponse.json({ code: 'READ_ERROR', message: 'Could not read settings' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = (await req.json()) as Partial<CompanySettings>
    const current = await read()
    const updated: CompanySettings = {
      ...current,
      ...body,
      tollFree: { ...current.tollFree, ...(body.tollFree ?? {}) },
    }
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(updated, null, 2))
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ code: 'WRITE_ERROR', message: 'Could not update settings' }, { status: 500 })
  }
}
