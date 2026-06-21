/**
 * Canonical enrichment lookups, kept in TS and serialized into the load SQL.
 * Extend these as new services/charge types appear — unknown values fall back to
 * `other`, so they never break ingestion.
 */

/** AWS service code → coarse service group (for "compute vs storage vs database"). */
export const SERVICE_GROUPS: Record<string, string> = {
  // compute
  AmazonEC2: "compute",
  AmazonLightsail: "compute",
  AmazonECS: "compute",
  AmazonEKS: "compute",
  AWSLambda: "compute",
  AWSAmplify: "compute",
  AWSFargate: "compute",
  // storage
  AmazonS3: "storage",
  AmazonECR: "storage",
  AmazonEBS: "storage",
  AmazonEFS: "storage",
  AWSBackup: "storage",
  // database
  AmazonRDS: "database",
  AmazonDynamoDB: "database",
  AmazonElastiCache: "database",
  AmazonRedshift: "database",
  // network
  AmazonVPC: "network",
  AWSELB: "network",
  AmazonRoute53: "network",
  AmazonCloudFront: "network",
  AWSDataTransfer: "network",
  AmazonApiGateway: "network",
  // analytics
  AWSGlue: "analytics",
  AmazonAthena: "analytics",
  AmazonQuickSight: "analytics",
  AmazonKinesis: "analytics",
  // ml
  AmazonSageMaker: "ml",
  AmazonBedrock: "ml",
  // security
  AWSSecretsManager: "security",
  awskms: "security",
  AWSKMS: "security",
  AmazonGuardDuty: "security",
  AWSSecurityHub: "security",
  // management / observability
  AmazonCloudWatch: "management",
  AWSCloudFormation: "management",
  AWSCostExplorer: "management",
  AWSEvents: "management",
  AWSConfig: "management",
  AWSSystemsManager: "management",
  // commitments
  ComputeSavingsPlans: "savings_plan",
  // messaging / other
  AmazonSNS: "other",
  AWSQueueService: "other",
};

function sqlLit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Build a SQL `CASE` that maps a service-code expression to its service group. */
export function serviceGroupCaseSql(codeExpr: string): string {
  const whens = Object.entries(SERVICE_GROUPS)
    .map(([code, group]) => `      WHEN ${sqlLit(code)} THEN ${sqlLit(group)}`)
    .join("\n");
  return `CASE ${codeExpr}\n${whens}\n      ELSE 'other'\n    END`;
}

/** Build a SQL `CASE` that maps the CUR line_item_type to a coarse charge category. */
export function chargeCategoryCaseSql(typeExpr: string): string {
  return `CASE
      WHEN ${typeExpr} IN ('Usage', 'DiscountedUsage') THEN 'usage'
      WHEN ${typeExpr} LIKE 'SavingsPlan%' THEN 'savings_plan'
      WHEN ${typeExpr} = 'Tax' THEN 'tax'
      WHEN ${typeExpr} = 'Credit' THEN 'credit'
      WHEN ${typeExpr} = 'Refund' THEN 'refund'
      WHEN ${typeExpr} = 'Fee' THEN 'fee'
      ELSE 'other'
    END`;
}
