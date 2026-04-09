import { NextResponse } from 'next/server'
import { getDB, db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getDB('FULL')
    let interns = data.interns || []
    interns = interns.filter(i => !i.deletedAt)
    // Merge user email for completeness if needed, although analytics only needs demographic fields which are in intern object.
    const attendances = data.attendances || []
    const reports = data.reports || []
    const settings = data.settings || {}
    const targets = settings.capacityTargets || {}

    // Helpers for Payroll Logic Sync
    const FLAT_RATE = 25000
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // 1. Demographics & Distribution
    const demographics = { gender: {}, jenjang: {}, topUniversities: {} }
    const bidangDistribution = {}
    
    interns.forEach(i => {
      demographics.gender[i.gender] = (demographics.gender[i.gender] || 0) + 1
      demographics.jenjang[i.jenjang || 'S1'] = (demographics.jenjang[i.jenjang || 'S1'] || 0) + 1
      demographics.topUniversities[i.university] = (demographics.topUniversities[i.university] || 0) + 1
      
      if (i.status === 'ACTIVE') {
        bidangDistribution[i.bidang] = (bidangDistribution[i.bidang] || 0) + 1
      }
    })

    // 2. Real-time Budget (Current Month) - SYNC WITH PAYROLL LOGIC
    let totalEstimatedBudget = 0
    let totalValidPresence = 0
    let totalExpectedReports = 0
    let totalActualReports = 0

    const activeInterns = interns.filter(i => i.status === 'ACTIVE')
    
    activeInterns.forEach(intern => {
      // Get attendances for THIS person in THIS month
      const personAttendances = attendances.filter(a => {
        const d = new Date(a.date || a.checkIn)
        return a.internId === intern.id && a.status === 'PRESENT' && 
               (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear)
      })

      totalExpectedReports += personAttendances.length

      // Calculate Valid Presence (Sync with Payroll: Presence must have a Report)
      personAttendances.forEach(att => {
        const reportExists = reports.some(r => 
          r.userId === intern.userId && 
          (r.date === att.date || r.reportDate === att.date) && 
          r.status !== 'DRAFT'
        )
        if (reportExists) {
          totalValidPresence++
          totalActualReports++
        }
      })
    })

    totalEstimatedBudget = totalValidPresence * FLAT_RATE

    // 3. Performance (Actual Report Compliance Rate)
    const reportCompliance = totalExpectedReports > 0 ? (totalActualReports / totalExpectedReports * 100).toFixed(1) : 0
    const performance = {
      avgRating: (reportCompliance / 20).toFixed(1), // Scale to 5.0
      submissionTrend: totalActualReports,
      complianceRate: reportCompliance
    }

    // 4. Forecasting (6 Months) - Historical Behavior Baseline
    const months = []
    const forecastActive = []
    const forecastBudget = []
    const forecastGap = []

    // Pre-calculate historical rates for all active interns
    const internRates = {}
    activeInterns.forEach(intern => {
      const pastAttendances = attendances.filter(a => a.internId === intern.id && a.status === 'PRESENT')
      const pastValid = pastAttendances.filter(att => 
        reports.some(r => r.userId === intern.userId && (r.date === att.date || r.reportDate === att.date) && r.status !== 'DRAFT')
      ).length
      
      // If no history, assume 90% compliance (standard)
      internRates[intern.id] = pastAttendances.length > 0 ? (pastValid / pastAttendances.length) : 0.9
    })

    for (let m = 0; m < 6; m++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + m, 1)
      const monthLabel = targetDate.toLocaleString('default', { month: 'short', year: '2-digit' })
      months.push(monthLabel)

      let activeInMonthCount = 0
      let estimatedMonthBudget = 0
      const bidangCountsInMonth = {}

      interns.forEach(i => {
        if (!i.periodStart || !i.periodEnd) return
        const start = new Date(i.periodStart)
        const end = new Date(i.periodEnd)
        
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)

        if (start <= monthEnd && end >= monthStart) {
          activeInMonthCount++
          bidangCountsInMonth[i.bidang] = (bidangCountsInMonth[i.bidang] || 0) + 1
          
          // Apply historical rate to 22-day baseline
          const rate = internRates[i.id] || 0.9
          estimatedMonthBudget += (22 * FLAT_RATE * rate)
        }
      })

      forecastActive.push(activeInMonthCount)
      forecastBudget.push(estimatedMonthBudget)

      // Calculate gap based on targets
      let monthGap = 0
      Object.keys(targets).forEach(bidang => {
        const current = bidangCountsInMonth[bidang] || 0
        const target = targets[bidang] || 0
        if (current < target) monthGap += (target - current)
      })
      forecastGap.push(monthGap)
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalInterns: interns.length,
        activeInterns: activeInterns.length,
        estimatedBudget: totalEstimatedBudget,
        completionRate: interns.length > 0 ? (interns.filter(i => i.status === 'COMPLETED').length / interns.length * 100).toFixed(1) : 0
      },
      demographics,
      performance,
      distribution: {
        bidang: bidangDistribution,
        targets
      },
      forecasting: {
        months,
        activeInterns: forecastActive,
        budget: forecastBudget,
        gap: forecastGap
      }
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
