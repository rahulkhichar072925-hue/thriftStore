-- AlterTable
ALTER TABLE "public"."Product"
ADD COLUMN "audiences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing audience data from old category format "<Audience> - <Category>"
UPDATE "public"."Product"
SET
  "audiences" = ARRAY['Men'],
  "category" = TRIM(SUBSTRING("category" FROM 7))
WHERE LOWER("category") LIKE 'men - %';

UPDATE "public"."Product"
SET
  "audiences" = ARRAY['Women'],
  "category" = TRIM(SUBSTRING("category" FROM 9))
WHERE LOWER("category") LIKE 'women - %';

UPDATE "public"."Product"
SET
  "audiences" = ARRAY['Kids'],
  "category" = TRIM(SUBSTRING("category" FROM 8))
WHERE LOWER("category") LIKE 'kids - %';
