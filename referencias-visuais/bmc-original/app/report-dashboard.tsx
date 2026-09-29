"use client";

import {
  type CSSProperties,
  lazy,
  Suspense,
  useMemo,
  useState,
} from "react";

import {
  buildObservedMetricDelta,
  canRenderMetricComparison,
  canRenderMetricSparkline,
  canRenderObservedMetricTrend,
  isCompatibleMetricHistory,
} from "./metric-sparkline-data";

import type {
  MetricHistoryResponse,
  ReportCitation,
  ReportClassification,
  ReportPayload,
  ReportStatus,
} from "@/lib/server/reports/types";

export type DashboardSource = {
  sourceId: string;
  fileId: string;
  fileName: string;
  extension: string;
  sha256: string;
  locators?: string[];
};

export type ReportDashboardProps = {
  report: ReportPayload;
  sources: DashboardSource[];
  status: ReportStatus;
  metricHistory?: MetricHistoryResponse | null;
};

type OpportunityFilter = "all" | ReportClassification;
type MetricFilter = "all" | ReportClassification;
type MetricSort = "report" | "label" | "classification";

type TraceEntry = {
  label: string;
  classification: ReportClassification | null;
  sourceIds: readonly string[];
  citations: readonly ReportCitation[];
};

const MetricVisual = lazy(() => import("./metric-sparkline"));

const classificationLabels: Record<ReportClassification, string> = {
  evidence: "Evidência",
  inference: "Inferência",
  hypothesis: "Hipótese",
  rule: "Regra",
};

const classificationDescriptions: Record<ReportClassification, string> = {
  evidence: "Valor declarado diretamente nas fontes analisadas.",
  inference: "Leitura calculada ou combinada a partir das fontes.",
  hypothesis: "Suposição que ainda precisa de validação operacional.",
  rule: "Limite que deve ser respeitado durante a execução.",
};

const classificationOrder: Record<ReportClassification, number> = {
  evidence: 0,
  inference: 1,
  hypothesis: 2,
  rule: 3,
};

const statusLabels: Record<ReportStatus, string> = {
  generating: "Em geração",
  draft: "Rascunho em revisão",
  approved: "Aprovado",
  archived: "Arquivado",
  failed: "Falha de geração",
};

const collisionOffsets = [
  { x: 0, y: 0 },
  { x: -5, y: 6 },
  { x: 6, y: -5 },
  { x: -7, y: -6 },
  { x: 7, y: 7 },
] as const;

const canonicalFileLabels: Readonly<Record<string, string>> = {
  "01-briefing_da_empresa.md": "01 · Contexto da empresa",
  "02-atendimento_e_propostas_maio.xlsx":
    "02 · Atendimento e propostas — maio",
  "03-ordens_de_servico_maio.xlsx": "03 · Ordens de serviço — maio",
  "04-feedbacks_e_rotina_maio.md":
    "04 · Retornos de clientes e rotina — maio",
};

const lowercaseFileLabelWords = new Set([
  "a",
  "as",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "o",
  "os",
  "para",
  "por",
]);

function levelClass(level: ReportClassification) {
  return classificationLabels[level]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function displayFileLabel(fileName: string) {
  const canonicalLabel = canonicalFileLabels[fileName.toLocaleLowerCase("pt-BR")];
  if (canonicalLabel) return canonicalLabel;

  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const normalized = word.toLocaleLowerCase("pt-BR");
      if (index > 0 && lowercaseFileLabelWords.has(normalized)) {
        return normalized;
      }
      return `${normalized.charAt(0).toLocaleUpperCase("pt-BR")}${normalized.slice(1)}`;
    })
    .join(" ");
}

function shortOpportunityTitle(title: string) {
  const words = title.trim().split(/\s+/);
  return words.length > 4 ? `${words.slice(0, 4).join(" ")}…` : title;
}

function formatCitation(citation: ReportCitation) {
  const locator = citation.locator;
  if (locator.type === "markdown") {
    const lines =
      locator.startLine === locator.endLine
        ? `linha ${locator.startLine}`
        : `linhas ${locator.startLine}–${locator.endLine}`;
    return locator.section ? `${locator.section}, ${lines}` : lines;
  }

  const rows =
    locator.startRow === locator.endRow
      ? `linha ${locator.startRow}`
      : `linhas ${locator.startRow}–${locator.endRow}`;
  return `${locator.sheetName}, ${rows}`;
}

