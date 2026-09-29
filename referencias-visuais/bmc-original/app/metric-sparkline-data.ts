import type {
  MetricHistoryPoint,
  MetricHistorySeries,
  ReportMetric,
  ReportMetricObservation,
} from "@/lib/server/reports/types";

export type MetricSparklineDatum = {
  reportId: string;
  period: string;
  approvedAt: string;
  baseline: string;
  value: number;
};

export type MetricComparisonDatum = {
  key: "baseline" | "target";
  label: "Base observada" | "Meta de teste";
  displayValue: string;
  value: number;
};

export type MetricObservedDatum = Pick<
  ReportMetricObservation,
  "period" | "value" | "displayValue" | "classification" | "sourceIds"
>;

export type MetricObservedDelta = {
  value: number;
  displayValue: string;
  direction: "up" | "down" | "flat";
  label: string;
  periodCount: number;
};

const STRICT_NUMERIC_VALUE = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/;

/**
 * Report metrics are stored as strings so factual and qualitative values retain
 * their original meaning. Charts must opt in only when the full value is a
 * finite decimal number; values such as "até 20" and "3h48" stay textual.
 */
export function parseStrictMetricNumber(value: string): number | null {
  const normalized = value.trim();
  if (!STRICT_NUMERIC_VALUE.test(normalized)) return null;

  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildMetricComparisonData(
  metric:
    | (Pick<ReportMetric, "baseline" | "target"> &
        Partial<Pick<ReportMetric, "baselineValue" | "targetValue">>)
    | null
    | undefined,
): MetricComparisonDatum[] {
  if (!metric) return [];

  const baseline = Number.isFinite(metric.baselineValue)
    ? (metric.baselineValue as number)
    : parseStrictMetricNumber(metric.baseline);
  const target = Number.isFinite(metric.targetValue)
    ? (metric.targetValue as number)
    : parseStrictMetricNumber(metric.target);
  if (baseline === null || target === null) return [];

  return [
    {
      key: "baseline",
      label: "Base observada",
      displayValue: metric.baseline,
      value: baseline,
    },
    {
      key: "target",
      label: "Meta de teste",
      displayValue: metric.target,
      value: target,
    },
  ];
}

export function canRenderMetricComparison(
  metric:
    | (Pick<ReportMetric, "baseline" | "target"> &
        Partial<Pick<ReportMetric, "baselineValue" | "targetValue">>)
    | null
    | undefined,
): boolean {
  return buildMetricComparisonData(metric).length === 2;
}

export function buildObservedMetricData(
  metric: Pick<ReportMetric, "observations"> | null | undefined,
): MetricObservedDatum[] {
  if (!metric) return [];

  return metric.observations
    .filter(
      (observation) =>
        /^\d{4}-(?:0[1-9]|1[0-2])$/.test(observation.period) &&
        Number.isFinite(observation.value),
    )
    .map((observation) => ({
      period: observation.period,
      value: observation.value,
      displayValue: observation.displayValue,
      classification: observation.classification,
      sourceIds: observation.sourceIds,
    }))
    .sort((left, right) => left.period.localeCompare(right.period));
}

export function canRenderObservedMetricTrend(
  metric: Pick<ReportMetric, "observations"> | null | undefined,
): boolean {
  return buildObservedMetricData(metric).length >= 2;
}

function formatSignedValue(value: number): string {
  if (Object.is(value, -0) || value === 0) return "0";
  const absolute = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${value > 0 ? "+" : "−"}${absolute}`;
}

export function buildObservedMetricDelta(
  metric:
    | Pick<ReportMetric, "observations" | "unit">
    | null
    | undefined,
): MetricObservedDelta | null {
  const data = buildObservedMetricData(metric);
  if (data.length < 2) return null;

  const value = data[data.length - 1].value - data[0].value;
  return {
    value,
    displayValue: `${formatSignedValue(value)}${metric?.unit ? ` ${metric.unit}` : ""}`,
    direction: value === 0 ? "flat" : value > 0 ? "up" : "down",
    label:
      data.length === 12
        ? "Variação em 12 meses"
        : `Variação em ${data.length} períodos`,
    periodCount: data.length,
  };
}

export function isCompatibleMetricHistory(
  metric:
    | Pick<ReportMetric, "metricKey" | "label" | "unit">
    | null
    | undefined,
  series: MetricHistorySeries | null | undefined,
): series is MetricHistorySeries {
  if (!metric || !series || metric.unit !== series.unit) return false;

  const usesLegacyFallback =
    metric.metricKey.startsWith("legacy_") ||
    series.metricKey.startsWith("legacy_");
  return usesLegacyFallback
    ? metric.label === series.label
    : metric.metricKey === series.metricKey;
}

function isNewerPoint(
  candidate: MetricHistoryPoint,
  current: MetricHistoryPoint,
): boolean {
  return (
    candidate.approvedAt.localeCompare(current.approvedAt) > 0 ||
    (candidate.approvedAt === current.approvedAt &&
      candidate.reportId.localeCompare(current.reportId) > 0)
  );
}

export function buildMetricSparklineData(
  series: MetricHistorySeries | null | undefined,
): MetricSparklineDatum[] {
  if (!series) return [];

  const pointsByPeriod = new Map<string, MetricHistoryPoint>();
  for (const point of series.points) {
    if (point.numericValue === null || !Number.isFinite(point.numericValue)) {
      continue;
    }
    const current = pointsByPeriod.get(point.period);
    if (!current || isNewerPoint(point, current)) {
      pointsByPeriod.set(point.period, point);
    }
  }

  return [...pointsByPeriod.values()]
    .sort(
      (left, right) =>
        left.period.localeCompare(right.period) ||
        left.approvedAt.localeCompare(right.approvedAt) ||
        left.reportId.localeCompare(right.reportId),
    )
    .map((point) => ({
      reportId: point.reportId,
      period: point.period,
      approvedAt: point.approvedAt,
      baseline: point.baseline,
      value: point.numericValue as number,
    }));
}

export function canRenderMetricSparkline(
  series: MetricHistorySeries | null | undefined,
): boolean {
  return buildMetricSparklineData(series).length >= 2;
}
