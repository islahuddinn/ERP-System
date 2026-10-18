import fs from "fs"
import path from "path"

console.log("🚀 Phase 1 validation started...")

// -----------------------------
// STRICT SOURCE OF TRUTH ONLY
// -----------------------------
const schemaPath = path.resolve(__dirname, "../prisma/tenant/schema.prisma")

if (!fs.existsSync(schemaPath)) {
  console.error("❌ schema.prisma not found at:", schemaPath)
  process.exit(1)
}

console.log("📂 Validating schema:", schemaPath)

// -----------------------------
// READ SCHEMA
// -----------------------------
const schema = fs.readFileSync(schemaPath, "utf-8")

let errorCount = 0
let warningCount = 0

// -----------------------------
// RULE 1: No Prisma User relations
// -----------------------------
if (schema.includes("User @relation")) {
  console.error("❌ Found Prisma relation to User (NOT ALLOWED)")
  errorCount++
}

// -----------------------------
// RULE 2: No inverse relations
// -----------------------------
if (schema.match(/User\[\]/)) {
  console.error("❌ Found inverse relation User[] (NOT ALLOWED)")
  errorCount++
}

// -----------------------------
// RULE 3: Detect wrong coupling patterns
// -----------------------------
const forbiddenPatterns = [
  "creator User",
  "createdBy User",
  "user User",
  "approvedBy User",
  "processedBy User",
]

for (const pattern of forbiddenPatterns) {
  if (schema.includes(pattern)) {
    console.error(`❌ Forbidden relation detected: ${pattern}`)
    errorCount++
  }
}

// -----------------------------
// RULE 4: Ensure ID-based structure exists
// -----------------------------
const requiredIdFields = [
  "createdById",
  "updatedById",
  "approvedById",
  "userId",
]

let hasAnyIdField = false

for (const field of requiredIdFields) {
  if (schema.includes(field)) {
    hasAnyIdField = true
  }
}

if (!hasAnyIdField) {
  console.warn("⚠️ No standard user ID fields found (createdById/userId/etc.)")
  warningCount++
}

// -----------------------------
// FINAL RESULT
// -----------------------------
console.log("\n==============================")

if (errorCount === 0) {
  console.log("✅ PHASE 1 PASSED — Schema is fully decoupled")
} else {
  console.log(`❌ PHASE 1 FAILED — ${errorCount} critical issues found`)
  process.exit(1)
}

if (warningCount > 0) {
  console.log(`⚠️ Warnings: ${warningCount}`)
}

console.log("==============================")