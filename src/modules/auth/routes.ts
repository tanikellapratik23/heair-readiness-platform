import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { StakeholderRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";

const registration = z.object({ email: z.string().email(), password: z.string().min(8), fullName: z.string().min(1).optional() });
const profile = z.object({ role: z.nativeEnum(StakeholderRole), departmentId: z.string().uuid(), institutionId: z.string().uuid().optional() });

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const body = registration.parse(request.body); const exists = await prisma.user.findUnique({ where: { email: body.email } }); if (exists) return fail(reply, 409, "Email already registered.");
    const user = await prisma.user.create({ data: { email: body.email, fullName: body.fullName, passwordHash: await bcrypt.hash(body.password, 12) } });
    return reply.code(201).send({ user: { id: user.id, email: user.email, fullName: user.fullName }, token: app.jwt.sign({ sub: user.id }) });
  });
  app.post("/auth/login", async (request, reply) => {
    const body = registration.pick({ email: true, password: true }).parse(request.body); const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return fail(reply, 401, "Invalid email or password.");
    return { user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }, token: app.jwt.sign({ sub: user.id }) };
  });
  app.get("/me", async (request, reply) => { const user = await currentUser(request); return user ?? fail(reply, 404, "User not found."); });
  app.patch("/me/role", async (request, reply) => {
    const user = await currentUser(request); if (!user) return fail(reply, 404, "User not found."); const body = profile.parse(request.body);
    const department = await prisma.department.findUnique({ where: { id: body.departmentId } }); if (!department) return fail(reply, 400, "Department not found.");
    if (body.institutionId && body.institutionId !== department.institutionId) return fail(reply, 400, "Department does not belong to institution.");
    return prisma.user.update({ where: { id: user.id }, data: { role: body.role, departmentId: department.id, institutionId: department.institutionId } });
  });
}
