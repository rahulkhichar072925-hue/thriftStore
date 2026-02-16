-- AlterTable
ALTER TABLE "public"."Order"
ADD COLUMN "statusTimeline" JSONB NOT NULL DEFAULT '[]';

-- Backfill current timeline for existing orders
UPDATE "public"."Order"
SET "statusTimeline" = jsonb_build_array(
  jsonb_build_object(
    'status', "status"::text,
    'at', to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
)
WHERE jsonb_array_length("statusTimeline") = 0;
