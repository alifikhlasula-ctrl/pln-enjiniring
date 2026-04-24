import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { messagingAdmin } from '@/lib/firebaseAdmin'

export async function POST(request) {
  try {
    const { type, tahun = '2026' } = await request.json()

    if (!['BELUM_ABSEN', 'BELUM_CLOCKOUT'].includes(type)) {
      return NextResponse.json({ error: 'Tipe reminder tidak valid' }, { status: 400 })
    }

    if (!messagingAdmin) {
      return NextResponse.json({ error: 'Firebase Admin belum dikonfigurasi pada server.' }, { status: 503 })
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // 1. Dapatkan semua intern yang aktif untuk tahun target
    const activeInterns = await prisma.intern.findMany({
      where: { status: 'ACTIVE', tahun: tahun },
      select: { id: true, userId: true, name: true }
    });

    if (activeInterns.length === 0) {
      return NextResponse.json({ message: 'Tidak ada intern aktif', sentCount: 0 })
    }

    const internIds = activeInterns.map(i => i.id);

    // 2. Dapatkan log absensi hari ini
    const todayLogs = await prisma.attendanceLog.findMany({
      where: {
        date: todayStr,
        internId: { in: internIds }
      }
    });

    let targetInternIds = [];
    let notificationPayload = {};

    if (type === 'BELUM_ABSEN') {
      // Cari intern yang tidak ada di todayLogs
      const loggedInternIds = todayLogs.map(l => l.internId);
      targetInternIds = internIds.filter(id => !loggedInternIds.includes(id));
      
      notificationPayload = {
        title: '⚠️ Waktunya Absen Pagi!',
        body: 'Anda belum melaporkan kehadiran hari ini. Silakan Clock-In atau pilih status Sakit/Izin sekarang.',
      };
    } 
    else if (type === 'BELUM_CLOCKOUT') {
      // Cari intern yang ada checkIn tapi checkOut nya null
      targetInternIds = todayLogs
        .filter(l => l.checkIn !== null && l.checkOut === null && l.status !== 'ABSENT')
        .map(l => l.internId);

      notificationPayload = {
        title: '🌙 Jangan Lupa Pulang!',
        body: 'Anda masih tercatat sedang bekerja. Silakan lakukan Clock-Out agar data absensi Anda valid hari ini.',
      };
    }

    if (targetInternIds.length === 0) {
      return NextResponse.json({ message: 'Semua intern sudah aman, tidak ada notifikasi yang dikirim.', sentCount: 0 })
    }

    // 3. Dapatkan FCM Token dari User
    const targetUserIds = activeInterns
      .filter(i => targetInternIds.includes(i.id))
      .map(i => i.userId);

    const users = await prisma.user.findMany({
      where: { id: { in: targetUserIds }, fcmToken: { not: null } },
      select: { fcmToken: true }
    });

    const tokens = users.map(u => u.fcmToken).filter(Boolean);

    if (tokens.length === 0) {
      return NextResponse.json({ 
        message: `Ditemukan ${targetInternIds.length} target, tapi tidak ada yang mengaktifkan Push Notification di perangkat mereka.`,
        sentCount: 0 
      });
    }

    // 4. Kirim Multicast Notification
    const response = await messagingAdmin.sendEachForMulticast({
      notification: notificationPayload,
      data: { url: type === 'BELUM_ABSEN' ? '/dashboard' : '/attendance' },
      tokens
    });

    // 5. Catat ke Audit Log
    await prisma.auditLog.create({
      data: {
        userId: 'admin_system', // Bisa diambil dari session jika route ini diamankan JWT
        action: 'SEND_REMINDER',
        details: {
          type,
          targetCount: targetInternIds.length,
          successCount: response.successCount,
          failureCount: response.failureCount
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      sentCount: response.successCount,
      failedCount: response.failureCount,
      targetCount: targetInternIds.length
    });

  } catch (err) {
    console.error('[POST /api/admin/reminders] Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
