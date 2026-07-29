import type { FastifyInstance } from "fastify";
import type { StakeholderRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";

const assessmentRole = z.enum(["student", "faculty", "leadership", "business_affairs", "communications"]);
const registration = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(1).max(160),
  role: assessmentRole,
  institutionName: z.string().trim().min(2).max(180)
});
const login = z.object({ email: z.string().email(), password: z.string().min(8) });
const profile = z.object({ role: assessmentRole, departmentId: z.string().uuid(), institutionId: z.string().uuid().optional() });
const DEFAULT_LEGACY_INSTITUTION = "University of North Carolina at Charlotte";
const activeRoles = new Set<StakeholderRole>(["student", "faculty", "leadership", "business_affairs", "communications"]);
const legacyRoleMap: Partial<Record<StakeholderRole, StakeholderRole>> = {
  administrator_leadership: "leadership",
  it_staff: "communications",
  academic_business_affairs_staff: "business_affairs"
};

function cleanInstitutionName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function accountUser(user: { id: string; email: string; fullName: string | null; role: string | null; institution?: { id: string; name: string } | null }) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    institution: user.institution ?? null
  };
}

async function completeLegacyAccount(user: { id: string; email: string; fullName: string | null; role: StakeholderRole | null; institutionId: string | null; institution: { id: string; name: string } | null }) {
  const role = user.role && activeRoles.has(user.role) ? user.role : (user.role ? legacyRoleMap[user.role] : undefined) ?? "student";
  const institution = user.institution ?? await prisma.institution.upsert({
    where: { name: DEFAULT_LEGACY_INSTITUTION },
    update: {},
    create: { name: DEFAULT_LEGACY_INSTITUTION }
  });
  if (user.role === role && user.institutionId === institution.id) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { role, institutionId: institution.id },
    include: { institution: { select: { id: true, name: true } } }
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const body = registration.parse(request.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return fail(reply, 409, "Email already registered. Please sign in instead.");

    const institutionName = cleanInstitutionName(body.institutionName);
    const institution = await prisma.institution.upsert({
      where: { name: institutionName },
      update: {},
      create: { name: institutionName }
    });
    const user = await prisma.user.create({
      data: {
        email: body.email,
        fullName: body.fullName,
        passwordHash: await bcrypt.hash(body.password, 12),
        role: body.role,
        institutionId: institution.id
      },
      include: { institution: { select: { id: true, name: true } } }
    });
    return reply.code(201).send({ user: accountUser(user), token: app.jwt.sign({ sub: user.id }) });
  });
  app.post("/auth/login", async (request, reply) => {
    const body = login.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email }, include: { institution: { select: { id: true, name: true } } } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return fail(reply, 401, "Invalid email or password.");
    const completedUser = await completeLegacyAccount(user);
    return { user: accountUser(completedUser), token: app.jwt.sign({ sub: completedUser.id }) };
  });
  app.get("/me", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return fail(reply, 404, "User not found.");
    return completeLegacyAccount(user);
  });
  app.patch("/me/role", async (request, reply) => {
    const user = await currentUser(request); if (!user) return fail(reply, 404, "User not found."); const body = profile.parse(request.body);
    const department = await prisma.department.findUnique({ where: { id: body.departmentId } }); if (!department) return fail(reply, 400, "Department not found.");
    if (body.institutionId && body.institutionId !== department.institutionId) return fail(reply, 400, "Department does not belong to institution.");
    if (user.role && user.role !== body.role) return fail(reply, 409, "Your stakeholder role is fixed for this account.");
    if (user.institutionId && user.institutionId !== department.institutionId) return fail(reply, 409, "Your institution is fixed for this account.");
    return prisma.user.update({ where: { id: user.id }, data: { role: user.role ?? body.role, departmentId: department.id, institutionId: user.institutionId ?? department.institutionId } });
  });
}
