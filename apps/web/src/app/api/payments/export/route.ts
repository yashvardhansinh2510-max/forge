import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import ExcelJS from 'exceljs'
import { requirePermission } from '@/lib/auth'
import { computeOrderOutstanding } from '@/lib/calculations/outstanding'

export async function GET(request: NextRequest) {
  try {
    await requirePermission('Payments', 'View')

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'customer_ledger' // customer_ledger | payment_history | overdue

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Forge ERP'
    workbook.created = new Date()

    if (type === 'payment_history') {
      const sheet = workbook.addWorksheet('Payment History')
      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Order Number', key: 'orderNumber', width: 20 },
        { header: 'Customer', key: 'customer', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Method', key: 'method', width: 15 },
        { header: 'Reference', key: 'reference', width: 20 },
        { header: 'Recorded By', key: 'recordedBy', width: 20 },
      ]

      const payments = await prisma.customerPayment.findMany({
        include: { order: true },
        orderBy: { receivedAt: 'desc' },
      })

      payments.forEach((p) => {
        sheet.addRow({
          date: p.receivedAt.toISOString().split('T')[0],
          orderNumber: p.order.number,
          customer: p.order.customerName,
          amount: p.amount,
          method: p.method,
          reference: p.reference ?? '',
          recordedBy: p.recordedBy,
        })
      })
    } else {
      // Default to customer_ledger / overdue
      const isOverdue = type === 'overdue'
      const sheet = workbook.addWorksheet(isOverdue ? 'Overdue Ledger' : 'Customer Ledger')
      
      sheet.columns = [
        { header: 'Customer', key: 'customer', width: 30 },
        { header: 'Quotation Amount', key: 'quotationAmount', width: 20 },
        { header: 'Payments Received', key: 'paid', width: 20 },
        { header: 'Outstanding', key: 'outstanding', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
      ]

      const orders = await prisma.salesOrder.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: { payments: true },
      })

      const customerMap = new Map<string, { quotationAmount: number, paid: number, outstanding: number }>()

      for (const order of orders) {
        const customer = order.customerName || 'Unknown Customer'
        const { paidTotal: paid, outstandingTotal: outstanding } = computeOrderOutstanding(order.offerTotal, order.payments)

        if (!customerMap.has(customer)) {
          customerMap.set(customer, { quotationAmount: 0, paid: 0, outstanding: 0 })
        }
        const c = customerMap.get(customer)!
        c.quotationAmount += order.offerTotal
        c.paid += paid
        c.outstanding += outstanding
      }

      for (const [customer, data] of customerMap.entries()) {
        if (isOverdue && data.outstanding === 0) continue

        let status = 'UNPAID'
        if (data.outstanding === 0 && data.paid > 0) status = 'PAID'
        else if (data.paid > 0) status = 'PARTIALLY_PAID'

        if (isOverdue) status = 'OVERDUE'

        sheet.addRow({
          customer,
          quotationAmount: data.quotationAmount,
          paid: data.paid,
          outstanding: data.outstanding,
          status,
        })
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payments_${type}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
