"use client";

import type { TooltipContentProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  buildMetricComparisonData,
  buildMetricSparklineData,
  buildObservedMetricData,
  type MetricComparisonDatum,
  type MetricObservedDatum,
  type MetricSparklineDatum,
} from "./metric-sparkline-data";
import type {
  MetricHistorySeries,
  ReportMetric,
} from "@/lib/server/reports/types";

type MetricVisualProps =
  | { variant: "comparison"; metric: ReportMetric; metricLabel: string }
  | { variant: "history"; metricLabel: string; series: MetricHistorySeries }
  | { variant: "sparkline"; metricLabel: string; series: MetricHistorySeries }
  | { variant: "observed-history"; metric: ReportMetric; metricLabel: string }
  | { variant: "observed-sparkline"; metric: ReportMetric; metricLabel: string };

const observationClassificationLabels = {
  evidence: "Evidência",
  inference: "Inferência",
  hypothesis: "Hipótese",
  rule: "Regra",
} as const;

/*
 * Chart map: source observations use a 12-period line plus compact card
 * sparklines; base × target uses a same-unit bar comparison; approval history
 * uses its own line and never fills missing snapshots. All three keep an exact
 * textual or tabular equivalent next to the visual.
 */

function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return formatted.replace(" de ", " ");
}

function formatDatumValue(
  datum: Pick<MetricSparklineDatum, "baseline">,
  unit: string,
): string {
  return unit && /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(datum.baseline.trim())
    ? `${datum.baseline} ${unit}`
    : datum.baseline;
}

function formatComparisonValue(
  datum: Pick<MetricComparisonDatum, "displayValue">,
  unit: string,
): string {
  return unit && /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(datum.displayValue.trim())
    ? `${datum.displayValue} ${unit}`
    : datum.displayValue;
}

function formatObservedValue(
  datum: Pick<MetricObservedDatum, "displayValue" | "value">,
  unit: string,
): string {
  const display = datum.displayValue.trim();
  if (!display) {
    const numeric = new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
    }).format(datum.value);
    return unit ? `${numeric} ${unit}` : numeric;
  }
  if (!unit || !/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(display)) {
    return display;
  }
  return `${display} ${unit}`;
}

function SparklineTooltip({
  active,
  payload,
  unit,
}: TooltipContentProps & { unit: string }) {
  const datum = payload?.[0]?.payload as MetricSparklineDatum | undefined;
  if (!active || !datum) return null;
  return (
    <div
      className="metric-chart-tooltip metric-sparkline-tooltip"
      role="tooltip"
    >
      <span>{formatPeriod(datum.period)}</span>
      <strong>{formatDatumValue(datum, unit)}</strong>
    </div>
  );
}

function ComparisonTooltip({
  active,
  payload,
  unit,
}: TooltipContentProps & { unit: string }) {
  const datum = payload?.[0]?.payload as MetricComparisonDatum | undefined;
  if (!active || !datum) return null;
  return (
    <div className="metric-chart-tooltip" role="tooltip">
      <span>{datum.label}</span>
      <strong>{formatComparisonValue(datum, unit)}</strong>
    </div>
  );
}

function ObservedTooltip({
  active,
  payload,
  unit,
}: TooltipContentProps & { unit: string }) {
  const datum = payload?.[0]?.payload as MetricObservedDatum | undefined;
  if (!active || !datum) return null;
  return (
    <div
      className="metric-chart-tooltip observed-chart-tooltip"
      role="tooltip"
    >
      <span>{formatPeriod(datum.period)}</span>
      <strong>{formatObservedValue(datum, unit)}</strong>
      <small>{datum.sourceIds.join(" + ")}</small>
    </div>
  );
}

