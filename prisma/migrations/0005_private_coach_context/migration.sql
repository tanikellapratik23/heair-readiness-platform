CREATE TYPE "CoachContextScope" AS ENUM ('private');

CREATE TABLE "CoachContextDocument" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "institutionId" UUID,
  "title" VARCHAR(180) NOT NULL,
  "originalFileName" VARCHAR(180) NOT NULL,
  "mediaType" VARCHAR(100) NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "fileData" BYTEA NOT NULL,
  "extractedText" TEXT NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "accessScope" "CoachContextScope" NOT NULL DEFAULT 'private',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoachContextDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CoachContextChunk" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "documentId" UUID NOT NULL,
  "chunkText" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoachContextChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachContextDocument_userId_sha256_key" ON "CoachContextDocument"("userId", "sha256");
CREATE INDEX "CoachContextDocument_userId_createdAt_idx" ON "CoachContextDocument"("userId", "createdAt");
CREATE UNIQUE INDEX "CoachContextChunk_documentId_chunkIndex_key" ON "CoachContextChunk"("documentId", "chunkIndex");
CREATE INDEX "CoachContextChunk_documentId_idx" ON "CoachContextChunk"("documentId");

ALTER TABLE "CoachContextDocument" ADD CONSTRAINT "CoachContextDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachContextDocument" ADD CONSTRAINT "CoachContextDocument_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CoachContextChunk" ADD CONSTRAINT "CoachContextChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CoachContextDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
