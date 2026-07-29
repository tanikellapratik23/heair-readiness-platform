import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export async function currentUser(request: FastifyRequest) {
  await request.jwtVerify();
  const payload = request.user as { sub: string };
  // Select the account fields explicitly. In particular, never send a password
  // hash back through /me or one of the public account routes.
  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      systemRole: true,
      departmentId: true,
      institutionId: true,
      department: { select: { id: true, name: true, institutionId: true } },
      institution: { select: { id: true, name: true } }
    }
  });
}

export function owns(userId: string, resourceUserId: string) {
  return userId === resourceUserId;
}
