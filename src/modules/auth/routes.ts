import type { FastifyInstance } from "fastify";
import { SystemRole, type StakeholderRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";

const assessmentRole = z.enum(["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"]);
const registration = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  fullName: z.string().trim().min(1).max(160),
  role: assessmentRole,
  roles: z.array(assessmentRole).min(1).max(6).optional(),
  institutionName: z.string().trim().min(2).max(180),
  unitName: z.string().trim().min(1).max(180).optional()
});
const login = z.object({ email: z.string().email(), password: z.string().min(8).max(256) });
const profile = z.object({ role: assessmentRole, departmentId: z.string().uuid(), institutionId: z.string().uuid().optional() });
const rolesProfile = z.object({ activeRole: assessmentRole, roles: z.array(assessmentRole).min(1).max(6), unitName: z.string().trim().min(1).max(180).nullable().optional() });
const DEFAULT_LEGACY_INSTITUTION = "University of North Carolina at Charlotte";
const activeRoles = new Set<StakeholderRole>(["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"]);
const legacyRoleMap: Partial<Record<StakeholderRole, StakeholderRole>> = {
  administrator_leadership: "executive_leadership",
  leadership: "executive_leadership",
  communications: "programming_staff",
  it_staff: "programming_staff",
  academic_business_affairs_staff: "administrative_staff",
  business_affairs: "administrative_staff"
};

function cleanInstitutionName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function accountUser(user: { id: string; email: string; fullName: string | null; role: string | null; unitName?: string | null; systemRole: SystemRole; institution?: { id: string; name: string } | null; stakeholderRoles?: Array<{ role: string; approvedAt?: Date | null; verificationPending?: boolean }> }) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    roles: user.stakeholderRoles?.map((role) => ({ role: role.role, approvedAt: role.approvedAt ?? null, verificationPending: role.verificationPending ?? false })) ?? (user.role ? [{ role: user.role, approvedAt: null, verificationPending: false }] : []),
    unitName: user.unitName ?? null,
    systemRole: user.systemRole,
    institution: user.institution ?? null
  };
}

function constantTimeMatch(value: string, expected: string) {
  const actual = Buffer.from(value);
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

function isConfiguredAdminLogin(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLocaleLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  return Boolean(configuredEmail && configuredPassword && constantTimeMatch(email.trim().toLocaleLowerCase(), configuredEmail) && constantTimeMatch(password, configuredPassword));
}

async function provisionConfiguredAdmin(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email: email.trim().toLocaleLowerCase() },
    update: { fullName: "Project HEARMES Administrator", passwordHash, systemRole: SystemRole.admin },
    create: { email: email.trim().toLocaleLowerCase(), fullName: "Project HEARMES Administrator", passwordHash, systemRole: SystemRole.admin },
    include: { institution: { select: { id: true, name: true } }, stakeholderRoles: { select: { role: true, approvedAt: true, verificationPending: true } } }
  });
}

async function completeLegacyAccount(user: { id: string; email: string; fullName: string | null; role: StakeholderRole | null; systemRole: SystemRole; institutionId: string | null; institution: { id: string; name: string } | null; unitName?: string | null; stakeholderRoles?: Array<{ role: StakeholderRole }> }) {
  const role = user.role && activeRoles.has(user.role) ? user.role : (user.role ? legacyRoleMap[user.role] : undefined) ?? "student";
  const institution = user.institution ?? await prisma.institution.upsert({
    where: { name: DEFAULT_LEGACY_INSTITUTION },
    update: {},
    create: { name: DEFAULT_LEGACY_INSTITUTION }
  });
  const hasRole = user.stakeholderRoles?.some((savedRole) => savedRole.role === role);
  if (user.role === role && user.institutionId === institution.id && hasRole) return user;
  return prisma.user.update({
    where: { id: user.id },
    data: { role, institutionId: institution.id, stakeholderRoles: { upsert: { where: { userId_role: { userId: user.id, role } }, update: { verificationPending: false, approvedAt: new Date() }, create: { role, approvedAt: new Date() } } } },
    include: { institution: { select: { id: true, name: true } }, stakeholderRoles: { select: { role: true, approvedAt: true, verificationPending: true } } }
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
        institutionId: institution.id,
        unitName: body.unitName || null,
        stakeholderRoles: { create: [...new Set(body.roles ?? [body.role])].map((role) => ({ role, approvedAt: new Date() })) }
      },
      include: { institution: { select: { id: true, name: true } }, stakeholderRoles: { select: { role: true, approvedAt: true, verificationPending: true } } }
    });
    return reply.code(201).send({ user: accountUser(user), token: app.jwt.sign({ sub: user.id }) });
  });
  app.post("/auth/login", async (request, reply) => {
    const body = login.parse(request.body);
    if (isConfiguredAdminLogin(body.email, body.password)) {
      const admin = await provisionConfiguredAdmin(body.email, body.password);
      return { user: accountUser(admin), token: app.jwt.sign({ sub: admin.id }) };
    }
    const user = await prisma.user.findUnique({ where: { email: body.email }, include: { institution: { select: { id: true, name: true } }, stakeholderRoles: { select: { role: true, approvedAt: true, verificationPending: true } } } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return fail(reply, 401, "Invalid email or password.");
    const completedUser = await completeLegacyAccount(user);
    return { user: accountUser(completedUser), token: app.jwt.sign({ sub: completedUser.id }) };
  });
  app.get("/me", async (request, reply) => {
    const user = await currentUser(request);
    if (!user) return fail(reply, 404, "User not found.");
    if (user.systemRole === SystemRole.admin) return accountUser(user);
    return accountUser(await completeLegacyAccount(user));
  });
  app.patch("/me/role", async (request, reply) => {
    const user = await currentUser(request); if (!user) return fail(reply, 404, "User not found."); const body = profile.parse(request.body);
    const department = await prisma.department.findUnique({ where: { id: body.departmentId } }); if (!department) return fail(reply, 400, "Department not found.");
    if (body.institutionId && body.institutionId !== department.institutionId) return fail(reply, 400, "Department does not belong to institution.");
    if (user.role && user.role !== body.role && !user.stakeholderRoles.some((savedRole) => savedRole.role === body.role)) return fail(reply, 409, "Add this stakeholder role to your account before using it.");
    if (user.institutionId && user.institutionId !== department.institutionId) return fail(reply, 409, "Your institution is fixed for this account.");
    return prisma.user.update({ where: { id: user.id }, data: { role: body.role, departmentId: department.id, institutionId: user.institutionId ?? department.institutionId, stakeholderRoles: { upsert: { where: { userId_role: { userId: user.id, role: body.role } }, update: {}, create: { role: body.role, approvedAt: new Date() } } } } });
  });
  app.patch("/me/roles", async (request, reply) => {
    const user = await currentUser(request); if (!user) return fail(reply, 404, "User not found.");
    const body = rolesProfile.parse(request.body);
    if (!body.roles.includes(body.activeRole)) return fail(reply, 400, "Choose an active role from the roles on your account.");
    const roles = [...new Set(body.roles)];
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: body.activeRole,
        unitName: body.unitName === undefined ? undefined : body.unitName,
        stakeholderRoles: {
          deleteMany: { role: { notIn: roles } },
          upsert: roles.map((role) => ({ where: { userId_role: { userId: user.id, role } }, update: {}, create: { role, approvedAt: new Date() } }))
        }
      },
      include: { institution: { select: { id: true, name: true } }, stakeholderRoles: { select: { role: true, approvedAt: true, verificationPending: true } } }
    });
    return accountUser(updated);
  });
}
