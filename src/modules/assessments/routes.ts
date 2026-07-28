import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma, QuestionType, SessionStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";
import { ScoringService } from "../scoring/service.js";

const responseSchema = z.object({ questionId: z.string().uuid(), value: z.union([z.number(), z.string(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())]) });

function validValue(type: QuestionType, value: unknown) {
  if (type === "likert_5") return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
  if (type === "yes_no") return typeof value === "boolean" || value === "yes" || value === "no";
  if (type === "free_text") return typeof value === "string";
  return typeof value === "string";
}

export async function assessmentRoutes(app: FastifyInstance) {
  app.post("/assessments", async (request, reply) => {
    const user = await currentUser(request); if (!user?.role) return fail(reply, 400, "Set your stakeholder role and department before starting an assessment.");
    const session = await prisma.assessmentSession.create({ data: { userId: user.id, roleAtTime: user.role, departmentIdAtTime: user.departmentId } });
    return reply.code(201).send(session);
  });

  app.get("/assessments/:id", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id;
    const session = await prisma.assessmentSession.findUnique({ where: { id }, include: { responses: true } });
    if (!session) return fail(reply, 404, "Assessment not found."); if (session.userId !== user?.id && user?.systemRole === "self") return fail(reply, 403, "Not permitted.");
    const total = await prisma.question.count({ where: { role: session.roleAtTime, active: true, sessionScoped: false } });
    return { ...session, progress: { answered: session.responses.length, total } };
  });

  app.get("/assessments/:id/next-question", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id;
    const session = await prisma.assessmentSession.findUnique({ where: { id }, include: { responses: { select: { questionId: true } } } });
    if (!session) return fail(reply, 404, "Assessment not found."); if (session.userId !== user?.id) return fail(reply, 403, "Not permitted.");
    if (session.status !== SessionStatus.in_progress) return fail(reply, 409, "Assessment is no longer in progress.");
    const answered = session.responses.map((r) => r.questionId);
    const question = await prisma.question.findFirst({ where: { role: session.roleAtTime, active: true, id: { notIn: answered }, sessionScoped: false }, include: { subDimension: true }, orderBy: [{ subDimension: { dimension: { sortOrder: "asc" } } }, { subDimension: { sortOrder: "asc" } }] });
    return { complete: !question, question };
  });

  app.post("/assessments/:id/responses", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id; const body = responseSchema.parse(request.body);
    const session = await prisma.assessmentSession.findUnique({ where: { id } }); if (!session) return fail(reply, 404, "Assessment not found.");
    if (session.userId !== user?.id || session.status !== "in_progress") return fail(reply, 403, "Cannot submit a response for this assessment.");
    const question = await prisma.question.findUnique({ where: { id: body.questionId } });
    if (!question || question.role !== session.roleAtTime || !validValue(question.questionType, body.value)) return fail(reply, 400, "Invalid question or response value.");
    const value = body.value as Prisma.InputJsonValue;
    const response = await prisma.questionResponse.upsert({ where: { sessionId_questionId: { sessionId: id, questionId: body.questionId } }, update: { responseValue: value }, create: { sessionId: id, questionId: body.questionId, responseValue: value } });
    return reply.code(201).send(response);
  });

  app.post("/assessments/:id/complete", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id;
    const session = await prisma.assessmentSession.findUnique({ where: { id } }); if (!session) return fail(reply, 404, "Assessment not found.");
    if (session.userId !== user?.id) return fail(reply, 403, "Not permitted.");
    const questionCount = await prisma.question.count({ where: { role: session.roleAtTime, active: true, sessionScoped: false } });
    const responseCount = await prisma.questionResponse.count({ where: { sessionId: id } });
    if (responseCount < questionCount) return fail(reply, 400, `Complete all ${questionCount} base questions before finishing.`);
    await prisma.assessmentSession.update({ where: { id }, data: { status: "completed", completedAt: new Date() } });
    return ScoringService.scoreSession(id);
  });
}
