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

