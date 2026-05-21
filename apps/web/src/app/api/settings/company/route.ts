import { NextResponse } from 'next/server'
import fs from 'fs'
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

function read(): CompanySettings {
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) as CompanySettings
}

export async function GET() {
  return NextResponse.json(read())
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as Partial<CompanySettings>
  const current = read()
  const updated: CompanySettings = {
    ...current,
    ...body,
    tollFree: { ...current.tollFree, ...(body.tollFree ?? {}) },
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2))
  return NextResponse.json(updated)
}
