import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Fetching main jsonStore...');
    const record = await prisma.jsonStore.findUnique({ where: { key: 'main' } });
    if (!record) return NextResponse.json({ success: false, msg: 'No record' })
    
    let data = record.data;
    let count = 0;
    
    if (data.attendances && Array.isArray(data.attendances)) {
      for (let i = 0; i < data.attendances.length; i++) {
        if (data.attendances[i].faceInBase64) {
          delete data.attendances[i].faceInBase64;
          count++;
        }
        if (data.attendances[i].faceOutBase64) {
          delete data.attendances[i].faceOutBase64;
          count++;
        }
        // Juga hapus url lama jika ada yg terselip
        if (data.attendances[i].faceInUrl) delete data.attendances[i].faceInUrl;
        if (data.attendances[i].faceOutUrl) delete data.attendances[i].faceOutUrl;
      }
    }
    
    if (count > 0) {
      await prisma.jsonStore.update({
        where: { key: 'main' },
        data: { data: data }
      });
      return NextResponse.json({ success: true, count, msg: 'Stripped base64 fields!' })
    } else {
      return NextResponse.json({ success: true, count: 0, msg: 'No base64 fields found' })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
