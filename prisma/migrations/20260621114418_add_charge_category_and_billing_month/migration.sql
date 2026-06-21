/*
  Warnings:

  - Added the required column `billing_month` to the `billing_line_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `charge_category` to the `billing_line_item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "billing_line_item" ADD COLUMN     "billing_month" TEXT NOT NULL,
ADD COLUMN     "charge_category" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "billing_line_item_billing_month_idx" ON "billing_line_item"("billing_month");

-- CreateIndex
CREATE INDEX "billing_line_item_charge_category_idx" ON "billing_line_item"("charge_category");

-- CreateIndex
CREATE INDEX "billing_line_item_region_idx" ON "billing_line_item"("region");
