-- CreateTable
CREATE TABLE "billing_line_item" (
    "id" BIGSERIAL NOT NULL,
    "line_item_id" TEXT NOT NULL,
    "billing_period" DATE NOT NULL,
    "usage_start" TIMESTAMPTZ(3) NOT NULL,
    "usage_end" TIMESTAMPTZ(3) NOT NULL,
    "usage_date" DATE NOT NULL,
    "payer_account_id" TEXT NOT NULL,
    "usage_account_id" TEXT NOT NULL,
    "service_code" TEXT NOT NULL,
    "service_name" TEXT,
    "service_group" TEXT NOT NULL,
    "product_family" TEXT,
    "region" TEXT,
    "availability_zone" TEXT,
    "resource_id" TEXT,
    "charge_type" TEXT NOT NULL,
    "usage_type" TEXT,
    "operation" TEXT,
    "description" TEXT,
    "usage_amount" DECIMAL(24,8) NOT NULL,
    "unblended_cost" DECIMAL(24,8) NOT NULL,
    "pricing_unit" TEXT,
    "currency" TEXT NOT NULL,
    "environment" TEXT,
    "team" TEXT,
    "tags" JSONB,
    "ingestion_run_id" TEXT NOT NULL,
    "ingested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_run" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "source" TEXT NOT NULL,
    "rows_loaded" BIGINT NOT NULL DEFAULT 0,
    "billing_periods" TEXT[],
    "error" TEXT,

    CONSTRAINT "ingestion_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_line_item_usage_start_idx" ON "billing_line_item"("usage_start");

-- CreateIndex
CREATE INDEX "billing_line_item_usage_date_idx" ON "billing_line_item"("usage_date");

-- CreateIndex
CREATE INDEX "billing_line_item_billing_period_idx" ON "billing_line_item"("billing_period");

-- CreateIndex
CREATE INDEX "billing_line_item_service_code_idx" ON "billing_line_item"("service_code");

-- CreateIndex
CREATE INDEX "billing_line_item_service_group_idx" ON "billing_line_item"("service_group");

-- CreateIndex
CREATE INDEX "billing_line_item_usage_account_id_idx" ON "billing_line_item"("usage_account_id");

-- CreateIndex
CREATE INDEX "billing_line_item_environment_idx" ON "billing_line_item"("environment");

-- CreateIndex
CREATE INDEX "billing_line_item_team_idx" ON "billing_line_item"("team");
