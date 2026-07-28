import { prisma } from "../src/lib/prisma.js";

const institution = await prisma.institution.upsert({ where: { name: "HEAIR Demo University" }, update: {}, create: { name: "HEAIR Demo University" } });
const department = await prisma.department.upsert({ where: { institutionId_name: { institutionId: institution.id, name: "Academic Innovation" } }, update: {}, create: { institutionId: institution.id, name: "Academic Innovation" } });
console.log(JSON.stringify({ institution, department }, null, 2));
await prisma.$disconnect();