function MetricComparisonChart({
  metric,
  metricLabel,
}: {
  metric: ReportMetric;
  metricLabel: string;
}) {
  const data = buildMetricComparisonData(metric);
  if (data.length !== 2) return null;
  const summary = `Comparação de ${metricLabel}: base observada ${formatComparisonValue(data[0], metric.unit)}; meta de teste ${formatComparisonValue(data[1], metric.unit)}.`;

  return (
    <figure
      className="metric-comparison-chart"
      data-testid="metric-comparison-chart"
      aria-labelledby="metric-comparison-title"
    >
      <figcaption>
        <span>Comparação do indicador selecionado</span>
        <strong id="metric-comparison-title">Base observada × meta de teste</strong>
        <small>{summary}</small>
      </figcaption>
      <div className="metric-comparison-canvas" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer
            data={data}
            desc={summary}
            margin={{ top: 24, right: 10, bottom: 2, left: 0 }}
            role="img"
            title={`Base e meta de ${metricLabel}`}
          >
            <CartesianGrid
              stroke="rgba(255, 249, 236, 0.14)"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: "#d6d0c6", fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "#aba59b", fontSize: 11 }}
              tickLine={false}
              width={34}
            />
            <Tooltip
              animationDuration={0}
              content={(props) => (
                <ComparisonTooltip {...props} unit={metric.unit} />
              )}
              cursor={{ fill: "rgba(255, 249, 236, 0.07)" }}
              isAnimationActive={false}
            />
            <Bar
              dataKey="value"
              fill="#c47a4c"
              isAnimationActive={false}
              name={metricLabel}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="displayValue"
                fill="#fff9ec"
                fontSize={12}
                position="top"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <dl
        className="metric-comparison-values"
        aria-label="Valores exatos da comparação"
      >
        {data.map((datum) => (
          <div key={datum.key}>
            <dt>{datum.label}</dt>
            <dd>{formatComparisonValue(datum, metric.unit)}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

function targetComparatorText(metric: ReportMetric): string {
  if (metric.targetComparator === "lte") return "até";
  if (metric.targetComparator === "gte") return "a partir de";
  if (metric.targetComparator === "eq") return "igual a";
  return "referência";
}

function formatTargetReference(
  metric: ReportMetric,
  target: MetricComparisonDatum,
): string {
  const display = formatComparisonValue(target, metric.unit);
  return /^(?:até|a partir de|igual a)\b/i.test(display)
    ? display
    : `${targetComparatorText(metric)} ${display}`;
}

function MetricObservedHistoryChart({
  metric,
  metricLabel,
}: {
  metric: ReportMetric;
  metricLabel: string;
}) {
  const data = buildObservedMetricData(metric);
  if (data.length < 2) return null;

  const first = data[0];
  const latest = data[data.length - 1];
  const comparison = buildMetricComparisonData(metric);
  const target = comparison.find((datum) => datum.key === "target") ?? null;
  const summaryId = `observed-chart-summary-${metric.id}`;
  const summary = `Série observada nas fontes com ${data.length} períodos, de ${formatPeriod(first.period)}, ${formatObservedValue(first, metric.unit)}, a ${formatPeriod(latest.period)}, ${formatObservedValue(latest, metric.unit)}${target ? `; meta de teste ${formatComparisonValue(target, metric.unit)}` : ""}.`;

  return (
    <figure
      className="observed-history-chart"
      data-testid="observed-history-chart"
      aria-labelledby={`observed-history-title-${metric.id}`}
    >
      <figcaption>
        <span>Série observada nas fontes</span>
        <strong id={`observed-history-title-${metric.id}`}>
          {metricLabel} · {data.length} meses
        </strong>
        <small id={summaryId}>{summary}</small>
      </figcaption>
      <div
        className="observed-history-canvas"
        aria-describedby={summaryId}
        aria-label={`Gráfico de linha de ${metricLabel}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer
            data={data}
            desc={summary}
            margin={{ top: 22, right: 18, bottom: 4, left: -4 }}
            role="img"
            title={`Série observada de ${metricLabel}`}
          >
            <CartesianGrid
              stroke="rgba(255, 249, 236, 0.14)"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="period"
              minTickGap={28}
              tick={{ fill: "#d6d0c6", fontSize: 11 }}
              tickFormatter={formatPeriod}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={["auto", "auto"]}
              tick={{ fill: "#aba59b", fontSize: 11 }}
              tickLine={false}
              width={46}
            />
            <Tooltip
              animationDuration={0}
              content={(props) => (
                <ObservedTooltip {...props} unit={metric.unit} />
              )}
              cursor={{
                stroke: "rgba(255, 249, 236, 0.34)",
                strokeWidth: 1,
              }}
              isAnimationActive={false}
            />
            {target ? (
              <ReferenceLine
                ifOverflow="extendDomain"
                stroke="#d6d0c6"
                strokeDasharray="6 5"
                strokeWidth={1.5}
                y={target.value}
              />
            ) : null}
            <Line
              activeDot={{
                fill: "#fff9ec",
                r: 5,
                stroke: "#c47a4c",
                strokeWidth: 2,
              }}
              dataKey="value"
              dot={{
                fill: "#22231f",
                r: 3,
                stroke: "#c47a4c",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
              name={metricLabel}
              stroke="#c47a4c"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              type="linear"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="observed-chart-key" aria-label="Legenda do gráfico">
        <span data-key="observed">Série observada</span>
        {target ? (
          <span data-key="target">
            Meta {formatTargetReference(metric, target)}
          </span>
        ) : null}
      </div>
      <details className="observed-data-table">
        <summary>Ver os {data.length} valores e suas fontes</summary>
        <div className="observed-data-table-scroll">
          <table>
            <caption>Valores mensais de {metricLabel}</caption>
            <thead>
              <tr>
                <th scope="col">Período</th>
                <th scope="col">Valor observado</th>
                <th scope="col">Classificação</th>
                <th scope="col">Fontes</th>
              </tr>
            </thead>
            <tbody>
              {data.map((datum) => (
                <tr key={datum.period}>
                  <th scope="row">{formatPeriod(datum.period)}</th>
                  <td>{formatObservedValue(datum, metric.unit)}</td>
                  <td>{observationClassificationLabels[datum.classification]}</td>
                  <td>{datum.sourceIds.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

function MetricObservedSparkline({
  metric,
  metricLabel,
}: {
  metric: ReportMetric;
  metricLabel: string;
}) {
  const data = buildObservedMetricData(metric);
  if (data.length < 2) return null;

  const first = data[0];
  const latest = data[data.length - 1];
  const summary = `${data.length} meses observados: ${formatPeriod(first.period)}, ${formatObservedValue(first, metric.unit)}; ${formatPeriod(latest.period)}, ${formatObservedValue(latest, metric.unit)}.`;

  return (
    <figure
      className="observed-sparkline"
      data-testid="observed-sparkline"
    >
      <div
        className="observed-sparkline-chart"
        aria-label={`Minigráfico de ${metricLabel}. ${summary}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer
            data={data}
            desc={summary}
            margin={{ top: 6, right: 4, bottom: 6, left: 4 }}
            role="img"
            title={`Série observada compacta de ${metricLabel}`}
          >
            <XAxis dataKey="period" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              animationDuration={0}
              content={(props) => (
                <ObservedTooltip {...props} unit={metric.unit} />
              )}
              cursor={{ stroke: "rgba(32, 33, 30, 0.34)", strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Line
              activeDot={{
                fill: "#fff9ec",
                r: 4,
                stroke: "#9a5532",
                strokeWidth: 2,
              }}
              dataKey="value"
              dot={false}
              isAnimationActive={false}
              name={metricLabel}
              stroke="#9a5532"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.25}
              type="linear"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

function MetricHistoryChart({
  metricLabel,
  series,
}: {
  metricLabel: string;
  series: MetricHistorySeries;
}) {
  const data = buildMetricSparklineData(series);
  if (data.length < 2) return null;
  const first = data[0];
  const latest = data[data.length - 1];
  const summary = `${data.length} períodos aprovados: ${formatPeriod(first.period)}, ${formatDatumValue(first, series.unit)}; ${formatPeriod(latest.period)}, ${formatDatumValue(latest, series.unit)}.`;

  return (
    <figure
      className="metric-history-chart"
      data-testid="metric-history-chart"
      aria-labelledby="metric-history-chart-title"
    >
      <figcaption>
        <span>Histórico de aprovações</span>
        <strong id="metric-history-chart-title">
          Versões realmente aprovadas
        </strong>
        <small>{summary} Esta série não completa períodos ausentes.</small>
      </figcaption>
      <div className="metric-history-canvas" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer
            data={data}
            desc={summary}
            margin={{ top: 16, right: 18, bottom: 0, left: -4 }}
            role="img"
            title={`Histórico de ${metricLabel}`}
          >
            <CartesianGrid
              stroke="rgba(255, 249, 236, 0.14)"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="period"
              tick={{ fill: "#d6d0c6", fontSize: 11 }}
              tickFormatter={formatPeriod}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "#aba59b", fontSize: 11 }}
              tickLine={false}
              width={42}
            />
            <Tooltip
              animationDuration={0}
              content={(props) => (
                <SparklineTooltip {...props} unit={series.unit} />
              )}
              cursor={{
                stroke: "rgba(255, 249, 236, 0.34)",
                strokeWidth: 1,
              }}
              isAnimationActive={false}
            />
            <Line
              activeDot={{
                fill: "#fff9ec",
                r: 5,
                stroke: "#c47a4c",
                strokeWidth: 2,
              }}
              dataKey="value"
              dot={{
                fill: "#22231f",
                r: 3,
                stroke: "#c47a4c",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
              name={metricLabel}
              stroke="#c47a4c"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              type="linear"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function MetricSparkline({
  metricLabel,
  series,
}: {
  metricLabel: string;
  series: MetricHistorySeries;
}) {
  const data = buildMetricSparklineData(series);
  if (data.length < 2) return null;
  const first = data[0];
  const latest = data[data.length - 1];
  const summary = `${data.length} períodos aprovados: ${formatPeriod(first.period)}, ${formatDatumValue(first, series.unit)}; ${formatPeriod(latest.period)}, ${formatDatumValue(latest, series.unit)}.`;

  return (
    <figure className="metric-sparkline" data-testid="metric-sparkline">
      <div className="metric-sparkline-chart" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer
            data={data}
            desc={summary}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            role="img"
            title={`Histórico compacto de ${metricLabel}`}
          >
            <XAxis dataKey="period" hide />
            <YAxis domain={["auto", "auto"]} hide />
            <Tooltip
              animationDuration={0}
              content={(props) => (
                <SparklineTooltip {...props} unit={series.unit} />
              )}
              cursor={{
                stroke: "rgba(255, 249, 236, 0.34)",
                strokeWidth: 1,
              }}
              isAnimationActive={false}
            />
            <Line
              activeDot={{
                fill: "#fff9ec",
                r: 5,
                stroke: "#c47a4c",
                strokeWidth: 2,
              }}
              dataKey="value"
              dot={{
                fill: "#22231f",
                r: 3,
                stroke: "#c47a4c",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
              name={metricLabel}
              stroke="#c47a4c"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              type="linear"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <span>Leitura visual complementar</span>
        <strong>{summary}</strong>
      </figcaption>
    </figure>
  );
}

export default function MetricVisual(props: MetricVisualProps) {
  if (props.variant === "comparison") {
    return (
      <MetricComparisonChart
        metric={props.metric}
        metricLabel={props.metricLabel}
      />
    );
  }
  if (props.variant === "observed-history") {
    return (
      <MetricObservedHistoryChart
        metric={props.metric}
        metricLabel={props.metricLabel}
      />
    );
  }
  if (props.variant === "observed-sparkline") {
    return (
      <MetricObservedSparkline
        metric={props.metric}
        metricLabel={props.metricLabel}
      />
    );
  }
  if (props.variant === "history") {
    return (
      <MetricHistoryChart
        metricLabel={props.metricLabel}
        series={props.series}
      />
    );
  }
  return (
    <MetricSparkline
      metricLabel={props.metricLabel}
      series={props.series}
    />
  );
}
