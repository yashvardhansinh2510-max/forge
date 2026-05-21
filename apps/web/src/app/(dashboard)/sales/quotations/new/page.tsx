import { QuotationEditor } from '@/components/sales/quotations/quotation-editor'

export const metadata = { title: 'New Quotation — Forge' }

export default function NewQuotationPage() {
  return <QuotationEditor revisionId={null} />
}
