/*
  Warnings:

  - The `status` column on the `ingestion_run` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('running', 'success', 'failed');

-- AlterTable
ALTER TABLE "ingestion_run" DROP COLUMN "status",
ADD COLUMN     "status" "IngestionStatus" NOT NULL DEFAULT 'running';

-- AddForeignKey
ALTER TABLE "billing_line_item" ADD CONSTRAINT "billing_line_item_ingestion_run_id_fkey" FOREIGN KEY ("ingestion_run_id") REFERENCES "ingestion_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
