import { NextResponse } from 'next/server'
import { prisma } from '@forge/db'
import { withErrorHandling } from '@/lib/api-helpers'
import { requireUser } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  return withErrorHandling(async () => {
    const user = await requireUser()
    const body = await request.json()

    const activity = await prisma.activity.create({
      data: {
        projectId: params.id,
        type: body.type || 'NOTE',
        description: body.description,
        source: body.source || 'USER',
        userId: user.id
      }
    })

    return NextResponse.json(activity)
  })
}
