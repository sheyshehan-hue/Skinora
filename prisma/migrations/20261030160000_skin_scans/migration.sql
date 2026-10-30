-- CreateTable
CREATE TABLE "SkinScan" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "engine" TEXT NOT NULL,
    "skinType" TEXT NOT NULL,
    "concerns" TEXT[],
    "scores" JSONB NOT NULL,
    "overall" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkinScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkinScan_customerId_createdAt_idx" ON "SkinScan"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "SkinScan" ADD CONSTRAINT "SkinScan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
