import { QuotationEditor } from '@/components/sales/quotations/quotation-editor'

export const metadata = { title: 'Edit Quotation — Forge' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditQuotationPage({ params }: Props) {
  const { id } = await params
  return <QuotationEditor revisionId={id} />
}
