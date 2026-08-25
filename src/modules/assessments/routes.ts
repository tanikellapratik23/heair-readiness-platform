import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma, QuestionType, SessionStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { currentUser } from "../../lib/auth.js";
import { fail } from "../../lib/errors.js";
import { ScoringService } from "../scoring/service.js";
import { EXCLUDED_RESPONSE_VALUES, METHODOLOGY_VERSION } from "../../lib/assessment-methodology.js";

const responseSchema = z.object({ questionId: z.string().uuid(), value: z.union([z.number(), z.string(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())]) });
const startSchema = z.object({ role: z.enum(["student", "faculty", "executive_leadership", "administrative_staff", "programming_staff", "finance_staff"]).optional() });
const dimensionCommentSchema = z.object({ dimensionId: z.string().min(1).max(80), text: z.string().trim().max(1200) });

function validValue(type: QuestionType, value: unknown) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).value : value;
  if (EXCLUDED_RESPONSE_VALUES.includes(raw as (typeof EXCLUDED_RESPONSE_VALUES)[number])) return true;
  if (type === "likert_5") return typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 5;
  if (type === "yes_no") return typeof value === "boolean" || value === "yes" || value === "no";
  if (type === "free_text") return typeof value === "string";
  return typeof value === "string";
}

export async function assessmentRoutes(app: FastifyInstance) {
  app.post("/assessments", async (request, reply) => {
    const user = await currentUser(request); if (!user?.role) return fail(reply, 400, "Add a stakeholder role before starting an assessment.");
    const body = startSchema.parse(request.body ?? {});
    const role = body.role ?? user.role;
    if (!user.stakeholderRoles.some((savedRole) => savedRole.role === role)) return fail(reply, 403, "Choose a stakeholder role that is saved to your account.");
    const existing = await prisma.assessmentSession.findFirst({ where: { userId: user.id, roleAtTime: role, status: "in_progress" }, orderBy: { startedAt: "desc" } });
    if (existing) return reply.code(200).send(existing);
    const session = await prisma.assessmentSession.create({ data: { userId: user.id, roleAtTime: role, departmentIdAtTime: user.departmentId, unitNameAtTime: user.unitName, methodologyVersion: METHODOLOGY_VERSION } });
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

  app.get("/assessments/:id/questions", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id;
    const session = await prisma.assessmentSession.findUnique({ where: { id }, include: { responses: { select: { questionId: true, responseValue: true } } } });
    if (!session) return fail(reply, 404, "Assessment not found.");
    if (session.userId !== user?.id) return fail(reply, 403, "Not permitted.");
    const questions = await prisma.question.findMany({
      where: { role: session.roleAtTime, active: true, sessionScoped: false },
      include: { subDimension: { include: { dimension: true } } },
      orderBy: [{ subDimension: { dimension: { sortOrder: "asc" } } }, { subDimension: { sortOrder: "asc" } }]
    });
    const responses = new Map(session.responses.map((response) => [response.questionId, response.responseValue]));
    return { session: { id: session.id, status: session.status, role: session.roleAtTime, methodologyVersion: session.methodologyVersion }, questions: questions.map((question) => ({ ...question, responseValue: responses.get(question.id) ?? null })) };
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

  app.put("/assessments/:id/dimension-comments/:dimensionId", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id;
    const body = dimensionCommentSchema.parse({ ...(request.body as object), dimensionId: (request.params as { dimensionId: string }).dimensionId });
    const session = await prisma.assessmentSession.findUnique({ where: { id } });
    if (!session) return fail(reply, 404, "Assessment not found.");
    if (session.userId !== user?.id || session.status !== "in_progress") return fail(reply, 403, "Cannot update this assessment.");
    const dimension = await prisma.dimension.findUnique({ where: { id: body.dimensionId } });
    if (!dimension) return fail(reply, 400, "Unknown readiness dimension.");
    if (!body.text) { await prisma.assessmentDimensionComment.deleteMany({ where: { sessionId: id, dimensionId: body.dimensionId } }); return reply.code(204).send(); }
    return prisma.assessmentDimensionComment.upsert({ where: { sessionId_dimensionId: { sessionId: id, dimensionId: body.dimensionId } }, update: { text: body.text }, create: { sessionId: id, dimensionId: body.dimensionId, text: body.text } });
  });

  app.post("/assessments/:id/complete", async (request, reply) => {
    const user = await currentUser(request); const id = (request.params as { id: string }).id;
    const session = await prisma.assessmentSession.findUnique({ where: { id } }); if (!session) return fail(reply, 404, "Assessment not found.");
    if (session.userId !== user?.id) return fail(reply, 403, "Not permitted.");
    if (session.status === "completed") return ScoringService.scoreSession(id);
    const questionCount = await prisma.question.count({ where: { role: session.roleAtTime, active: true, sessionScoped: false } });
    const responseCount = await prisma.questionResponse.count({ where: { sessionId: id } });
    if (responseCount < questionCount) return fail(reply, 400, `Complete all ${questionCount} base questions before finishing.`);
    await prisma.assessmentSession.update({ where: { id }, data: { status: "completed", completedAt: new Date() } });
    return ScoringService.scoreSession(id);
  });
}
