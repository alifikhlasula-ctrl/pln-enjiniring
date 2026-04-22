import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const template = await prisma.jsonStore.findUnique({
      where: { key: 'spm_template' }
    })

    if (!template) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ 
      exists: true, 
      updatedAt: template.updatedAt,
      filename: template.data.filename
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { base64, filename } = await req.json()

    if (!base64) {
      return NextResponse.json({ error: 'Data template tidak valid' }, { status: 400 })
    }

    await prisma.jsonStore.upsert({
      where: { key: 'spm_template' },
      update: {
        data: { base64, filename, updatedAt: new Date().toISOString() }
      },
      create: {
        key: 'spm_template',
        data: { base64, filename, updatedAt: new Date().toISOString() }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
