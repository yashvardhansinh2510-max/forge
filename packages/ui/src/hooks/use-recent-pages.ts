'use client'

import { useState, useCallback, useEffect } from 'react'

export interface RecentPage {
  label: string
  href: string
  icon: string
}

const STORAGE_KEY = 'forge_recent_pages'
const MAX_PAGES = 5

function loadPages(): RecentPage[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as RecentPage[]) : []
  } catch {
    return []
  }
}

function savePages(pages: RecentPage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
  } catch {
    // localStorage unavailable
  }
}

export function useRecentPages() {
  const [pages, setPages] = useState<RecentPage[]>([])

  useEffect(() => {
    setPages(loadPages())
  }, [])

  const addRecentPage = useCallback((page: RecentPage) => {
    setPages((prev) => {
      const filtered = prev.filter((p) => p.href !== page.href)
      const updated = [page, ...filtered].slice(0, MAX_PAGES)
      savePages(updated)
      return updated
    })
  }, [])

  const getRecentPages = useCallback(() => pages, [pages])

  return { pages, addRecentPage, getRecentPages }
}
