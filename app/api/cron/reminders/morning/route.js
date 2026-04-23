import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { messagingAdmin } from '@/lib/firebaseAdmin';

// Important for Vercel Cron
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // 1. Get today's date in YYYY-MM-DD
    const today = new Date();
    // Assuming timezone Asia/Jakarta
    const todayStr = new Intl.DateTimeFormat('fr-CA', { 
      timeZone: 'Asia/Jakarta', 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    }).format(today);

    // 2. Fetch all active interns and their attendance for today
    const interns = await prisma.intern.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, userId: true, name: true }
    });

    const attendances = await prisma.attendanceLog.findMany({
      where: { date: todayStr }
    });
    
    // Map of internIds who already checked in
    const checkedInMap = new Set(attendances.map(a => a.internId));

    // 3. Find interns who haven't checked in yet
    const pendingInterns = interns.filter(i => !checkedInMap.has(i.id));

    if (pendingInterns.length === 0) {
      return NextResponse.json({ success: true, message: 'All interns have checked in.' });
    }

    // 4. Fetch User records to get their FCM tokens
    const pendingUserIds = pendingInterns.map(i => i.userId);
    const users = await prisma.user.findMany({
      where: {
        id: { in: pendingUserIds },
        fcmToken: { not: null }
      },
      select: { id: true, fcmToken: true }
    });

    const tokens = users.map(u => u.fcmToken).filter(Boolean);

    if (tokens.length === 0 || !messagingAdmin) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active push subscriptions found or Firebase Admin not initialized.',
        pendingCount: pendingInterns.length
      });
    }

    // 5. Send Broadcast Push via Firebase Admin
    const message = {
      notification: {
        title: '⏰ Pengingat Absen Masuk!',
        body: 'Selamat Pagi! Jangan lupa untuk melakukan check-in absensi hari ini di portal InternHub.',
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
    console.error('Morning Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
