import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { requirePermission } from '@/lib/auth'
import ExcelJS from 'exceljs'

export async function GET(req: Request) {
  try {
    await requirePermission('Settings', 'View')

    const url = new URL(req.url)
    
    // Filters
    const userId = url.searchParams.get('userId')
    const category = url.searchParams.get('category')
    const entityType = url.searchParams.get('entityType')
    const entityId = url.searchParams.get('entityId')
    const action = url.searchParams.get('action')
    const status = url.searchParams.get('status')
    
    // Date Range
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    
    // Format: 'csv' or 'excel'
    const format = url.searchParams.get('format') || 'csv'

    const where: any = {}

    if (userId) where.actorId = userId
    if (category) where.category = category
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (action) where.action = action
    if (status) where.status = status

    if (fromDate || toDate) {
      where.createdAt = {}
      if (fromDate) where.createdAt.gte = new Date(fromDate)
      if (toDate) where.createdAt.lte = new Date(toDate)
    }

    // Fetch all matching logs
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Audit Logs')

      sheet.columns = [
        { header: 'Date', key: 'date', width: 25 },
        { header: 'Actor', key: 'actor', width: 25 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Entity Type', key: 'entityType', width: 20 },
        { header: 'Entity ID', key: 'entityId', width: 20 },
        { header: 'Action', key: 'action', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Before Snapshot', key: 'before', width: 40 },
        { header: 'After Snapshot', key: 'after', width: 40 },
      ]

      logs.forEach(log => {
        sheet.addRow({
          date: log.createdAt.toISOString(),
          actor: log.actor?.name || 'System',
          category: log.category,
          entityType: log.entityType || '',
          entityId: log.entityId || '',
          action: log.action,
          status: log.status,
          before: log.beforeSnapshot ? JSON.stringify(log.beforeSnapshot) : '',
          after: log.afterSnapshot ? JSON.stringify(log.afterSnapshot) : '',
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="audit-logs.xlsx"',
        },
      })
    }

    // Default to CSV
    const csvRows = [
      ['Date', 'Actor', 'Category', 'Entity Type', 'Entity ID', 'Action', 'Status', 'Before Snapshot', 'After Snapshot']
    ]

    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`

    logs.forEach(log => {
      csvRows.push([
        log.createdAt.toISOString(),
        log.actor?.name || 'System',
        log.category,
        log.entityType || '',
        log.entityId || '',
        log.action,
        log.status,
        log.beforeSnapshot ? JSON.stringify(log.beforeSnapshot) : '',
        log.afterSnapshot ? JSON.stringify(log.afterSnapshot) : '',
      ].map(v => escapeCsv(String(v))))
    })

    const csvContent = csvRows.map(row => row.join(',')).join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="audit-logs.csv"',
      },
    })
  } catch (error: any) {
    console.error('[Audit Export API Error]', error)
    return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 })
  }
}
