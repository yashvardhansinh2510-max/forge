'use client'

import { useMemo } from 'react'

export interface Breadcrumb {
  label: string
  href: string
}

const routeLabelMap: Record<string, string> = {
  '': 'Home',
  dashboard: 'Dashboard',
  crm: 'CRM',
  contacts: 'Contacts',
  companies: 'Companies',
  pipeline: 'Pipeline',
  activities: 'Activities',
  sales: 'Sales',
  orders: 'Orders',
  quotes: 'Quotations',
  inventory: 'Inventory',
  products: 'Products',
  warehouses: 'Warehouses',
  movements: 'Stock Movements',
  manufacturing: 'Manufacturing',
  bom: 'Bill of Materials',
  invoicing: 'Invoicing',
  invoices: 'Invoices',
  payments: 'Payments',
  reports: 'Reports',
  settings: 'Settings',
}

function getLabel(segment: string): string {
  if (routeLabelMap[segment] !== undefined) {
    return routeLabelMap[segment]
  }
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function useBreadcrumbs(pathname: string): Breadcrumb[] {
  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)

    if (segments.length === 0) {
      return [{ label: 'Home', href: '/' }]
    }

    const crumbs: Breadcrumb[] = []
    let path = ''

    for (const segment of segments) {
      path += `/${segment}`
      crumbs.push({
        label: getLabel(segment),
        href: path,
      })
    }

    return crumbs
  }, [pathname])
}
