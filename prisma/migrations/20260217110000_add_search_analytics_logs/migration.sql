CREATE TABLE "public"."SearchAnalyticsLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "rewrittenQuery" TEXT NOT NULL DEFAULT '',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "isZeroResult" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchAnalyticsLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SearchAnalyticsLog_createdAt_idx" ON "public"."SearchAnalyticsLog"("createdAt");
CREATE INDEX "SearchAnalyticsLog_isZeroResult_idx" ON "public"."SearchAnalyticsLog"("isZeroResult");
