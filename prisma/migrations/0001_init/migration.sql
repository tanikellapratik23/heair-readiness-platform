CREATE EXTENSION IF NOT EXISTS vector;
-- Apply the remainder of the schema with `npx prisma migrate dev --name init`.
-- This marker migration enables pgvector before Prisma creates KnowledgeChunk.embedding.
