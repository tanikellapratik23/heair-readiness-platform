-- Additional contextual questions are intentionally not attached to a readiness
-- subdimension. They are stored for authorized research/admin review only.
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'multi_select';

ALTER TABLE "Question"
  ALTER COLUMN "subDimensionId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "instrumentKey" VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS "Question_instrumentKey_key"
  ON "Question"("instrumentKey");
