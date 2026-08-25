-- Production-readiness additions. Each change is additive so existing accounts,
-- assessment sessions, and reports remain readable.

DO $$ BEGIN
  CREATE TYPE "MethodologyApprovalStatus" AS ENUM ('draft', 'approved', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ActionPlanStatus" AS ENUM ('not_started', 'planned', 'in_progress', 'completed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "unitLabel" TEXT NOT NULL DEFAULT 'Department or unit';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unitName" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "helpText" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "allowNotApplicable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "allowDepartmentScope" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AssessmentSession" ADD COLUMN IF NOT EXISTS "unitNameAtTime" TEXT;
ALTER TABLE "AssessmentSession" ADD COLUMN IF NOT EXISTS "methodologyVersion" TEXT NOT NULL DEFAULT 'heair-v1-provisional';
ALTER TABLE "AssessmentSession" ADD COLUMN IF NOT EXISTS "clientSubmissionId" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentSession_clientSubmissionId_key" ON "AssessmentSession"("clientSubmissionId") WHERE "clientSubmissionId" IS NOT NULL;
ALTER TABLE "ScoreResult" ADD COLUMN IF NOT EXISTS "methodologyVersion" TEXT NOT NULL DEFAULT 'heair-v1-provisional';
ALTER TABLE "ScoreResult" ADD COLUMN IF NOT EXISTS "scoredResponseCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScoreResult" ADD COLUMN IF NOT EXISTS "excludedResponseCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ScoreResult" ADD COLUMN IF NOT EXISTS "responseCoveragePercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "KnowledgeDocument" ADD COLUMN IF NOT EXISTS "publisher" TEXT;
ALTER TABLE "KnowledgeDocument" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMPTZ;

-- Derive coverage metadata from existing saved responses. Excluded special
-- values are kept out of the score denominator rather than treated as zero.
WITH response_counts AS (
  SELECT
    qr."sessionId",
    COUNT(*) FILTER (WHERE qr."responseValue"::text NOT IN ('"not_sure"', '"not_applicable"'))::INTEGER AS scored_count,
    COUNT(*) FILTER (WHERE qr."responseValue"::text IN ('"not_sure"', '"not_applicable"'))::INTEGER AS excluded_count,
    COUNT(*)::INTEGER AS answered_count
  FROM "QuestionResponse" qr
  GROUP BY qr."sessionId"
)
UPDATE "ScoreResult" sr
SET
  "scoredResponseCount" = rc.scored_count,
  "excludedResponseCount" = rc.excluded_count,
  "responseCoveragePercent" = CASE WHEN rc.answered_count = 0 THEN 0 ELSE ROUND((rc.scored_count::NUMERIC / rc.answered_count::NUMERIC) * 100)::INTEGER END
FROM response_counts rc
WHERE sr."sessionId" = rc."sessionId" AND sr."scoredResponseCount" = 0;

CREATE TABLE IF NOT EXISTS "UserStakeholderRole" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "StakeholderRole" NOT NULL,
  "approvedAt" TIMESTAMPTZ,
  "verificationPending" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserStakeholderRole_userId_role_key" UNIQUE ("userId", "role")
);
CREATE INDEX IF NOT EXISTS "UserStakeholderRole_role_idx" ON "UserStakeholderRole"("role");

CREATE TABLE IF NOT EXISTS "AssessmentDimensionComment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL REFERENCES "AssessmentSession"("id") ON DELETE CASCADE,
  "dimensionId" TEXT NOT NULL REFERENCES "Dimension"("id"),
  "text" VARCHAR(1200) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssessmentDimensionComment_sessionId_dimensionId_key" UNIQUE ("sessionId", "dimensionId")
);

CREATE TABLE IF NOT EXISTS "AssessmentMethodology" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "version" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "citation" TEXT,
  "sourceUrl" TEXT,
  "approvalStatus" "MethodologyApprovalStatus" NOT NULL DEFAULT 'draft',
  "approvedAt" TIMESTAMPTZ,
  "configuration" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "institutionId" UUID REFERENCES "Institution"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "ChatConversation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "assessmentSessionId" UUID REFERENCES "AssessmentSession"("id") ON DELETE SET NULL,
  "title" VARCHAR(180) NOT NULL,
  "methodologyVersion" TEXT NOT NULL DEFAULT 'heair-v1-provisional',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ChatConversation_userId_updatedAt_idx" ON "ChatConversation"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL REFERENCES "ChatConversation"("id") ON DELETE CASCADE,
  "role" VARCHAR(20) NOT NULL,
  "content" VARCHAR(4000) NOT NULL,
  "sources" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

CREATE TABLE IF NOT EXISTS "ActionPlanItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "assessmentSessionId" UUID REFERENCES "AssessmentSession"("id") ON DELETE SET NULL,
  "title" VARCHAR(180) NOT NULL,
  "whyItMatters" VARCHAR(1200) NOT NULL,
  "dimensionId" TEXT REFERENCES "Dimension"("id"),
  "subDimensionId" TEXT REFERENCES "SubDimension"("id"),
  "assessmentEvidence" VARCHAR(1200),
  "suggestedOwner" VARCHAR(180),
  "suggestedDeadline" DATE,
  "status" "ActionPlanStatus" NOT NULL DEFAULT 'not_started',
  "example" VARCHAR(1200),
  "supportingSources" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ActionPlanItem_userId_status_idx" ON "ActionPlanItem"("userId", "status");

CREATE TABLE IF NOT EXISTS "ExportAuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "exportType" VARCHAR(80) NOT NULL,
  "scope" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ExportAuditLog_userId_createdAt_idx" ON "ExportAuditLog"("userId", "createdAt");

-- Safely backfill existing single-role accounts into the multi-role relation.
INSERT INTO "UserStakeholderRole" ("userId", "role", "approvedAt")
SELECT "id", "role", CURRENT_TIMESTAMP
FROM "User"
WHERE "role" IS NOT NULL
ON CONFLICT ("userId", "role") DO NOTHING;
