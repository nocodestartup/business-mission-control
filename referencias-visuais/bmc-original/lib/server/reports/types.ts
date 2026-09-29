export const REPORT_SCHEMA_VERSION = "2.0" as const;
export const LEGACY_REPORT_SCHEMA_VERSION = "1.0" as const;

export type ReportSchemaVersion =
  | typeof REPORT_SCHEMA_VERSION
  | typeof LEGACY_REPORT_SCHEMA_VERSION;

export type ReportClassification =
  | "evidence"
  | "inference"
  | "hypothesis"
  | "rule";

export type MarkdownCitation = {
  sourceId: string;
  locator: {
    type: "markdown";
    startLine: number;
    endLine: number;
    section: string | null;
  };
};

export type XlsxCitation = {
  sourceId: string;
  locator: {
    type: "xlsx";
    sheetName: string;
    startRow: number;
    endRow: number;
  };
};

export type ReportCitation = MarkdownCitation | XlsxCitation;

export type ReportCompany = {
  name: string;
  period: string;
};

export type ExecutiveSummary = {
  headline: string;
  recommendation: string;
  rationale: string;
  nextAction: string;
  sourceIds: string[];
  citations: ReportCitation[];
};

export type ReportBottleneck = {
  id: string;
  title: string;
  description: string;
  classification: ReportClassification;
  hypothesis: string | null;
  nextAction: string | null;
  sourceIds: string[];
  citations: ReportCitation[];
};

export type ModelReportOpportunity = {
  id: string;
  title: string;
  description: string;
  decision: string;
  classification: ReportClassification;
  hypothesis: string | null;
  nextAction: string;
  impact: number;
  effort: number;
  risk: number;
  speed: number;
  bottleneckIds: string[];
  sourceIds: string[];
  citations: ReportCitation[];
};

export type ReportOpportunity = ModelReportOpportunity & {
  score: number;
};

export type ReportPlanItem = {
  id: string;
  phase: string;
  window: string;
  action: string;
  expectedOutcome: string;
  classification: ReportClassification;
  sourceIds: string[];
  citations: ReportCitation[];
};

export type ReportTargetComparator = "lte" | "gte" | "eq";

export type ModelReportMetric = {
  id: string;
  metricKey: string;
  label: string;
  baseline: string;
  baselineValue: number | null;
  target: string;
  targetValue: number | null;
  targetComparator: ReportTargetComparator | null;
  unit: string;
  classification: ReportClassification;
  sourceIds: string[];
  citations: ReportCitation[];
};

export type ReportMetricObservation = {
  period: string;
  value: number;
  displayValue: string;
  classification: ReportClassification;
  sourceIds: string[];
  citations: ReportCitation[];
};

export type ReportMetric = ModelReportMetric & {
  observations: ReportMetricObservation[];
};

export type MetricHistoryPoint = {
  reportId: string;
  period: string;
  approvedAt: string;
  baseline: string;
  numericValue: number | null;
  classification: ReportClassification;
};

export type MetricHistorySeries = {
  metricId: string;
  metricKey: string;
  label: string;
  unit: string;
  points: MetricHistoryPoint[];
  matchedApprovedReports: number;
  incompatibleApprovedReports: number;
  ambiguousApprovedReports: number;
  supersededPoints: number;
};

export type MetricHistoryResponse = {
  reportId: string;
  approvedReportsConsidered: number;
  invalidApprovedReports: number;
  series: MetricHistorySeries[];
};

export type ReportLimitation = {
  id: string;
  description: string;
  validationQuestion: string;
  sourceIds: string[];
  citations: ReportCitation[];
};

type ReportPayloadBase<SchemaVersion, Opportunity, Metric> = {
  schemaVersion: SchemaVersion;
  company: ReportCompany;
  executiveSummary: ExecutiveSummary;
  bottlenecks: ReportBottleneck[];
  opportunities: Opportunity[];
  plan: ReportPlanItem[];
  metrics: Metric[];
  limitations: ReportLimitation[];
};

export type ModelReportPayload = ReportPayloadBase<
  typeof REPORT_SCHEMA_VERSION,
  ModelReportOpportunity,
  ModelReportMetric
>;

export type ReportPayload = ReportPayloadBase<
  ReportSchemaVersion,
  ReportOpportunity,
  ReportMetric
>;

export type ReportSourceSnapshot = {
  sourceId: string;
  fileId?: string;
  fileName?: string;
  sha256?: string;
  locatorIndex?:
    | {
        type: "markdown";
        lineCount: number;
        sections?: readonly string[];
      }
    | {
        type: "xlsx";
        sheets: readonly {
          name: string;
          rowCount: number;
        }[];
      };
};

export const REPORT_STATUSES = [
  "generating",
  "draft",
  "approved",
  "archived",
  "failed",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ResponsesUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type GeneratedReport = {
  payload: ReportPayload;
  responseId: string | null;
  model: string;
  usage: ResponsesUsage;
};
