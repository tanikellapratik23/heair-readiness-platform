import { FastifyReply } from "fastify";

export function fail(reply: FastifyReply, statusCode: number, message: string) {
  return reply.code(statusCode).send({ error: message });
}