function formatMetricValue(value: string, unit: string) {
  if (!unit || !/^[-+]?\d+(?:[.,]\d+)?$/.test(value.trim())) return value;
  return `${value} ${unit}`;
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function shareSourceIds(left: readonly string[], right: readonly string[]) {
  const rightIds = new Set(right);
  return left.some((sourceId) => rightIds.has(sourceId));
}

function ClassificationBadge({
  classification,
  tooltipId,
  focusable = true,
}: {
  classification: ReportClassification;
  tooltipId: string;
  focusable?: boolean;
}) {
  const content = (
    <>
      {classificationLabels[classification]}
      <span className="analytics-tooltip" id={tooltipId} role="tooltip">
        {classificationDescriptions[classification]}
      </span>
    </>
  );

  if (focusable) {
    return (
      <button
        className="classification-badge tooltip-anchor"
        data-level={levelClass(classification)}
        type="button"
        aria-describedby={tooltipId}
        aria-label={classificationLabels[classification]}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className="classification-badge tooltip-anchor"
      data-level={levelClass(classification)}
    >
      {content}
    </span>
  );
}

function collectTraceEntries(report: ReportPayload): TraceEntry[] {
  return [
    {
      label: "Resumo executivo",
      classification: null,
      sourceIds: report.executiveSummary.sourceIds,
      citations: report.executiveSummary.citations,
    },
    ...report.bottlenecks.map((item) => ({
      label: `${item.id} · ${item.title}`,
      classification: item.classification,
      sourceIds: item.sourceIds,
      citations: item.citations,
    })),
    ...report.opportunities.map((item) => ({
      label: `${item.id} · ${item.title}`,
      classification: item.classification,
      sourceIds: item.sourceIds,
      citations: item.citations,
    })),
    ...report.plan.map((item) => ({
      label: `${item.id} · ${item.phase}`,
      classification: item.classification,
      sourceIds: item.sourceIds,
      citations: item.citations,
    })),
    ...report.metrics.map((item) => ({
      label: `${item.id} · ${item.label}`,
      classification: item.classification,
      sourceIds: item.sourceIds,
      citations: item.citations,
    })),
    ...report.limitations.map((item) => ({
      label: `${item.id} · limitação`,
      classification: null,
      sourceIds: item.sourceIds,
      citations: item.citations,
    })),
  ];
}

function pointStyle(
  opportunity: ReportPayload["opportunities"][number],
  index: number,
  visibleOpportunities: ReportPayload["opportunities"]
) {
  const collisionIndex = visibleOpportunities
    .slice(0, index)
    .filter(
      (candidate) =>
        candidate.impact === opportunity.impact &&
        candidate.effort === opportunity.effort
    ).length;
  const offset = collisionOffsets[collisionIndex % collisionOffsets.length];
  return {
    "--point-x": `${10 + ((opportunity.effort - 1) / 4) * 80 + offset.x}%`,
    "--point-y": `${10 + ((5 - opportunity.impact) / 4) * 80 + offset.y}%`,
  } as CSSProperties;
}

export function ReportDashboard({
  report,
  sources,
  status,
  metricHistory = null,
}: ReportDashboardProps) {
  const [activeId, setActiveId] = useState(
    () => report.opportunities[0]?.id ?? ""
  );
  const [activeFilter, setActiveFilter] =
    useState<OpportunityFilter>("all");
  const [activeMetricId, setActiveMetricId] = useState(
    () =>
      report.metrics.find((metric) => canRenderObservedMetricTrend(metric))?.id ??
      report.metrics.find((metric) => canRenderMetricComparison(metric))?.id ??
      report.metrics[0]?.id ??
      ""
  );
  const [metricFilter, setMetricFilter] = useState<MetricFilter>("all");
  const [metricSort, setMetricSort] = useState<MetricSort>("report");

  const filters = useMemo<OpportunityFilter[]>(
    () => [
      "all",
      ...Array.from(
        new Set(report.opportunities.map(({ classification }) => classification))
      ),
    ],
    [report.opportunities]
  );
  const effectiveFilter = filters.includes(activeFilter) ? activeFilter : "all";
  const visibleOpportunities = useMemo(
    () =>
      report.opportunities.filter(
        (item) =>
          effectiveFilter === "all" ||
          item.classification === effectiveFilter
      ),
    [effectiveFilter, report.opportunities]
  );
  const active =
    visibleOpportunities.find((item) => item.id === activeId) ??
    visibleOpportunities[0] ??
    report.opportunities[0] ??
    null;
  const activeSourceIds = active?.sourceIds ?? [];
  const activePhases = active
    ? report.plan
        .filter((phase) => shareSourceIds(phase.sourceIds, active.sourceIds))
        .map((phase) => `${phase.id} ${phase.phase}`)
        .join(", ")
    : "";
  const metricFilters = useMemo<MetricFilter[]>(
    () => [
      "all",
      ...Array.from(
        new Set(report.metrics.map(({ classification }) => classification))
      ),
    ],
    [report.metrics]
  );
  const effectiveMetricFilter = metricFilters.includes(metricFilter)
    ? metricFilter
    : "all";
  const visibleMetrics = useMemo(() => {
    const reportOrder = new Map(
      report.metrics.map((metric, index) => [metric.id, index])
    );
    const filtered = report.metrics.filter(
      (metric) =>
        effectiveMetricFilter === "all" ||
        metric.classification === effectiveMetricFilter
    );
    return [...filtered].sort((left, right) => {
      if (metricSort === "label") {
        return left.label.localeCompare(right.label, "pt-BR");
      }
      if (metricSort === "classification") {
        return (
          classificationOrder[left.classification] -
            classificationOrder[right.classification] ||
          left.label.localeCompare(right.label, "pt-BR")
        );
      }
      return (reportOrder.get(left.id) ?? 0) - (reportOrder.get(right.id) ?? 0);
    });
  }, [effectiveMetricFilter, metricSort, report.metrics]);
  const activeMetric =
    report.metrics.find((metric) => metric.id === activeMetricId) ??
    visibleMetrics[0] ??
    report.metrics[0] ??
    null;
  const metricHistoryCandidate = activeMetric
    ? (metricHistory?.series.find((series) =>
        isCompatibleMetricHistory(activeMetric, series),
      ) ?? null)
    : null;
  const activeMetricHistory = isCompatibleMetricHistory(
    activeMetric,
    metricHistoryCandidate,
  )
    ? metricHistoryCandidate
    : null;
  const hasComparableMetric = activeMetric
    ? canRenderMetricComparison(activeMetric)
    : false;
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const activeMetricTrace = activeMetric
    ? activeMetric.sourceIds.map((sourceId) => ({
        sourceId,
        source: sourceById.get(sourceId) ?? null,
        citations: activeMetric.citations.filter(
          (citation) => citation.sourceId === sourceId,
        ),
      }))
    : [];
  const summaryFacts = useMemo(() => {
    const withObservedSeries = report.metrics.filter((metric) =>
      canRenderObservedMetricTrend(metric),
    );
    return [
      ...withObservedSeries,
      ...report.metrics.filter(
        (metric) =>
          !withObservedSeries.some((candidate) => candidate.id === metric.id),
      ),
    ].slice(0, 4);
  }, [report.metrics]);
  const ruleMetric = report.metrics.find(
    ({ classification }) => classification === "rule"
  );
  const traceEntries = useMemo(() => collectTraceEntries(report), [report]);

  function chooseFilter(filter: OpportunityFilter) {
    setActiveFilter(filter);
    const firstMatch = report.opportunities.find(
      (item) => filter === "all" || item.classification === filter
    );
    if (firstMatch) setActiveId(firstMatch.id);
  }

  function chooseMetricFilter(filter: MetricFilter) {
    setMetricFilter(filter);
    const firstMatch = report.metrics.find(
      (metric) => filter === "all" || metric.classification === filter
    );
    if (firstMatch) setActiveMetricId(firstMatch.id);
  }

  return (
    <main className="mission-shell">
      <header className="mission-rail">
        <a
          className="brand-lockup"
          href="#visao"
          aria-label="Business Mission Control — início"
        >
          <span className="brand-mark" aria-hidden="true">
            N
          </span>
          <span>Business Mission Control</span>
        </a>
        <nav aria-label="Seções principais">
          <a href="#visao">Visão</a>
          <a href="#gargalos">Gargalos</a>
          <a href="#oportunidades">Oportunidades</a>
          <a href="#evidencias">Evidências</a>
          <a href="#plano">Plano</a>
        </nav>
        <span className="access-status">
          <span aria-hidden="true" />
          {statusLabels[status]}
        </span>
        <details className="mobile-menu">
          <summary>Seções</summary>
          <nav aria-label="Seções no celular">
            <a
              href="#visao"
              onClick={(event) =>
                event.currentTarget
                  .closest("details")
                  ?.removeAttribute("open")
              }
            >
              Visão
            </a>
            <a
              href="#gargalos"
              onClick={(event) =>
                event.currentTarget
                  .closest("details")
                  ?.removeAttribute("open")
              }
            >
              Gargalos
            </a>
            <a
              href="#oportunidades"
              onClick={(event) =>
                event.currentTarget
                  .closest("details")
                  ?.removeAttribute("open")
              }
            >
              Oportunidades
            </a>
            <a
              href="#evidencias"
              onClick={(event) =>
                event.currentTarget
                  .closest("details")
                  ?.removeAttribute("open")
              }
            >
              Evidências
            </a>
            <a
              href="#plano"
              onClick={(event) =>
                event.currentTarget
                  .closest("details")
                  ?.removeAttribute("open")
              }
            >
              Plano
            </a>
          </nav>
        </details>
      </header>

      <section className="workboard" id="visao" aria-labelledby="mission-title">
        <div className="context-strip">
          <span>{report.company.name}</span>
          <span>{statusLabels[status]}</span>
          <span>{formatPeriod(report.company.period)}</span>
          <span>
            {sources.length} {sources.length === 1 ? "fonte analisada" : "fontes analisadas"}
          </span>
        </div>

        <div className="first-viewport">
          <header className="decision-brief">
            <div>
              <span className="dashboard-eyebrow">Painel analítico</span>
              <h1 id="mission-title">{report.executiveSummary.headline}</h1>
            </div>
            <div className="decision-status">
              <span>Recomendação executiva</span>
              <strong>
                {active
                  ? `${active.id} · ${active.decision}`
                  : statusLabels[status]}
              </strong>
            </div>
          </header>

          {summaryFacts.length > 0 ? (
            <section
              className="decision-facts"
              aria-label="Indicadores executivos do período"
            >
              {summaryFacts.map((metric) => {
                const delta = buildObservedMetricDelta(metric);
                const isActive = metric.id === activeMetric?.id;
                return (
                  <article className="kpi-fact" data-active={isActive} key={metric.id}>
                    <button
                      className="kpi-fact-select"
                      type="button"
                      aria-controls="observed-series-panel"
                      aria-pressed={isActive}
                      aria-label={`${metric.label}: valor atual ${formatMetricValue(
                        metric.baseline,
                        metric.unit,
                      )}; meta ${formatMetricValue(metric.target, metric.unit)}; ${
                        delta
                          ? `${delta.label.toLowerCase()} ${delta.displayValue}`
                          : "sem variação histórica disponível"
                      }. Exibir no gráfico principal.`}
                      onClick={() => setActiveMetricId(metric.id)}
                    >
                      <span>{metric.label}</span>
                      <strong>
                        {formatMetricValue(metric.baseline, metric.unit)}
                      </strong>
                      <small>
                        Meta {formatMetricValue(metric.target, metric.unit)}
                      </small>
                      <span className="kpi-delta" data-direction={delta?.direction ?? "none"}>
                        {delta ? `${delta.label} · ${delta.displayValue}` : "Série observada indisponível"}
                      </span>
                    </button>
                    {canRenderObservedMetricTrend(metric) ? (
                      <Suspense
                        fallback={<div className="kpi-sparkline-loading" aria-hidden="true" />}
                      >
                        <MetricVisual
                          metric={metric}
                          metricLabel={metric.label}
                          variant="observed-sparkline"
                        />
                      </Suspense>
                    ) : (
                      <span className="kpi-sparkline-fallback">
                        O valor atual permanece disponível em texto.
                      </span>
                    )}
                  </article>
                );
              })}
            </section>
          ) : (
            <p className="metric-empty">
              Nenhum indicador foi registrado para este período.
            </p>
          )}

          <div className="dashboard-focus-grid">
            <section
              className="observed-series-panel"
              id="observed-series-panel"
              aria-labelledby="observed-series-heading"
            >
              <div className="observed-series-heading">
                <div>
                  <span>Série observada nas fontes</span>
                  <h2 id="observed-series-heading">
                    {activeMetric?.label ?? "Indicador sem série"}
                  </h2>
                </div>
                <small>
                  {formatCount(
                    activeMetric?.observations.length ?? 0,
                    "período",
                    "períodos",
                  )}
                </small>
              </div>
              {activeMetric && canRenderObservedMetricTrend(activeMetric) ? (
                <Suspense
                  fallback={<div className="observed-chart-loading" aria-hidden="true" />}
                >
                  <MetricVisual
                    metric={activeMetric}
                    metricLabel={activeMetric.label}
                    variant="observed-history"
                  />
                </Suspense>
              ) : (
                <div className="observed-series-fallback">
                  <strong>Série mensal ainda não disponível.</strong>
                  <p>
                    O valor atual e a meta permanecem visíveis; o relatório não
                    inventa períodos ausentes.
                  </p>
                </div>
              )}
              <p className="sr-only" aria-live="polite">
                Gráfico principal atualizado para {activeMetric?.label ?? "nenhum indicador"}.
              </p>
            </section>

            <aside className="priority-queue" aria-labelledby="queue-title">
              <div className="queue-heading">
                <div>
                  <span>Decisão</span>
                  <h2 id="queue-title">Oportunidades prioritárias</h2>
                </div>
                <span className="score-key">máx. 20</span>
              </div>

              <ol>
                {report.opportunities.slice(0, 3).map((item, index) => {
                  const isActive = item.id === active?.id;
                  return (
                    <li key={item.id} data-active={isActive}>
                      <button
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setActiveId(item.id)}
                      >
                        <span className="rank">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="queue-copy">
                          <strong>{item.title}</strong>
                          <small>
                            {classificationLabels[item.classification]} ·{" "}
                            {item.decision}
                          </small>
                        </span>
                        <span className="queue-score">{item.score}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div className="active-trace" aria-live="polite">
                <span>Rastro ativo{active ? ` · ${active.id}` : ""}</span>
                <strong>
                  {active?.title ?? "Nenhuma oportunidade registrada"}
                </strong>
                <small>
                  {active?.description ??
                    "Consulte as limitações e valide se há evidência suficiente para gerar oportunidades."}
                </small>
              </div>
              {active && (
                <p className="sr-only" aria-live="polite">
                  Rastro de {active.id}: gargalos{" "}
                  {active.bottleneckIds.join(", ") || "nenhum"}; fontes{" "}
                  {active.sourceIds.join(", ") || "nenhuma"}; fases{" "}
                  {activePhases || "nenhuma"}.
                </p>
              )}
            </aside>
          </div>

          <section className="decision-narrative" aria-label="Síntese e próxima ação">
            <p className="decision-summary">
              {report.executiveSummary.recommendation}{" "}
              {report.executiveSummary.rationale}
            </p>
            <div className="next-action">
              <span>Próxima ação</span>
              <strong>
                {active?.nextAction ?? report.executiveSummary.nextAction}
              </strong>
              <small>
                {statusLabels[status]} · {formatPeriod(report.company.period)} ·
                revisão humana preservada
              </small>
            </div>
          </section>
        </div>

        <section
          className="section-block bottleneck-section"
          id="gargalos"
          aria-labelledby="bottleneck-title"
        >
          <div className="section-heading split-heading">
            <div>
              <h2 id="bottleneck-title">Onde a operação perde tempo</h2>
              <p>
                {report.bottlenecks.length}{" "}
                {report.bottlenecks.length === 1 ? "sinal conecta" : "sinais conectam"}{" "}
                a evidência às oportunidades priorizadas.
              </p>
            </div>
            <div className="legend" aria-label="Legenda analítica">
              <span data-level="evidencia">Evidência</span>
              <span data-level="inferencia">Inferência</span>
              <span data-level="hipotese">Hipótese</span>
            </div>
          </div>

          <ol className="bottleneck-line">
            {report.bottlenecks.map((item) => {
              const linked = active?.bottleneckIds.includes(item.id) ?? false;
              return (
                <li key={item.id} data-linked={linked}>
                  {linked && active && (
                    <span className="sr-only">
                      Ligado à iniciativa ativa {active.id}.
                    </span>
                  )}
                  <span>{item.id}</span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </li>
              );
            })}
          </ol>
        </section>

        <section
          className="section-block opportunity-section"
          id="oportunidades"
          aria-labelledby="opportunity-title"
        >
          <div className="section-heading split-heading">
            <div>
              <h2 id="opportunity-title">Comparar antes de automatizar</h2>
              <p>
                Impacto e velocidade aumentam a prioridade; esforço e risco
                reduzem a nota.
              </p>
            </div>
            <div
              className="area-filter"
              role="group"
              aria-label="Filtrar oportunidades por classificação"
            >
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={effectiveFilter === filter}
                  onClick={() => chooseFilter(filter)}
                >
                  {filter === "all"
                    ? "Todas"
                    : classificationLabels[filter]}
                </button>
              ))}
            </div>
          </div>

          <div className="opportunity-grid">
            <figure className="matrix-panel" aria-labelledby="matrix-title">
              <figcaption id="matrix-title">
                <strong>Matriz impacto × esforço</strong>
                <span>Risco e velocidade aparecem em cada ponto.</span>
              </figcaption>
              <div className="matrix-canvas">
                <span className="matrix-label label-impact">Impacto maior</span>
                <span className="matrix-label label-effort">Esforço maior</span>
                <span className="matrix-quadrant q1">Priorizar</span>
                <span className="matrix-quadrant q2">Planejar</span>
                <span className="matrix-quadrant q3">Observar</span>
                <span className="matrix-quadrant q4">Reavaliar</span>
                {visibleOpportunities.map((item, index) => {
                  const isActive = item.id === active?.id;
                  return (
                    <button
                      className="matrix-point"
                      key={item.id}
                      style={pointStyle(item, index, visibleOpportunities)}
                      type="button"
                      data-active={isActive}
                      aria-pressed={isActive}
                      aria-label={`${item.id}: ${item.title}. Impacto ${item.impact}, esforço ${item.effort}, risco ${item.risk}, velocidade ${item.speed}, prioridade ${item.score} de 20.`}
                      onClick={() => setActiveId(item.id)}
                    >
                      <span>{item.id}</span>
                      <small>
                        <span>{shortOpportunityTitle(item.title)}</span>
                        <span className="point-meta">
                          R{item.risk}/5 · V{item.speed}/5
                        </span>
                      </small>
                    </button>
                  );
                })}
              </div>
              <p className="score-method">
                Prioridade = impacto + velocidade + (6 − esforço) + (6 − risco),
                numa escala de 4 a 20. Empates favorecem o menor risco; pontos
                coincidentes recebem apenas deslocamento visual.
              </p>
            </figure>

            <article className="initiative-dossier" aria-live="polite">
              {active ? (
                <>
                  <div className="dossier-topline">
                    <span>
                      {active.id} · {classificationLabels[active.classification]}
                    </span>
                    <strong>{active.score}/20</strong>
                  </div>
                  <h3>{active.title}</h3>
                  <p className="dossier-why">{active.description}</p>

                  <dl className="score-ledger">
                    <div><dt>Impacto</dt><dd>{active.impact}/5</dd></div>
                    <div><dt>Esforço</dt><dd>{active.effort}/5</dd></div>
                    <div><dt>Risco</dt><dd>{active.risk}/5</dd></div>
                    <div><dt>Velocidade</dt><dd>{active.speed}/5</dd></div>
                  </dl>

                  {active.hypothesis && (
                    <div className="hypothesis-box">
                      <span data-level="hipotese">Hipótese a testar</span>
                      <p>{active.hypothesis}</p>
                    </div>
                  )}

                  <div className="dossier-decision">
                    <span>Decisão</span>
                    <strong>{active.decision}</strong>
                    <small>Próxima ação · {active.nextAction}</small>
                  </div>
                </>
              ) : (
                <div className="active-trace">
                  <span>Sem oportunidade</span>
                  <strong>Evidência insuficiente para priorizar</strong>
                  <small>Revise as limitações e as perguntas de validação.</small>
                </div>
              )}
            </article>
          </div>
        </section>

        <section
          className="section-block evidence-section"
          id="evidencias"
          aria-labelledby="evidence-title"
        >
          <div className="section-heading split-heading">
            <div>
              <h2 id="evidence-title">O rastro volta até a fonte</h2>
              <p>
                As linhas em cobre sustentam a iniciativa ativa. Nenhuma
                hipótese é apresentada como resultado.
              </p>
            </div>
            <span className="active-source-count">
              {activeSourceIds.length}{" "}
              {activeSourceIds.length === 1 ? "fonte ligada" : "fontes ligadas"}
              {active ? ` a ${active.id}` : ""}
            </span>
          </div>

          <div className="evidence-ledger" role="list">
            {sources.map((source) => {
              const linked = activeSourceIds.includes(source.sourceId);
              const usages = traceEntries.filter((entry) =>
                entry.sourceIds.includes(source.sourceId)
              );
              const usageLevel = usages.find(
                (entry): entry is TraceEntry & {
                  classification: ReportClassification;
                } => entry.classification !== null
              )?.classification;
              const usageLabels = usages.map(({ label }) => label);
              const citedLocators = usages.flatMap(({ citations }) =>
                citations
                  .filter((citation) => citation.sourceId === source.sourceId)
                  .map(formatCitation)
              );
              const locators = Array.from(
                new Set([...(source.locators ?? []), ...citedLocators])
              );
              return (
                <article
                  id={`evidence-source-${source.sourceId}`}
                  key={source.sourceId}
                  role="listitem"
                  data-linked={linked}
                >
                  {linked && active && (
                    <span className="sr-only">
                      Fonte ligada à iniciativa ativa {active.id}.
                    </span>
                  )}
                  <div className="source-id">
                    <span>{source.sourceId}</span>
                    <small
                      data-level={usageLevel ? levelClass(usageLevel) : undefined}
                    >
                      {usageLevel
                        ? `Uso: ${classificationLabels[usageLevel]}`
                        : source.extension.replace(/^\./, "").toUpperCase()}
                    </small>
                  </div>
                  <div className="source-copy">
                    <strong>{displayFileLabel(source.fileName)}</strong>
                    <code>{source.fileName}</code>
                    <p>
                      {usageLabels.length > 0
                        ? `Sustenta ${usageLabels.slice(0, 3).join(", ")}${
                            usageLabels.length > 3
                              ? ` e mais ${usageLabels.length - 3}`
                              : ""
                          }.`
                        : "Fonte preservada nesta versão do relatório."}
                    </p>
                  </div>
                  <blockquote>
                    {locators.length > 0
                      ? `Localizadores: ${locators.slice(0, 3).join("; ")}${
                          locators.length > 3
                            ? `; +${locators.length - 3}`
                            : ""
                        }. `
                      : ""}
                    Impressão digital do arquivo {source.sha256.slice(0, 12)}…
                  </blockquote>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="section-block plan-section"
          id="plano"
          aria-labelledby="plan-title"
        >
          <div className="section-heading split-heading plan-heading">
            <div>
              <h2 id="plan-title">Plano de execução com baixo risco</h2>
              <p>
                O plano mede correções e preserva uma decisão humana no final.
              </p>
            </div>
            <div className="plan-rule">
              <span>{ruleMetric ? ruleMetric.label : "Regra inviolável"}</span>
              <strong>
                {ruleMetric
                  ? formatMetricValue(ruleMetric.target, ruleMetric.unit)
                  : "Aprovação humana antes do compartilhamento"}
              </strong>
            </div>
          </div>

          <ol className="runway-30">
            {report.plan.map((phase) => {
              const linked = active
                ? shareSourceIds(phase.sourceIds, active.sourceIds)
                : false;
              return (
                <li key={phase.id} data-linked={linked}>
                  {linked && active && (
                    <span className="sr-only">
                      Fase ligada à iniciativa ativa {active.id}.
                    </span>
                  )}
                  <div className="phase-time">
                    <span>{phase.id}</span>
                    <strong>{phase.window}</strong>
                  </div>
                  <h3>{phase.phase}</h3>
                  <p>{phase.action}</p>
                  <small>{phase.expectedOutcome}</small>
                </li>
              );
            })}
          </ol>

          <div className="metric-workbench">
            <div className="metric-controls">
              <div
                className="metric-filter"
                role="group"
                aria-label="Filtrar indicadores por classificação"
              >
                {metricFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={effectiveMetricFilter === filter}
                    onClick={() => chooseMetricFilter(filter)}
                  >
                    {filter === "all"
                      ? "Todos"
                      : classificationLabels[filter]}
                  </button>
                ))}
              </div>
              <label className="metric-sort">
                Ordenar indicadores
                <select
                  value={metricSort}
                  onChange={(event) =>
                    setMetricSort(event.target.value as MetricSort)
                  }
                >
                  <option value="report">Ordem do relatório</option>
                  <option value="label">Nome do indicador</option>
                  <option value="classification">Classificação</option>
                </select>
              </label>
            </div>

            <div
              className="metric-table"
              role="table"
              aria-label="Indicadores do plano"
              aria-rowcount={visibleMetrics.length + 1}
            >
              <div className="metric-row metric-header" role="row">
                <span role="columnheader">Indicador</span>
                <span role="columnheader">Base</span>
                <span role="columnheader">Meta de teste</span>
                <span role="columnheader">Situação</span>
                <span role="columnheader">Rastro</span>
              </div>
              {visibleMetrics.map((metric) => (
                <div
                  className="metric-row"
                  data-active={metric.id === activeMetric?.id}
                  role="row"
                  key={metric.id}
                >
                  <strong role="cell">{metric.label}</strong>
                  <span role="cell" data-cell-label="Base">
                    {formatMetricValue(metric.baseline, metric.unit)}
                  </span>
                  <span role="cell" data-cell-label="Meta">
                    {formatMetricValue(metric.target, metric.unit)}
                  </span>
                  <span role="cell" data-cell-label="Situação">
                    <ClassificationBadge
                      classification={metric.classification}
                      tooltipId={`table-classification-${metric.id}`}
                    />
                  </span>
                  <span role="cell" data-cell-label="Rastro">
                    <button
                      className="metric-trace-button"
                      type="button"
                      aria-pressed={metric.id === activeMetric?.id}
                      aria-controls="metric-inspector"
                      onClick={() => setActiveMetricId(metric.id)}
                    >
                      {metric.id === activeMetric?.id
                        ? "Rastro aberto"
                        : "Ver rastro"}
                    </button>
                  </span>
                </div>
              ))}
              {visibleMetrics.length === 0 ? (
                <div className="metric-empty" role="row">
                  <span role="cell">
                    Nenhum indicador corresponde ao filtro selecionado.
                  </span>
                </div>
              ) : null}
            </div>

            <aside
              className="metric-inspector"
              id="metric-inspector"
              aria-live="polite"
              aria-labelledby="metric-inspector-title"
              tabIndex={-1}
            >
              {activeMetric ? (
                <>
                  <div className="metric-inspector-heading">
                    <div>
                      <span>Rastreabilidade do indicador</span>
                      <h3 id="metric-inspector-title">
                        {activeMetric.label}
                      </h3>
                    </div>
                    <ClassificationBadge
                      classification={activeMetric.classification}
                      tooltipId={`inspector-classification-${activeMetric.id}`}
                    />
                  </div>
                  <dl className="metric-inspector-values">
                    <div>
                      <dt>Base observada</dt>
                      <dd>
                        {formatMetricValue(
                          activeMetric.baseline,
                          activeMetric.unit
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Meta de teste</dt>
                      <dd>
                        {formatMetricValue(
                          activeMetric.target,
                          activeMetric.unit
                        )}
                      </dd>
                    </div>
                  </dl>
                  <section
                    className="metric-comparison"
                    aria-labelledby="metric-comparison-heading"
                  >
                    <div className="metric-comparison-heading">
                      <div>
                        <strong id="metric-comparison-heading">
                          Base × meta
                        </strong>
                        <span>
                          Comparação visual disponível apenas para valores
                          estritamente numéricos na mesma unidade.
                        </span>
                      </div>
                    </div>
                    {hasComparableMetric ? (
                      <Suspense
                        fallback={
                          <div
                            className="metric-chart-loading"
                            aria-hidden="true"
                          />
                        }
                      >
                        <MetricVisual
                          metric={activeMetric}
                          metricLabel={activeMetric.label}
                          variant="comparison"
                        />
                      </Suspense>
                    ) : (
                      <p className="metric-chart-fallback">
                        Base e meta permanecem em texto porque uma delas não
                        representa um número estrito comparável.
                      </p>
                    )}
                  </section>
                  <section
                    className="metric-history"
                    aria-labelledby="metric-history-title"
                  >
                    <div className="metric-history-heading">
                      <div>
                        <strong id="metric-history-title">
                          Histórico de aprovações
                        </strong>
                        <span>
                          Somente versões realmente aprovadas desta empresa,
                          com chave e unidade compatíveis.
                        </span>
                      </div>
                      <small>
                        {formatCount(
                          activeMetricHistory?.points.length ?? 0,
                          "período",
                          "períodos",
                        )}
                      </small>
                    </div>
                    {activeMetricHistory &&
                    canRenderMetricSparkline(activeMetricHistory) ? (
                      <Suspense
                        fallback={
                          <div
                            className="metric-chart-loading"
                            aria-hidden="true"
                          />
                        }
                      >
                        <MetricVisual
                          metricLabel={activeMetric.label}
                          series={activeMetricHistory}
                          variant="history"
                        />
                        <MetricVisual
                          metricLabel={activeMetric.label}
                          series={activeMetricHistory}
                          variant="sparkline"
                        />
                      </Suspense>
                    ) : null}
                    {activeMetricHistory?.points.length ? (
                      <ol className="metric-history-list">
                        {activeMetricHistory.points.map((point) => (
                          <li key={`${point.reportId}-${point.period}`}>
                            <time dateTime={point.period}>
                              {formatPeriod(point.period)}
                            </time>
                            <strong>
                              {formatMetricValue(
                                point.baseline,
                                activeMetricHistory.unit,
                              )}
                            </strong>
                            <span>
                              {classificationLabels[point.classification]}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : metricHistory ? (
                      <p>
                        Nenhum período aprovado compatível está disponível para
                        este indicador.
                      </p>
                    ) : (
                      <p>
                        O histórico não ficou disponível nesta abertura. O
                        valor atual e as fontes permanecem acessíveis.
                      </p>
                    )}
                    {activeMetricHistory &&
                    (activeMetricHistory.incompatibleApprovedReports > 0 ||
                      activeMetricHistory.ambiguousApprovedReports > 0 ||
                      activeMetricHistory.supersededPoints > 0 ||
                      (metricHistory?.invalidApprovedReports ?? 0) > 0) ? (
                      <ul className="metric-history-notes" aria-label="Relatórios não combinados">
                        {activeMetricHistory.incompatibleApprovedReports > 0 ? (
                          <li>
                            {formatCount(
                              activeMetricHistory.incompatibleApprovedReports,
                              "relatório ignorado",
                              "relatórios ignorados",
                            )} por chave, nome legado ou unidade divergente.
                          </li>
                        ) : null}
                        {activeMetricHistory.ambiguousApprovedReports > 0 ? (
                          <li>
                            {formatCount(
                              activeMetricHistory.ambiguousApprovedReports,
                              "relatório ignorado",
                              "relatórios ignorados",
                            )} por conter métricas compatíveis duplicadas.
                          </li>
                        ) : null}
                        {activeMetricHistory.supersededPoints > 0 ? (
                          <li>
                            {formatCount(
                              activeMetricHistory.supersededPoints,
                              "versão do mesmo período substituída",
                              "versões do mesmo período substituídas",
                            )} pela aprovação mais recente.
                          </li>
                        ) : null}
                        {(metricHistory?.invalidApprovedReports ?? 0) > 0 ? (
                          <li>
                            {formatCount(
                              metricHistory?.invalidApprovedReports ?? 0,
                              "relatório aprovado inválido ignorado",
                              "relatórios aprovados inválidos ignorados",
                            )} com segurança.
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </section>
                  <div className="metric-source-list">
                    <strong>Fontes e localizadores</strong>
                    {activeMetricTrace.length > 0 ? (
                      <ul>
                        {activeMetricTrace.map((trace) => (
                          <li key={trace.sourceId}>
                            <a href={`#evidence-source-${trace.sourceId}`}>
                              <span>{trace.sourceId}</span>
                              <strong>
                                {trace.source
                                  ? displayFileLabel(trace.source.fileName)
                                  : "Fonte indisponível nesta versão"}
                              </strong>
                            </a>
                            <small>
                              {trace.citations.length > 0
                                ? Array.from(
                                    new Set(
                                      trace.citations.map(formatCitation)
                                    )
                                  ).join("; ")
                                : "Sem localizador específico registrado."}
                            </small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        O relatório não vinculou este indicador a uma fonte.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="metric-empty">
                  <h3 id="metric-inspector-title">Sem indicador ativo</h3>
                  <p>Adicione uma métrica rastreável ao relatório.</p>
                </div>
              )}
            </aside>
          </div>
        </section>

        <section
          className="section-block guardrail-section"
          aria-labelledby="guardrail-title"
        >
          <div className="guardrail-intro">
            <h2 id="guardrail-title">
              O que a IA prepara. O que a pessoa decide.
            </h2>
            <p>
              O produto é útil porque a fronteira está visível, não porque ela
              desapareceu.
            </p>
          </div>
          <div className="guardrail-columns">
            <div>
              <strong>A IA pode</strong>
              <ul>
                <li>Classificar e organizar informações já disponíveis.</li>
                <li>Preparar rascunhos com modelos aprovados.</li>
                <li>Apontar dados ausentes e casos incertos.</li>
              </ul>
            </div>
            <div>
              <strong>Uma pessoa sempre</strong>
              <ul>
                <li>Confirma preço, agenda e condição comercial.</li>
                <li>Revisa qualquer mensagem antes do envio.</li>
                <li>Decide ampliar, ajustar ou interromper o plano.</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="mission-footer">
          <div>
            <strong>{report.company.name}</strong>
            <span>
              Relatório {report.schemaVersion} · {statusLabels[status].toLowerCase()}.
            </span>
          </div>
          <details>
            <summary>Limitações deste diagnóstico</summary>
            <ul>
              {report.limitations.length > 0 ? (
                report.limitations.map((limitation) => (
                  <li key={limitation.id}>
                    {limitation.description} Pergunta de validação:{" "}
                    {limitation.validationQuestion}
                  </li>
                ))
              ) : (
                <li>Nenhuma limitação foi registrada neste relatório.</li>
              )}
            </ul>
          </details>
        </footer>
      </section>
    </main>
  );
}

export default ReportDashboard;
