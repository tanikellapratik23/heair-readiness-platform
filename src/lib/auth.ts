import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

export async function currentUser(request: FastifyRequest) {
  await request.jwtVerify();
  const payload = request.user as { sub: string };
  return prisma.user.findUnique({ where: { id: payload.sub }, include: { department: true, institution: true } });
}

export function owns(userId: string, resourceUserId: string) {
  return userId === resourceUserId;
}
