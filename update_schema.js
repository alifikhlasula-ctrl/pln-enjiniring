const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');
content = content.replace(
  '  @@unique([internId, date])\n}',
  '  @@unique([internId, date])\n}\n\nmodel AttendanceCorrection {\n  id           String    @id @default(cuid())\n  internId     String\n  internName   String\n  date         String\n  type         String    // "IN" or "OUT"\n  time         String    // "08:00"\n  reason       String\n  status       String    @default("PENDING") // PENDING, APPROVED, REJECTED\n  \n  reviewedBy   String?\n  reviewedAt   DateTime?\n\n  createdAt    DateTime  @default(now())\n  updatedAt    DateTime  @updatedAt\n\n  @@index([internId])\n  @@index([status])\n}'
).replace(
  '  @@unique([internId, date])\r\n}',
  '  @@unique([internId, date])\r\n}\r\n\r\nmodel AttendanceCorrection {\r\n  id           String    @id @default(cuid())\r\n  internId     String\r\n  internName   String\r\n  date         String\r\n  type         String    // "IN" or "OUT"\r\n  time         String    // "08:00"\r\n  reason       String\r\n  status       String    @default("PENDING") // PENDING, APPROVED, REJECTED\r\n  \r\n  reviewedBy   String?\r\n  reviewedAt   DateTime?\r\n\r\n  createdAt    DateTime  @default(now())\r\n  updatedAt    DateTime  @updatedAt\r\n\r\n  @@index([internId])\r\n  @@index([status])\r\n}'
);
fs.writeFileSync('prisma/schema.prisma', content);
