-- AlterTable: per-size SKU on article_sizes (one SKU per size, from the factory CSV)
ALTER TABLE "article_sizes" ADD COLUMN "sku" TEXT;

-- CreateIndex: fast lookup when matching daily sale reports by SKU
CREATE INDEX "article_sizes_sku_idx" ON "article_sizes"("sku");
