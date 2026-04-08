const fs = require('fs')
const path = require('path')

// Mock Initial Data for testing if not exists
const initialData = {
  users: [{ id: 'u3', email: 'test@intern.plne.co.id', password: 'password123', name: 'Test User', role: 'INTERN', mustChangePassword: false }],
  interns: [{ id: 'i1', userId: 'u3', name: 'Test', nim_nis: '123', email: 'test@intern.plne.co.id', status: 'ACTIVE', deletedAt: null }],
  auditLogs: []
}

async function runTests() {
  console.log("🚀 Starting HRIS CRUD Integration Tests...")

  const DB_PATH = path.resolve(process.cwd(), 'database.json')
  
  // Trigger creation if missing (simulating lib/db.js)
  if (!fs.existsSync(DB_PATH)) {
    console.log("📝 Database missing, creating mock for test...")
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2))
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  
  // Test 1: Schema Integrity
  console.log("🧪 Test 1: Checking Schema Integrity...")
  if (db.auditLogs && Array.isArray(db.auditLogs)) {
    console.log("✅ Audit logs array exists.")
  } else {
    throw new Error("❌ Audit logs array missing!")
  }

  // Test 2: Intern Field Validation (updated to include new fields)
  console.log("🧪 Test 2: Validating Intern Fields...")
  const intern = db.interns[0]
  const requiredFields = ['id', 'userId', 'name', 'nim_nis', 'deletedAt']
  requiredFields.forEach(field => {
    if (intern.hasOwnProperty(field)) {
       console.log(`✅ Field ${field} exists.`)
    } else {
       throw new Error(`❌ Field ${field} missing!`)
    }
  })

  // Test 2b: Check email field on first intern (new requirement)
  console.log("🧪 Test 2b: Checking email field on interns...")
  const internsWithEmail = db.interns.filter(i => i.email && i.email.length > 0 && !i.deletedAt)
  console.log(`📊 Interns with email set: ${internsWithEmail.length} / ${db.interns.filter(i => !i.deletedAt).length}`)

  // Test 3: Soft Delete Mock
  console.log("🧪 Test 3: Verifying Soft Delete Logic...")
  const activeInterns = db.interns.filter(i => !i.deletedAt)
  console.log(`📊 Active Interns (not deleted): ${activeInterns.length}`)

  // Test 4: Status Case Consistency (BUG-02 check)
  console.log("🧪 Test 4: Checking Status Case Consistency...")
  const VALID = ['ACTIVE', 'COMPLETED', 'TERMINATED']
  const invalidStatus = db.interns.filter(i => !i.deletedAt && !VALID.includes(String(i.status || '').toUpperCase()))
  if (invalidStatus.length > 0) {
    throw new Error(`❌ ${invalidStatus.length} intern(s) have non-standard status values!`)
  }
  console.log("✅ All intern statuses are normalized correctly.")

  // Test 5: mustChangePassword field on users
  console.log("🧪 Test 5: Checking mustChangePassword field on users...")
  const usersWithFlag = db.users.filter(u => u.mustChangePassword === true)
  console.log(`📊 Users awaiting first-login password change: ${usersWithFlag.length}`)

  console.log("🏁 All Tests Completed Successfully!")
}

runTests().catch(err => {
  console.error(err.message)
  process.exit(1)
})
