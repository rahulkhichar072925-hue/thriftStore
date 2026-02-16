ALTER TABLE "Product"
ADD COLUMN "stockQty" INTEGER NOT NULL DEFAULT 1;

UPDATE "Product"
SET "stockQty" = 0
WHERE "inStock" = false;

UPDATE "Product"
SET "inStock" = false
WHERE "stockQty" <= 0;

