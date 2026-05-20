'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'

type ImportResponse = {
  dryRun: boolean
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    duplicateSkus: number
    unknownSkus: number
    willUpdate: number
    updated: number
  }
  errors: Array<{
    rowNumber: number
    sku: string
    code: string
    message: string
  }>
  updated: Array<{
    rowNumber: number
    sku: string
    productName: string
    brand: string
    oldImageUrl: string | null
    newImageUrl: string
  }>
}

export function ProductImagesImportClient() {
  const [file, setFile] = React.useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<ImportResponse | null>(null)

  async function runImport(dryRun: boolean): Promise<void> {
    if (!file) {
      toast.error('Please choose a CSV file first.')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('dryRun', String(dryRun))

      const response = await fetch('/api/settings/products/import', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json() as ImportResponse | { message?: string }
      if (!response.ok) {
        throw new Error('message' in payload && payload.message ? payload.message : 'Import failed')
      }

      setResult(payload as ImportResponse)
      if (dryRun) {
        toast.success('Dry-run complete')
      } else {
        toast.success('Image URLs updated successfully')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer title="Settings" subtitle="Product image import">
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Upload Product Image CSV</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Required columns: <code>sku</code>, <code>imageUrl</code>. Optional: <code>name</code>, <code>brand</code>.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
            <Button size="sm" variant="secondary" onClick={() => runImport(true)} disabled={isSubmitting || !file}>
              {isSubmitting ? 'Running…' : 'Dry run'}
            </Button>
            <Button size="sm" onClick={() => runImport(false)} disabled={isSubmitting || !file}>
              {isSubmitting ? 'Applying…' : 'Apply updates'}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              {Object.entries(result.summary).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-[var(--border)] bg-white p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">{key}</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Row errors</h3>
              {result.errors.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">No validation errors.</p>
              ) : (
                <div className="mt-2 max-h-72 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                        <th className="py-2">Row</th>
                        <th className="py-2">SKU</th>
                        <th className="py-2">Code</th>
                        <th className="py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((error) => (
                        <tr key={`${error.rowNumber}-${error.code}-${error.sku}`} className="border-b border-[var(--border)]">
                          <td className="py-2">{error.rowNumber}</td>
                          <td className="py-2">{error.sku || '—'}</td>
                          <td className="py-2">{error.code}</td>
                          <td className="py-2">{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
