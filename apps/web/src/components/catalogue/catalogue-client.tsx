'use client'

import * as React from 'react'
import useSWR from 'swr'
import { ImagePlus } from 'lucide-react'
import { Button } from '@forge/ui'
import { PageContainer } from '@/components/layout/page-container'

type CatalogueProduct = {
  id: string
  sku: string
  name: string
  brand: string
  category: string
  mrp: number
  imageUrl: string | null
}

type ProductResponse = {
  products: CatalogueProduct[]
  generatedAt: string
}

const fetcher = async (url: string): Promise<ProductResponse> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to load catalogue products')
  return response.json() as Promise<ProductResponse>
}

export function CatalogueClient() {
  const { data, isLoading, error } = useSWR<ProductResponse>('/api/products', fetcher, {
    revalidateOnFocus: true,
  })

  const products = data?.products ?? []
  const withImages = products.filter((product) => product.imageUrl).length

  const actions = (
    <Button size="sm" asChild>
      <a href="/settings">
        <ImagePlus size={14} className="mr-1.5" />
        Import product images
      </a>
    </Button>
  )

  return (
    <PageContainer
      title="Catalogue"
      subtitle={`${products.length} products · ${withImages} with images`}
      actions={actions}
    >
      {error ? (
        <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4 text-sm text-[#b91c1c]">
          Could not load product catalogue from the database.
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-sm text-[var(--text-secondary)]">
          Loading catalogue…
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-sm text-[var(--text-secondary)]">
          No products found. Seed products first, then import image URLs from Settings.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start gap-3">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-16 w-16 rounded-lg border border-[var(--border)] object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--n-50)] text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {product.brand.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{product.sku}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{product.brand} · {product.category}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    ₹{product.mrp.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
