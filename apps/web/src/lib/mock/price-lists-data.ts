export type PriceListType = 'retail' | 'trade' | 'project'

export interface PriceList {
  id: string
  name: string
  type: PriceListType
  description: string
  discountPercent: number
  appliesTo: string[]
  isDefault: boolean
  productCount: number
}

export const priceLists: PriceList[] = [
  {
    id: 'pl01',
    name: 'Retail (MRP)',
    type: 'retail',
    description: 'Standard MRP pricing for retail and walk-in customers',
    discountPercent: 0,
    appliesTo: ['retail', 'All contacts by default'],
    isDefault: true,
    productCount: 55,
  },
  {
    id: 'pl02',
    name: 'Trade & Architect',
    type: 'trade',
    description: '12% below MRP for architects and interior designers who specify products',
    discountPercent: 12,
    appliesTo: ['architect', 'interior_designer'],
    isDefault: false,
    productCount: 55,
  },
  {
    id: 'pl03',
    name: 'Builder / Project',
    type: 'project',
    description: '18% below MRP for bulk project and construction orders',
    discountPercent: 18,
    appliesTo: ['builder', 'contractor', 'institutional'],
    isDefault: false,
    productCount: 55,
  },
]
