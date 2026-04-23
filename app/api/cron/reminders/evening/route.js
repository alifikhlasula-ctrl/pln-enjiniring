import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { messagingAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const today = new Date();
    const todayStr = new Intl.DateTimeFormat('fr-CA', { 
      timeZone: 'Asia/Jakarta', 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(today);

    // Fetch attendances for today where the intern HAS checked in but HAS NOT checked out
    const activeAttendances = await prisma.attendanceLog.findMany({
      where: { 
        date: todayStr,
        checkIn: { not: null },
        checkOut: null,
      },
      select: { internId: true }
    });

    if (activeAttendances.length === 0) {
      return NextResponse.json({ success: true, message: 'All present interns have checked out.' });
    }

    const pendingInternIds = activeAttendances.map(a => a.internId);

    // Get the User IDs for these interns
    const interns = await prisma.intern.findMany({
      where: { id: { in: pendingInternIds } },
      select: { userId: true }
    });
    const pendingUserIds = interns.map(i => i.userId);

    // Fetch FCM Tokens
    const users = await prisma.user.findMany({
      where: {
        id: { in: pendingUserIds },
        fcmToken: { not: null }
      },
      select: { fcmToken: true }
    });

    const tokens = users.map(u => u.fcmToken).filter(Boolean);

    if (tokens.length === 0 || !messagingAdmin) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active push subscriptions found or Firebase Admin not initialized.',
        targetCount: tokens.length
      });
    }

    const message = {
      notification: {
        title: '🏠 Waktunya Pulang!',
        body: 'Jam operasional telah selesai. Jangan lupa melakukan check-out absensi sebelum meninggalkan kantor.',
      },
      data: { url: '/attendance' },
      tokens: tokens,
    };

    const response = await messagingAdmin.sendEachForMulticast(message);
    
    return NextResponse.json({ 
      success: true, 
      sentCount: response.successCount, 
      failedCount: response.failureCount,
      targetCount: tokens.length
    });

  } catch (error) {
    console.error('Evening Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
