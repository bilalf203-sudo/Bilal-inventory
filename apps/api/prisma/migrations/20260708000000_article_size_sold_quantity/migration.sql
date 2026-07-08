-- Units sold directly from the warehouse (not through a marketplace).
ALTER TABLE "article_sizes" ADD COLUMN "sold_quantity" INTEGER NOT NULL DEFAULT 0;
