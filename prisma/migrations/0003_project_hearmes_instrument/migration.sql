ALTER TABLE "Question"
ADD COLUMN IF NOT EXISTS "metricType" VARCHAR(40);

ALTER TABLE "AssessmentSession"
ALTER COLUMN "methodologyVersion" SET DEFAULT 'project-hearmes-v2-draft';

ALTER TABLE "ScoreResult"
ALTER COLUMN "methodologyVersion" SET DEFAULT 'project-hearmes-v2-draft';

ALTER TABLE "ChatConversation"
ALTER COLUMN "methodologyVersion" SET DEFAULT 'project-hearmes-v2-draft';
