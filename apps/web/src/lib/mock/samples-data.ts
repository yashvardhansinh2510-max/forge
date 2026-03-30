export type SampleStatus = 'sent' | 'with_client' | 'returned' | 'kept'

export interface Sample {
  id: string
  productId: string
  productName: string
  productSku: string
  contactId: string
  contactName: string
  contactCompany: string | null
  sentDate: Date
  expectedReturn: Date | null
  returnedDate: Date | null
  status: SampleStatus
  notes: string
}

export const SAMPLE_STATUS_CONFIG: Record<SampleStatus, { label: string; dot: 'neutral' | 'positive' | 'negative' | 'caution' | 'accent' }> = {
  sent:        { label: 'Sent',        dot: 'accent' },
  with_client: { label: 'With Client', dot: 'caution' },
  returned:    { label: 'Returned',    dot: 'positive' },
  kept:        { label: 'Kept',        dot: 'neutral' },
}

export const samples: Sample[] = [
  {
    id: 'smp01',
    productId: 'p001',
    productName: 'Grohe Essence Basin Mixer',
    productSku: 'GRH-ESS-001',
    contactId: 'ct01',
    contactName: 'Ar. Vikram Mehta',
    contactCompany: 'Mehta Architects Studio',
    sentDate: new Date(Date.now() - 1000*60*60*24*14),
    expectedReturn: new Date(Date.now() + 1000*60*60*24*16),
    returnedDate: null,
    status: 'with_client',
    notes: 'Sent for Sea View Bungalow project — master bathroom',
  },
  {
    id: 'smp02',
    productId: 'p002',
    productName: 'Axor Edge Basin Mixer Chrome',
    productSku: 'AXR-EDG-001',
    contactId: 'ct02',
    contactName: 'Priya Nair',
    contactCompany: 'Priya Nair Interiors',
    sentDate: new Date(Date.now() - 1000*60*60*24*8),
    expectedReturn: new Date(Date.now() + 1000*60*60*24*22),
    returnedDate: null,
    status: 'with_client',
    notes: 'Worli penthouse project — comparing with Hansgrohe Metropol',
  },
  {
    id: 'smp03',
    productId: 'p010',
    productName: 'Hansgrohe Metropol Basin Mixer',
    productSku: 'HAN-MET-001',
    contactId: 'ct02',
    contactName: 'Priya Nair',
    contactCompany: 'Priya Nair Interiors',
    sentDate: new Date(Date.now() - 1000*60*60*24*8),
    expectedReturn: new Date(Date.now() + 1000*60*60*24*22),
    returnedDate: null,
    status: 'with_client',
    notes: 'Sent alongside Axor Edge for comparison',
  },
  {
    id: 'smp04',
    productId: 'p005',
    productName: 'Vitra S50 Wall-Hung WC',
    productSku: 'VIT-S50-001',
    contactId: 'ct04',
    contactName: 'Anita Lobo',
    contactCompany: 'Studio Anita Lobo',
    sentDate: new Date(Date.now() - 1000*60*60*24*35),
    expectedReturn: new Date(Date.now() - 1000*60*60*24*5),
    returnedDate: null,
    status: 'with_client',
    notes: 'Bandra villa — sample kept longer than expected. Follow up.',
  },
  {
    id: 'smp05',
    productId: 'p001',
    productName: 'Grohe Essence Basin Mixer',
    productSku: 'GRH-ESS-001',
    contactId: 'ct07',
    contactName: 'Dr. Meera Iyer',
    contactCompany: null,
    sentDate: new Date(Date.now() - 1000*60*60*24*3),
    expectedReturn: new Date(Date.now() + 1000*60*60*24*27),
    returnedDate: null,
    status: 'sent',
    notes: 'Powai 3BHK — gave to take home and show husband',
  },
  {
    id: 'smp06',
    productId: 'p003',
    productName: 'Grohe Rainshower 310 Overhead Shower',
    productSku: 'GRH-RAIN-001',
    contactId: 'ct01',
    contactName: 'Ar. Vikram Mehta',
    contactCompany: 'Mehta Architects Studio',
    sentDate: new Date(Date.now() - 1000*60*60*24*45),
    expectedReturn: new Date(Date.now() - 1000*60*60*24*15),
    returnedDate: new Date(Date.now() - 1000*60*60*24*12),
    status: 'returned',
    notes: 'Returned in good condition. Vikram went with Grohe Rainshower 360 instead.',
  },
]
