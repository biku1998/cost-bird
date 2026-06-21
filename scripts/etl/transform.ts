import { chargeCategoryCaseSql, serviceGroupCaseSql } from "./mappings";

/** A service code is the product code, falling back to the product map's servicecode. */
const SERVICE_CODE = "COALESCE(line_item_product_code, product_servicecode)";

/** Billing month as 'YYYY-MM' from the hive partition, falling back to the start date. */
const BILLING_MONTH =
  "COALESCE(BILLING_PERIOD, strftime(bill_billing_period_start_date, '%Y-%m'))";

/**
 * Build the `INSERT ... SELECT` that normalizes one CUR Parquet source into the
 * attached Postgres `billing_line_item` table. `id` and `ingested_at` are left to
 * their DB defaults. Timestamps are read as UTC (the caller sets the session TZ).
 */
export function buildInsertSelect(src: string, runId: string): string {
  return `
    INSERT INTO pg.public.billing_line_item (
      line_item_id, billing_period, billing_month, usage_start, usage_end, usage_date,
      payer_account_id, usage_account_id,
      service_code, service_name, service_group, product_family,
      region, availability_zone, resource_id,
      charge_type, charge_category, usage_type, operation, description,
      usage_amount, unblended_cost, pricing_unit, currency,
      environment, team, tags, ingestion_run_id
    )
    SELECT
      identity_line_item_id,
      CAST(bill_billing_period_start_date AS DATE),
      ${BILLING_MONTH},
      CAST(line_item_usage_start_date AS TIMESTAMPTZ),
      CAST(line_item_usage_end_date AS TIMESTAMPTZ),
      CAST(line_item_usage_start_date AS DATE),
      bill_payer_account_id,
      line_item_usage_account_id,
      ${SERVICE_CODE},
      element_at(product, 'product_name')[1],
      ${serviceGroupCaseSql(SERVICE_CODE)},
      product_product_family,
      COALESCE(product_region_code, 'global'),
      line_item_availability_zone,
      line_item_resource_id,
      line_item_line_item_type,
      ${chargeCategoryCaseSql("line_item_line_item_type")},
      line_item_usage_type,
      line_item_operation,
      line_item_line_item_description,
      CAST(line_item_usage_amount AS DECIMAL(24, 8)),
      CAST(line_item_unblended_cost AS DECIMAL(24, 8)),
      COALESCE(pricing_unit, product_pricing_unit),
      line_item_currency_code,
      COALESCE(
        element_at(resource_tags, 'environment')[1],
        element_at(resource_tags, 'env')[1],
        element_at(resource_tags, 'Environment')[1],
        'untagged'
      ),
      COALESCE(
        element_at(resource_tags, 'team')[1],
        element_at(resource_tags, 'Team')[1],
        element_at(resource_tags, 'owner')[1],
        'untagged'
      ),
      CASE WHEN cardinality(resource_tags) > 0
           THEN CAST(to_json(resource_tags) AS VARCHAR) ELSE NULL END,
      '${runId}'
    FROM ${src};
  `;
}

/** Distinct billing months present in the source (drives the idempotent replace). */
export function billingMonthsSql(src: string): string {
  return `SELECT DISTINCT ${BILLING_MONTH} AS m FROM ${src} ORDER BY 1;`;
}
