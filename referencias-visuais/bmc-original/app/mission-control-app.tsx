"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ReportDashboard } from "./report-dashboard";
import type {
  MetricHistoryResponse,
  ReportPayload,
  ReportSourceSnapshot,
  ReportStatus,
} from "@/lib/server/reports";

type MembershipRole = "admin" | "analyst" | "viewer";
type LoadStatus = "loading" | "ready" | "error";

type AuthenticatedUser = {
  id: string;
  chatgptUserId: string;
  email: string;
  displayName: string;
};

type CompanyMembership = {
  companyId: string;
  companyName: string;
  companySlug: string;
  companyStatus: "active" | "archived";
  membershipId: string;
  role: MembershipRole;
};

type MemberRecord = {
  id: string;
  chatgptUserId: string;
  email: string;
  displayName: string;
  role: MembershipRole;
  createdAt: string;
  updatedAt: string;
};

type MemberInput = Pick<
  MemberRecord,
  "chatgptUserId" | "email" | "displayName" | "role"
>;

type StoredFile = {
  id: string;
  companyId: string;
  originalName: string;
  safeName: string;
  extension: ".md" | ".xlsx";
  mimeType: string;
  size: number;
  sha256: string;
  status: "uploaded" | "processing" | "ready" | "failed";
  errorMessage: string | null;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type ReportSummary = {
  id: string;
  companyId: string;
  status: ReportStatus;
  schemaVersion: string;
  model: string;
  generationError: string | null;
  createdBy: string;
  createdByName: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  archivedAt: string | null;
};

type ReportSource = ReportSourceSnapshot & {
  sourceId: string;
  fileId: string;
  fileName: string;
  sha256: string;
  extension: ".md" | ".xlsx";
};

type ReportDetail = {
  report: ReportSummary & {
    payload: ReportPayload | null;
    limitations: unknown[];
  };
  sources: ReportSource[];
};

type AuditEvent = {
  id: string;
  companyId: string;
  actorUserId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type ApiIssue = {
  code: string;
  message: string;
  status?: number;
};

type Operation =
  | "create-company"
  | "upsert-member"
  | "change-member-role"
  | "remove-member"
  | "upload-file"
  | "delete-file"
  | "generate-report"
  | "open-report"
  | "review-report"
  | "approve-report"
  | "archive-report";

type SessionResponse = {
  user: AuthenticatedUser;
  companies: CompanyMembership[];
};

type LocalUploadItem = {
  id: string;
  name: string;
  size: number;
  status: "selected" | "uploading" | "ready" | "failed";
};

type PendingGenerationAttempt = {
  attemptId: string;
  companyEpoch: number;
  companyId: string;
  fileIds: string[];
  reportId: string;
  startedAt: number;
};

const REPORT_POLL_INTERVAL_MS = 2_500;
const REPORT_RECONCILIATION_WINDOW_MS = 30_000;

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const roleLabels: Record<MembershipRole, string> = {
  admin: "Administrador",
  analyst: "Analista",
  viewer: "Leitura",
};

const reportStatusLabels: Record<ReportStatus, string> = {
  generating: "Gerando",
  draft: "Rascunho",
  approved: "Aprovado",
  failed: "Falhou",
  archived: "Arquivado",
};

const fileStatusLabels: Record<StoredFile["status"], string> = {
  uploaded: "Enviado",
  processing: "Processando",
  ready: "Pronto",
  failed: "Falhou",
};

const auditActionLabels: Record<string, string> = {
  "company.created": "Empresa criada",
  "membership.created": "Membro adicionado",
  "membership.role_changed": "Papel atualizado",
  "membership.removed": "Membro removido",
  "file.uploaded": "Arquivo enviado",
  "file.ready": "Arquivo processado",
  "file.removed": "Arquivo removido",
  "file.downloaded": "Arquivo baixado",
  "report.generation_started": "Geração iniciada",
  "report.draft_created": "Rascunho criado",
  "report.generation_failed": "Geração falhou",
  "report.draft_edited": "Rascunho revisado",
  "report.approved": "Relatório aprovado",
  "report.archived": "Relatório arquivado",
};

class ApiRequestError extends Error {
  readonly issue: ApiIssue;

  constructor(issue: ApiIssue) {
    super(issue.message);
    this.name = "ApiRequestError";
    this.issue = issue;
  }
}

function asIssue(error: unknown): ApiIssue {
  if (error instanceof ApiRequestError) return error.issue;
  return {
    code: "unexpected_error",
    message:
      "Não foi possível concluir a operação. Confira sua conexão e tente novamente.",
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let code = `http_${response.status}`;
    let message = "Não foi possível concluir a operação.";
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // A API já evita expor stack e conteúdo bruto. Mantemos mensagem segura.
    }
    throw new ApiRequestError({ code, message, status: response.status });
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function jsonRequest<T>(
  path: string,
  method: "POST" | "PATCH",
  body?: unknown,
  options: Pick<RequestInit, "keepalive" | "signal"> = {},
): Promise<T> {
  const headers = new Headers();
  const init: RequestInit = { ...options, method, headers };
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(body);
  }
  return apiRequest<T>(path, init);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : dateTimeFormatter.format(date);
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function reportTitle(report: ReportSummary): string {
  return `Relatório de ${formatDateTime(report.createdAt)}`;
}

function metricHistoryPath(companyId: string, reportId: string): string {
  return `/api/companies/${encodeURIComponent(companyId)}/reports/${encodeURIComponent(reportId)}/metric-history`;
}

async function loadMetricHistory(
  companyId: string,
  reportId: string,
): Promise<MetricHistoryResponse | null> {
  try {
    return await apiRequest<MetricHistoryResponse>(
      metricHistoryPath(companyId, reportId),
    );
  } catch {
    return null;
  }
}

export function MissionControlApp() {
  const [sessionStatus, setSessionStatus] = useState<LoadStatus>("loading");
  const [sessionIssue, setSessionIssue] = useState<ApiIssue | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [companies, setCompanies] = useState<CompanyMembership[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [workspaceStatus, setWorkspaceStatus] =
    useState<LoadStatus>("loading");
  const [workspaceIssue, setWorkspaceIssue] = useState<ApiIssue | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [activeReport, setActiveReport] = useState<ReportDetail | null>(null);
  const activeReportIdRef = useRef<string | null>(null);
  const [activeMetricHistory, setActiveMetricHistory] =
    useState<MetricHistoryResponse | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [operation, setOperation] = useState<Operation | null>(null);
  const [actionIssue, setActionIssue] = useState<ApiIssue | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [period, setPeriod] = useState("2026-05");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [localUploadQueue, setLocalUploadQueue] = useState<LocalUploadItem[]>([]);
  const [pendingGenerationAttempt, setPendingGenerationAttempt] =
    useState<PendingGenerationAttempt | null>(null);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);

  const activeCompanyIdRef = useRef("");
  const companyEpochRef = useRef(0);
  const uploadInFlightRef = useRef<string | null>(null);
  const generationInFlightRef = useRef<string | null>(null);
  const settledGenerationAttemptRef = useRef<string | null>(null);
  const reportPollInFlightRef = useRef(false);

  const [reviewHeadline, setReviewHeadline] = useState("");
  const [reviewRecommendation, setReviewRecommendation] = useState("");
  const [reviewRationale, setReviewRationale] = useState("");
  const [reviewNextAction, setReviewNextAction] = useState("");

  const activeCompany = useMemo(
    () =>
      companies.find((company) => company.companyId === activeCompanyId) ??
      null,
    [activeCompanyId, companies],
  );

  const readyFiles = useMemo(
    () => files.filter((file) => file.status === "ready"),
    [files],
  );

  const setCompanyContextId = useCallback((companyId: string) => {
    if (activeCompanyIdRef.current !== companyId) {
      activeCompanyIdRef.current = companyId;
      companyEpochRef.current += 1;
    }
    setActiveCompanyId(companyId);
  }, []);

  useEffect(() => {
    if (activeCompanyIdRef.current !== activeCompanyId) {
      activeCompanyIdRef.current = activeCompanyId;
      companyEpochRef.current += 1;
    }
  }, [activeCompanyId]);

  const loadWorkspace = useCallback(
    async (
      company: CompanyMembership,
      options: { signal?: AbortSignal; silent?: boolean } = {},
    ) => {
      await Promise.resolve();
      if (options.signal?.aborted) return;
      const companyEpoch = companyEpochRef.current;
      if (!options.silent) setWorkspaceStatus("loading");
      setWorkspaceIssue(null);

      try {
        const reportsPromise = apiRequest<{ reports: ReportSummary[] }>(
          `/api/companies/${encodeURIComponent(company.companyId)}/reports`,
          { signal: options.signal },
        );
        const filesPromise =
          company.role === "viewer"
            ? Promise.resolve({ files: [] as StoredFile[] })
            : apiRequest<{ files: StoredFile[] }>(
                `/api/companies/${encodeURIComponent(company.companyId)}/files`,
                { signal: options.signal },
              );
        const membersPromise =
          company.role === "admin"
            ? apiRequest<{ members: MemberRecord[] }>(
                `/api/companies/${encodeURIComponent(company.companyId)}/members`,
                { signal: options.signal },
              )
            : Promise.resolve({ members: [] as MemberRecord[] });
        const auditPromise =
          company.role === "admin"
            ? apiRequest<{ events: AuditEvent[] }>(
                `/api/companies/${encodeURIComponent(company.companyId)}/audit`,
                { signal: options.signal },
              )
            : Promise.resolve({ events: [] as AuditEvent[] });

        const [reportData, fileData, memberData, auditData] = await Promise.all([
          reportsPromise,
          filesPromise,
          membersPromise,
          auditPromise,
        ]);
        if (
          companyEpochRef.current !== companyEpoch ||
          activeCompanyIdRef.current !== company.companyId
        ) {
          return;
        }
        setReports(reportData.reports);
        setFiles(fileData.files);
        setMembers(memberData.members);
        setAuditEvents(auditData.events);
        setSelectedFileIds((current) => {
          const readyIds = new Set(
            fileData.files
              .filter((file) => file.status === "ready")
              .map((file) => file.id),
          );
          return current.filter((id) => readyIds.has(id));
        });
        setWorkspaceStatus("ready");
      } catch (error) {
        if (isAbortError(error)) return;
        if (
          companyEpochRef.current !== companyEpoch ||
          activeCompanyIdRef.current !== company.companyId
        ) {
          return;
        }
        setWorkspaceIssue(asIssue(error));
        setWorkspaceStatus("error");
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<SessionResponse>("/api/session", {
      signal: controller.signal,
    })
      .then((session) => {
        setUser(session.user);
        setCompanies(session.companies);
        const currentCompanyId = activeCompanyIdRef.current;
        const nextCompanyId =
          currentCompanyId &&
          session.companies.some(
            (company) => company.companyId === currentCompanyId,
          )
            ? currentCompanyId
            : (session.companies[0]?.companyId ?? "");
        setCompanyContextId(nextCompanyId);
        setSessionStatus("ready");
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setSessionIssue(asIssue(error));
        setSessionStatus("error");
      });
    return () => controller.abort();
  }, [setCompanyContextId]);

  useEffect(() => {
    if (!activeCompany) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadWorkspace(activeCompany, { signal: controller.signal });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeCompany, loadWorkspace]);

  function selectCompany(companyId: string) {
    if (
      operation !== null ||
      pendingGenerationAttempt ||
      uploadInFlightRef.current ||
      generationInFlightRef.current
    ) {
      return;
    }
    setCompanyContextId(companyId);
    setMembers([]);
    setFiles([]);
    setReports([]);
    setAuditEvents([]);
    setSelectedFileIds([]);
    setLocalUploadQueue([]);
    setPendingGenerationAttempt(null);
    setActiveReport(null);
    activeReportIdRef.current = null;
    setActiveMetricHistory(null);
    setReportLoading(false);
    setApprovalConfirmed(false);
    setNotice(null);
    setActionIssue(null);
    setWorkspaceStatus("loading");
  }

  const adoptReportDetail = useCallback((
    detail: ReportDetail,
    metricHistory?: MetricHistoryResponse | null,
  ) => {
    const summary = detail.report.payload?.executiveSummary;
    setActiveReport(detail);
    activeReportIdRef.current = detail.report.id;
    setActiveMetricHistory((current) => {
      if (metricHistory !== undefined) return metricHistory;
      return current?.reportId === detail.report.id ? current : null;
    });
    setReviewHeadline(summary?.headline ?? "");
    setReviewRecommendation(summary?.recommendation ?? "");
    setReviewRationale(summary?.rationale ?? "");
    setReviewNextAction(summary?.nextAction ?? "");
    setApprovalConfirmed(false);
  }, []);

  const hasGeneratingReports = reports.some(
    (report) => report.status === "generating",
  );

  useEffect(() => {
    if (
      !activeCompany ||
      activeCompany.role === "viewer" ||
      (!pendingGenerationAttempt && !hasGeneratingReports)
    ) {
      return;
    }

    const companyId = activeCompany.companyId;
    const companyEpoch = companyEpochRef.current;
    const attempt = pendingGenerationAttempt;
    let disposed = false;
    let timer: number | null = null;

    const contextIsCurrent = () =>
      !disposed &&
      companyEpochRef.current === companyEpoch &&
      activeCompanyIdRef.current === companyId;

    const schedule = () => {
      if (!disposed) {
        timer = window.setTimeout(() => void pollReports(), REPORT_POLL_INTERVAL_MS);
      }
    };

    const pollReports = async () => {
      if (!contextIsCurrent()) return;
      if (document.visibilityState === "hidden") {
        schedule();
        return;
      }
      if (reportPollInFlightRef.current) {
        schedule();
        return;
      }

      reportPollInFlightRef.current = true;
      try {
        const reportData = await apiRequest<{ reports: ReportSummary[] }>(
          `/api/companies/${encodeURIComponent(companyId)}/reports`,
        );
        if (!contextIsCurrent()) return;
        setReports(reportData.reports);

        if (!attempt) {
          const generatingReport = reportData.reports.find(
            (report) => report.status === "generating",
          );
          if (!generatingReport) return;
          const detail = await apiRequest<ReportDetail>(
            `/api/companies/${encodeURIComponent(companyId)}/reports/${encodeURIComponent(generatingReport.id)}`,
          );
          if (!contextIsCurrent()) return;
          const startedAt = Date.parse(generatingReport.createdAt);
          const recoveredAttempt: PendingGenerationAttempt = {
            attemptId: generatingReport.id,
            companyEpoch,
            companyId,
            fileIds: detail.sources.map((source) => source.fileId),
            reportId: generatingReport.id,
            startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
          };
          setSelectedFileIds(recoveredAttempt.fileIds);
          settledGenerationAttemptRef.current = null;
          setPendingGenerationAttempt(recoveredAttempt);
          setActionIssue(null);
          setNotice(
            "Uma geração em andamento foi recuperada. Aguardando o estado final no servidor…",
          );
          return;
        }

        const report = reportData.reports.find(
          (candidate) => candidate.id === attempt.reportId,
        );
        if (!report) {
          if (
            generationInFlightRef.current !== attempt.attemptId &&
            Date.now() - attempt.startedAt >= REPORT_RECONCILIATION_WINDOW_MS
          ) {
            setPendingGenerationAttempt((current) =>
              current?.attemptId === attempt.attemptId ? null : current,
            );
            setActionIssue((current) =>
              current ?? {
                code: "report_status_unconfirmed",
                message:
                  "Não foi possível confirmar o estado da tentativa. Os arquivos continuam selecionados para tentar novamente.",
              },
            );
          }
          return;
        }

        const detail = await apiRequest<ReportDetail>(
          `/api/companies/${encodeURIComponent(companyId)}/reports/${encodeURIComponent(report.id)}`,
        );
        if (!contextIsCurrent()) return;
        if (detail.report.status === "generating") return;

        setSelectedFileIds(detail.sources.map((source) => source.fileId));
        settledGenerationAttemptRef.current = attempt.attemptId;
        setPendingGenerationAttempt((current) =>
          current?.attemptId === attempt.attemptId ? null : current,
        );

        if (detail.report.status === "failed") {
          setActionIssue({
            code: "report_generation_failed",
            message:
              detail.report.generationError ??
              "A geração não foi concluída. Os arquivos continuam selecionados para uma nova tentativa.",
          });
          setNotice(null);
          return;
        }

        if (
          detail.report.status === "draft" ||
          detail.report.status === "approved" ||
          detail.report.status === "archived"
        ) {
          adoptReportDetail(detail, null);
          setActionIssue(null);
          setNotice(
            "A geração foi reconciliada com o servidor. Confira o rascunho antes de aprovar.",
          );
          void loadMetricHistory(companyId, detail.report.id).then((history) => {
            if (
              contextIsCurrent() &&
              activeReportIdRef.current === detail.report.id
            ) {
              setActiveMetricHistory(history);
            }
          });
        }
      } catch {
        // Uma falha de polling não substitui o erro original nem perde a tentativa.
      } finally {
        reportPollInFlightRef.current = false;
        schedule();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (timer !== null) window.clearTimeout(timer);
        void pollReports();
      }
    };

    timer = window.setTimeout(() => void pollReports(), 500);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    activeCompany,
    adoptReportDetail,
    hasGeneratingReports,
    pendingGenerationAttempt,
  ]);

  function beginOperation(nextOperation: Operation) {
    setOperation(nextOperation);
    setActionIssue(null);
    setNotice(null);
  }

  function failOperation(error: unknown) {
    setActionIssue(asIssue(error));
  }

  async function refreshWorkspace() {
    if (activeCompany) {
      await loadWorkspace(activeCompany, { silent: true });
    }
  }

  async function refreshMembershipContext() {
    const session = await apiRequest<SessionResponse>("/api/session");
    setUser(session.user);
    setCompanies(session.companies);
    const nextCompany =
      session.companies.find(
        (company) => company.companyId === activeCompany?.companyId,
      ) ?? session.companies[0] ?? null;

    if (!nextCompany) {
      setCompanyContextId("");
      setMembers([]);
      setFiles([]);
      setReports([]);
      setAuditEvents([]);
      setSelectedFileIds([]);
      setLocalUploadQueue([]);
      setPendingGenerationAttempt(null);
      setActiveReport(null);
      activeReportIdRef.current = null;
      setActiveMetricHistory(null);
      setWorkspaceStatus("ready");
      return;
    }

    if (
      nextCompany.companyId !== activeCompany?.companyId ||
      nextCompany.role === "viewer"
    ) {
      setSelectedFileIds([]);
      setLocalUploadQueue([]);
      setPendingGenerationAttempt(null);
      setActiveReport(null);
      activeReportIdRef.current = null;
      setActiveMetricHistory(null);
      setApprovalConfirmed(false);
    }
    setCompanyContextId(nextCompany.companyId);
    setWorkspaceStatus("loading");
  }

  async function handleCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("companyName") ?? "").trim();
    if (name.length < 2) {
      setActionIssue({
        code: "invalid_company_name",
        message: "Informe um nome de empresa com pelo menos dois caracteres.",
      });
      return;
    }

    beginOperation("create-company");
    try {
      const response = await jsonRequest<{ company: CompanyMembership }>(
        "/api/companies",
        "POST",
        { name },
      );
      setCompanies([response.company]);
      setCompanyContextId(response.company.companyId);
      setActiveReport(null);
      activeReportIdRef.current = null;
      setActiveMetricHistory(null);
      setNotice("Empresa criada. Agora adicione as fontes da análise.");
      form.reset();
    } catch (error) {
      failOperation(error);
    } finally {
      setOperation(null);
    }
  }

  function handleUploadSelection(event: ChangeEvent<HTMLInputElement>) {
    const selected = [...(event.currentTarget.files ?? [])];
    const form = event.currentTarget.form;
    setLocalUploadQueue(
      selected.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        name: file.name,
        size: file.size,
        status: "selected",
      })),
    );
    setActionIssue(null);
    if (selected.length > 0 && form) {
      requestAnimationFrame(() => {
        if (!uploadInFlightRef.current && form.isConnected) {
          form.requestSubmit();
        }
      });
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCompany || activeCompany.role === "viewer") return;
    if (
      uploadInFlightRef.current ||
      generationInFlightRef.current ||
      pendingGenerationAttempt
    ) {
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const candidates = formData
      .getAll("files")
      .filter((candidate): candidate is File => candidate instanceof File && candidate.size > 0);
    if (candidates.length === 0) {
      setActionIssue({
        code: "file_required",
        message: "Selecione de 1 a 10 arquivos .md ou .xlsx.",
      });
      return;
    }

    const uploadAttemptId = `upl_${crypto.randomUUID()}`;
    const companyId = activeCompany.companyId;
    const companyEpoch = companyEpochRef.current;
    const contextIsCurrent = () =>
      companyEpochRef.current === companyEpoch &&
      activeCompanyIdRef.current === companyId;
    uploadInFlightRef.current = uploadAttemptId;
    beginOperation("upload-file");
    setLocalUploadQueue((current) =>
      current.map((item) => ({ ...item, status: "uploading" })),
    );
    try {
      const response = await apiRequest<{ files: StoredFile[] }>(
        `/api/companies/${encodeURIComponent(companyId)}/files/batch`,
        { method: "POST", body: formData },
      );
      if (!contextIsCurrent()) return;
      const uploadedIds = response.files.map((file) => file.id);
      setFiles((current) => [
        ...response.files,
        ...current.filter((file) => !uploadedIds.includes(file.id)),
      ]);
      setSelectedFileIds(uploadedIds);
      setLocalUploadQueue((current) =>
        current.map((item) => ({ ...item, status: "ready" })),
      );
      form.reset();
      if (autoGenerate) {
        await generateReportFromFiles(uploadedIds, {
          companyEpoch,
          companyId,
        });
      } else {
        setNotice(
          `${formatCount(
            response.files.length,
            "arquivo pronto e selecionado",
            "arquivos prontos e selecionados",
          )}. A geração automática está desativada.`,
        );
      }
    } catch (error) {
      if (!contextIsCurrent()) return;
      setLocalUploadQueue((current) =>
        current.map((item) => ({ ...item, status: "failed" })),
      );
      failOperation(error);
    } finally {
      if (uploadInFlightRef.current === uploadAttemptId) {
        uploadInFlightRef.current = null;
      }
      setOperation((current) =>
        current === "upload-file" ? null : current,
      );
    }
  }

  async function handleUpsertMember(input: MemberInput): Promise<boolean> {
    if (!activeCompany || activeCompany.role !== "admin") return false;

    beginOperation("upsert-member");
    try {
      await jsonRequest<{ member: MemberRecord }>(
        `/api/companies/${encodeURIComponent(activeCompany.companyId)}/members`,
        "POST",
        input,
      );
      setNotice("Membro e papel atualizados. A alteração foi registrada na auditoria.");
      await refreshMembershipContext();
      return true;
    } catch (error) {
      failOperation(error);
      return false;
    } finally {
      setOperation(null);
    }
  }

  async function handleChangeMemberRole(
    member: MemberRecord,
    role: MembershipRole,
  ): Promise<boolean> {
    if (!activeCompany || activeCompany.role !== "admin") return false;

    beginOperation("change-member-role");
    try {
      await jsonRequest<{ member: MemberRecord }>(
        `/api/companies/${encodeURIComponent(activeCompany.companyId)}/members/${encodeURIComponent(member.id)}`,
        "PATCH",
        { role },
      );
      setNotice("Papel atualizado. A alteração foi registrada na auditoria.");
      await refreshMembershipContext();
      return true;
    } catch (error) {
      failOperation(error);
      return false;
    } finally {
      setOperation(null);
    }
  }

  async function handleRemoveMember(member: MemberRecord) {
    if (!activeCompany || activeCompany.role !== "admin") return;
    const confirmed = window.confirm(
      `Remover ${member.displayName} de ${activeCompany.companyName}? O histórico de auditoria será preservado.`,
    );
    if (!confirmed) return;

    beginOperation("remove-member");
    try {
      await apiRequest<void>(
        `/api/companies/${encodeURIComponent(activeCompany.companyId)}/members/${encodeURIComponent(member.id)}`,
        { method: "DELETE" },
      );
      setNotice("Membro removido. O servidor preservou o registro da ação.");
      await refreshMembershipContext();
    } catch (error) {
      failOperation(error);
    } finally {
      setOperation(null);
    }
  }

  async function handleDeleteFile(file: StoredFile) {
    if (!activeCompany || activeCompany.role === "viewer") return;
    const confirmed = window.confirm(
      `Remover ${file.originalName} da lista ativa? O histórico já vinculado será preservado.`,
    );
    if (!confirmed) return;

    beginOperation("delete-file");
    try {
      await apiRequest<void>(
        `/api/companies/${encodeURIComponent(activeCompany.companyId)}/files/${encodeURIComponent(file.id)}`,
        { method: "DELETE" },
      );
      setNotice(`${file.originalName} foi removido da lista ativa.`);
      await refreshWorkspace();
    } catch (error) {
      failOperation(error);
    } finally {
      setOperation(null);
    }
  }

  function toggleSource(fileId: string) {
    setSelectedFileIds((current) => {
      if (current.includes(fileId)) {
        return current.filter((id) => id !== fileId);
      }
      if (current.length >= 10) {
        setActionIssue({
          code: "source_limit_reached",
          message: "Cada geração aceita no máximo 10 fontes.",
        });
        return current;
      }
      setActionIssue(null);
      return [...current, fileId];
    });
  }

  async function generateReportFromFiles(
    fileIds: readonly string[],
    requestedContext?: { companyId: string; companyEpoch: number },
  ) {
    if (!activeCompany || activeCompany.role === "viewer") return;
    if (generationInFlightRef.current || pendingGenerationAttempt) return;
    if (fileIds.length === 0) {
      setActionIssue({
        code: "sources_required",
        message: "Selecione pelo menos uma fonte pronta.",
      });
      return;
    }

    const companyId = requestedContext?.companyId ?? activeCompany.companyId;
    const companyEpoch =
      requestedContext?.companyEpoch ?? companyEpochRef.current;
    const contextIsCurrent = () =>
      companyEpochRef.current === companyEpoch &&
      activeCompanyIdRef.current === companyId;
    if (!contextIsCurrent()) return;

    const attemptId = `rpt_${crypto.randomUUID()}`;
    const attempt: PendingGenerationAttempt = {
      attemptId,
      companyEpoch,
      companyId,
      fileIds: [...fileIds],
      reportId: attemptId,
      startedAt: Date.now(),
    };
    generationInFlightRef.current = attemptId;
    settledGenerationAttemptRef.current = null;
    setPendingGenerationAttempt(attempt);
    beginOperation("generate-report");
    setNotice("Arquivos prontos. A IA está gerando e validando o rascunho no servidor…");
    const generationStartedAt = performance.now();
    try {
      const detail = await jsonRequest<ReportDetail>(
        `/api/companies/${encodeURIComponent(companyId)}/reports`,
        "POST",
        { attemptId, fileIds, period },
        { keepalive: true },
      );
      if (!contextIsCurrent()) return;
      setReports((current) => [
        detail.report,
        ...current.filter((report) => report.id !== detail.report.id),
      ]);
      if (detail.report.status === "generating") {
        setNotice(
          "O servidor confirmou a tentativa. Aguardando a conclusão do rascunho…",
        );
        return;
      }
      if (detail.report.status === "failed") {
        settledGenerationAttemptRef.current = attemptId;
        setPendingGenerationAttempt((current) =>
          current?.attemptId === attemptId ? null : current,
        );
        setActionIssue({
          code: "report_generation_failed",
          message:
            detail.report.generationError ??
            "A geração não foi concluída. Os arquivos continuam selecionados para uma nova tentativa.",
        });
        setNotice(null);
        return;
      }
      settledGenerationAttemptRef.current = attemptId;
      setPendingGenerationAttempt((current) =>
        current?.attemptId === attemptId ? null : current,
      );
      adoptReportDetail(detail, null);
      const elapsedSeconds = (performance.now() - generationStartedAt) / 1000;
      setNotice(
        `Rascunho gerado e validado em ${elapsedSeconds.toFixed(1)} s. Confira números, fontes e limitações antes de aprovar.`,
      );
      void loadMetricHistory(companyId, detail.report.id).then((history) => {
        if (
          contextIsCurrent() &&
          activeReportIdRef.current === detail.report.id
        ) {
          setActiveMetricHistory(history);
        }
      });
      requestAnimationFrame(() => {
        if (!contextIsCurrent()) return;
        document.getElementById("relatorio-ativo")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      });
    } catch (error) {
      if (!contextIsCurrent()) return;
      if (settledGenerationAttemptRef.current === attemptId) return;
      failOperation(error);
    } finally {
      if (generationInFlightRef.current === attemptId) {
        generationInFlightRef.current = null;
      }
      setOperation((current) =>
        current === "generate-report" ? null : current,
      );
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await generateReportFromFiles(selectedFileIds);
  }

  async function openReport(reportId: string) {
    if (
      !activeCompany ||
      operation !== null ||
      pendingGenerationAttempt ||
      uploadInFlightRef.current ||
      generationInFlightRef.current
    ) {
      return;
    }
    const companyId = activeCompany.companyId;
    const companyEpoch = companyEpochRef.current;
    const contextIsCurrent = () =>
      companyEpochRef.current === companyEpoch &&
      activeCompanyIdRef.current === companyId;
    beginOperation("open-report");
    setReportLoading(true);
    try {
      const [detail, metricHistory] = await Promise.all([
        apiRequest<ReportDetail>(
          `/api/companies/${encodeURIComponent(companyId)}/reports/${encodeURIComponent(reportId)}`,
        ),
        loadMetricHistory(companyId, reportId),
      ]);
      if (!contextIsCurrent()) return;
      adoptReportDetail(detail, metricHistory);
      setNotice(null);
      requestAnimationFrame(() => {
        if (!contextIsCurrent()) return;
        document.getElementById("relatorio-ativo")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (error) {
      if (!contextIsCurrent()) return;
      failOperation(error);
    } finally {
      if (contextIsCurrent()) {
        setReportLoading(false);
        setOperation((current) =>
          current === "open-report" ? null : current,
        );
      }
    }
  }

  async function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !activeCompany ||
      activeCompany.role === "viewer" ||
      !activeReport?.report.payload ||
      activeReport.report.status !== "draft"
    ) {
      return;
    }

    const payload: ReportPayload = {
      ...activeReport.report.payload,
      executiveSummary: {
        ...activeReport.report.payload.executiveSummary,
        headline: reviewHeadline.trim(),
        recommendation: reviewRecommendation.trim(),
        rationale: reviewRationale.trim(),
        nextAction: reviewNextAction.trim(),
      },
    };
    if (
      !payload.executiveSummary.headline ||
      !payload.executiveSummary.recommendation ||
      !payload.executiveSummary.rationale ||
      !payload.executiveSummary.nextAction
    ) {
      setActionIssue({
        code: "review_fields_required",
        message: "Preencha os quatro campos do resumo executivo.",
      });
      return;
    }

    beginOperation("review-report");
    try {
      const detail = await jsonRequest<ReportDetail>(
        `/api/companies/${encodeURIComponent(activeCompany.companyId)}/reports/${encodeURIComponent(activeReport.report.id)}`,
        "PATCH",
        { payload },
      );
      adoptReportDetail(detail);
      setNotice("Revisão salva. O relatório continua como rascunho.");
      await refreshWorkspace();
    } catch (error) {
      failOperation(error);
    } finally {
      setOperation(null);
    }
  }

  async function handleApprove() {
    if (
      !activeCompany ||
      activeCompany.role !== "admin" ||
      !activeReport ||
      activeReport.report.status !== "draft" ||
      !approvalConfirmed
    ) {
      return;
    }

    beginOperation("approve-report");
    try {
      const detail = await jsonRequest<ReportDetail>(
        `/api/companies/${encodeURIComponent(activeCompany.companyId)}/reports/${encodeURIComponent(activeReport.report.id)}/approve`,
        "POST",
      );
      const metricHistory = await loadMetricHistory(
        activeCompany.companyId,
        detail.report.id,
      );
      adoptReportDetail(detail, metricHistory);
      setNotice("Relatório aprovado. Esta versão agora é imutável.");
      await refreshWorkspace();
    } catch (error) {
      failOperation(error);
    } finally {
      setOperation(null);
    }
  }

  async function handleArchive() {
    if (
      !activeCompany ||
      activeCompany.role !== "admin" ||
      !activeReport ||
      (activeReport.report.status !== "draft" &&
        activeReport.report.status !== "approved")
    ) {
      return;
    }
    const confirmed = window.confirm(
      "Arquivar este relatório? O histórico e o registro das fontes serão preservados.",
    );
    if (!confirmed) return;

    beginOperation("archive-report");
    try {
      const detail = await jsonRequest<ReportDetail>(
        `/api/companies/${encodeURIComponent(activeCompany.companyId)}/reports/${encodeURIComponent(activeReport.report.id)}/archive`,
        "POST",
      );
      const metricHistory = await loadMetricHistory(
        activeCompany.companyId,
        detail.report.id,
      );
      adoptReportDetail(detail, metricHistory);
      setNotice("Relatório arquivado sem apagar o histórico.");
      await refreshWorkspace();
    } catch (error) {
      failOperation(error);
    } finally {
      setOperation(null);
    }
  }

  const effectiveOperation: Operation | null =
    operation ??
    (pendingGenerationAttempt || hasGeneratingReports
      ? "generate-report"
      : null);

  if (sessionStatus === "loading") {
    return <SessionLoading />;
  }

  if (sessionStatus === "error") {
    return <SessionError issue={sessionIssue} />;
  }

  return (
    <div
      className="mission-shell ops-shell"
      role={activeReport ? undefined : "main"}
      data-testid="mission-control-app"
    >
      <header className="mission-rail ops-rail">
        <a
          className="brand-lockup"
          href="#operacao"
          aria-label="Business Mission Control — operação"
        >
          <span className="brand-mark" aria-hidden="true">
            N
          </span>
          <span>Business Mission Control</span>
        </a>
        <nav aria-label="Etapas do trabalho">
          {activeCompany?.role === "admin" && <a href="#membros">Equipe</a>}
          {activeCompany?.role !== "viewer" && (
            <a href="#fontes">Fontes</a>
          )}
          <a href="#historico">Histórico</a>
          <a href="#relatorio-ativo">Relatório</a>
          {activeCompany?.role === "admin" && <a href="#auditoria">Auditoria</a>}
        </nav>
        <span className="access-status">
          <span aria-hidden="true" />
          {activeCompany ? roleLabels[activeCompany.role] : "Acesso autenticado"}
        </span>
        <details className="mobile-menu">
          <summary>Etapas</summary>
          <nav aria-label="Etapas no celular">
            {activeCompany?.role === "admin" && (
              <a href="#membros" onClick={closeContainingDetails}>Equipe</a>
            )}
            {activeCompany?.role !== "viewer" && (
              <a href="#fontes" onClick={closeContainingDetails}>Fontes</a>
            )}
            <a href="#historico" onClick={closeContainingDetails}>Histórico</a>
            <a href="#relatorio-ativo" onClick={closeContainingDetails}>Relatório</a>
            {activeCompany?.role === "admin" && (
              <a href="#auditoria" onClick={closeContainingDetails}>Auditoria</a>
            )}
          </nav>
        </details>
      </header>

      <section className="workboard ops-workboard" id="operacao">
        <div className="context-strip ops-context-strip">
          <span>{activeCompany?.companyName ?? "Nenhuma empresa criada"}</span>
          <span>Sessão ativa · {user?.displayName ?? "Usuário autenticado"}</span>
          <span>
            {activeCompany
              ? `Papel · ${roleLabels[activeCompany.role]}`
              : "Configuração inicial"}
          </span>
        </div>

        <section className="ops-intro" aria-labelledby="ops-title">
          <div>
            <span className="ops-kicker">Mesa operacional rastreável</span>
            <h1 id="ops-title">
              Da fonte privada à decisão aprovada por uma pessoa.
            </h1>
            <p>
              Selecione uma empresa, prepare as evidências e mantenha geração,
              revisão, aprovação e histórico no mesmo rastro.
            </p>
          </div>

          <div className="ops-company-control">
            {companies.length > 0 ? (
              <label htmlFor="company-select">
                Empresa ativa
                <select
                  id="company-select"
                  value={activeCompanyId}
                  disabled={effectiveOperation !== null}
                  onChange={(event) => selectCompany(event.target.value)}
                  data-testid="company-select"
                >
                  {companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.companyName} · {roleLabels[company.role]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="ops-role-stamp">Primeiro acesso</span>
            )}
            <a
              className="ops-text-link"
              href="/signout-with-chatgpt?return_to=/"
            >
              Trocar conta
            </a>
          </div>
        </section>

        <ActionFeedback issue={actionIssue} notice={notice} />

        {companies.length === 0 ? (
          <CompanyEmptyState
            busy={operation === "create-company"}
            onSubmit={handleCreateCompany}
          />
        ) : activeCompany ? (
          <>
            <WorkflowLedger
              company={activeCompany}
              files={files}
              reports={reports}
            />

            {workspaceStatus === "loading" ? (
              <WorkspaceLoading />
            ) : workspaceStatus === "error" ? (
              <WorkspaceError
                issue={workspaceIssue}
                onRetry={() => void loadWorkspace(activeCompany)}
              />
            ) : (
              <>
                {activeCompany.role === "admin" && (
                  <MembersWorkspace
                    key={activeCompany.companyId}
                    members={members}
                    operation={effectiveOperation}
                    onUpsert={handleUpsertMember}
                    onChangeRole={handleChangeMemberRole}
                    onRemove={handleRemoveMember}
                  />
                )}

                {activeCompany.role === "viewer" ? (
                  <ViewerBoundary />
                ) : (
                  <SourcesWorkspace
                    company={activeCompany}
                    files={files}
                    readyFiles={readyFiles}
                    selectedFileIds={selectedFileIds}
                    period={period}
                    autoGenerate={autoGenerate}
                    localUploadQueue={localUploadQueue}
                    operation={effectiveOperation}
                    onUpload={handleUpload}
                    onUploadSelection={handleUploadSelection}
                    onDelete={handleDeleteFile}
                    onToggleSource={toggleSource}
                    onPeriodChange={setPeriod}
                    onAutoGenerateChange={setAutoGenerate}
                    onGenerate={handleGenerate}
                  />
                )}

                <ReportHistory
                  reports={reports}
                  activeReportId={activeReport?.report.id ?? null}
                  busy={effectiveOperation !== null}
                  opening={effectiveOperation === "open-report"}
                  onOpen={openReport}
                />

                <ReportWorkspace
                  company={activeCompany}
                  detail={activeReport}
                  metricHistory={activeMetricHistory}
                  loading={reportLoading}
                  operation={effectiveOperation}
                  approvalConfirmed={approvalConfirmed}
                  reviewFields={{
                    headline: reviewHeadline,
                    recommendation: reviewRecommendation,
                    rationale: reviewRationale,
                    nextAction: reviewNextAction,
                  }}
                  onReviewFieldChange={{
                    headline: setReviewHeadline,
                    recommendation: setReviewRecommendation,
                    rationale: setReviewRationale,
                    nextAction: setReviewNextAction,
                  }}
                  onReview={handleReview}
                  onApprovalConfirmed={setApprovalConfirmed}
                  onApprove={handleApprove}
                  onArchive={handleArchive}
                />

                {activeCompany.role === "admin" && (
                  <AuditLedger events={auditEvents} />
                )}
              </>
            )}
          </>
        ) : null}

        <footer className="ops-footer">
          <strong>Business Mission Control</strong>
          <span>
            Arquivos privados, geração protegida e aprovação humana antes do
            compartilhamento.
          </span>
        </footer>
      </section>
    </div>
  );
}

function SessionLoading() {
  return (
    <main
      className="mission-shell ops-shell ops-session-state"
      data-testid="session-loading"
    >
      <section className="ops-session-sheet" aria-busy="true">
        <span className="ops-kicker">Business Mission Control</span>
        <h1>Confirmando sua sessão e suas empresas.</h1>
        <div className="ops-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="sr-only" role="status">
          Carregando sessão.
        </p>
      </section>
    </main>
  );
}

function SessionError({ issue }: { issue: ApiIssue | null }) {
  const needsSignIn = issue?.code === "authentication_required";
  return (
    <main
      className="mission-shell ops-shell ops-session-state"
      data-testid="session-error"
    >
      <section className="ops-session-sheet ops-error-sheet" role="alert">
        <span className="ops-kicker">
          {needsSignIn ? "Sessão necessária" : "Acesso indisponível"}
        </span>
        <h1>
          {needsSignIn
            ? "Entre com o ChatGPT para continuar."
            : "Não foi possível abrir a mesa operacional."}
        </h1>
        <p>{issue?.message ?? "Recarregue a página e tente novamente."}</p>
        <a
          className="ops-button ops-button-primary"
          href={needsSignIn ? "/signin-with-chatgpt?return_to=%2F" : "/"}
        >
          {needsSignIn ? "Entrar com o ChatGPT" : "Tentar novamente"}
        </a>
      </section>
    </main>
  );
}

function CompanyEmptyState({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section
      className="ops-empty-stage"
      aria-labelledby="company-empty-title"
      data-testid="company-empty"
    >
      <div>
        <span className="ops-step-number">01</span>
        <h2 id="company-empty-title">Crie a primeira empresa.</h2>
        <p>
          As fontes e os relatórios ficarão separados dos demais ambientes, e
          você receberá inicialmente o papel de administrador. Para o curso,
          use somente o caso sintético da Lume.
        </p>
      </div>
      <form onSubmit={onSubmit} data-testid="company-create-form">
        <label htmlFor="company-name">
          Nome da empresa
          <input
            id="company-name"
            name="companyName"
            type="text"
            minLength={2}
            maxLength={160}
            placeholder="Lume Manutenção Comercial"
            autoComplete="organization"
            required
            data-testid="company-name-input"
          />
        </label>
        <small>
          Todos os dados usados no exercício devem permanecer sintéticos.
        </small>
        <button
          className="ops-button ops-button-primary"
          type="submit"
          disabled={busy}
          data-testid="company-create-submit"
        >
          {busy ? "Criando empresa…" : "Criar empresa"}
        </button>
      </form>
    </section>
  );
}

function WorkflowLedger({
  company,
  files,
  reports,
}: {
  company: CompanyMembership;
  files: StoredFile[];
  reports: ReportSummary[];
}) {
  const readyCount = files.filter((file) => file.status === "ready").length;
  const draftCount = reports.filter((report) => report.status === "draft").length;
  const approvedCount = reports.filter(
    (report) => report.status === "approved",
  ).length;

  return (
    <ol className="ops-flow-ledger" aria-label="Estado do fluxo">
      <li>
        <span>01 · Fontes</span>
        <strong>
          {company.role === "viewer"
            ? "Privadas"
            : `${readyCount} ${readyCount === 1 ? "pronta" : "prontas"}`}
        </strong>
      </li>
      <li>
        <span>02 · Revisão</span>
        <strong>{draftCount} em rascunho</strong>
      </li>
      <li>
        <span>03 · Aprovação</span>
        <strong>{formatCount(approvedCount, "aprovado", "aprovados")}</strong>
      </li>
      <li>
        <span>04 · Histórico</span>
        <strong>
          {formatCount(
            reports.length,
            "versão visível",
            "versões visíveis",
          )}
        </strong>
      </li>
    </ol>
  );
}

function WorkspaceLoading() {
  return (
    <section
      className="ops-loading-workspace"
      aria-busy="true"
      data-testid="workspace-loading"
    >
      <p className="sr-only" role="status">
        Carregando empresa.
      </p>
      {Array.from({ length: 4 }, (_, index) => (
        <div className="ops-skeleton-row" key={index} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ))}
    </section>
  );
}

function WorkspaceError({
  issue,
  onRetry,
}: {
  issue: ApiIssue | null;
  onRetry: () => void;
}) {
  const forbidden = issue?.code === "forbidden" || issue?.status === 403;
  return (
    <section
      className="ops-inline-state ops-inline-error"
      role="alert"
      data-testid={forbidden ? "workspace-forbidden" : "workspace-error"}
    >
      <span className="ops-step-number">{forbidden ? "403" : "!"}</span>
      <div>
        <h2>{forbidden ? "Sem permissão nesta empresa." : "Falha ao carregar a empresa."}</h2>
        <p>{issue?.message ?? "Tente novamente em alguns instantes."}</p>
      </div>
      {!forbidden && (
        <button className="ops-button ops-button-secondary" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </section>
  );
}

function ViewerBoundary() {
  return (
    <section className="ops-viewer-boundary" data-testid="viewer-boundary">
      <span className="ops-step-number">Leitura</span>
      <div>
        <h2>Seu acesso começa no relatório aprovado.</h2>
        <p>
          Arquivos privados, seleção de fontes, rascunhos e falhas permanecem
          restritos ao time de análise. O relatório mantém o registro
          rastreável das fontes sem permitir baixá-las.
        </p>
      </div>
    </section>
  );
}

function MembersWorkspace({
  members,
  operation,
  onUpsert,
  onChangeRole,
  onRemove,
}: {
  members: MemberRecord[];
  operation: Operation | null;
  onUpsert: (input: MemberInput) => Promise<boolean>;
  onChangeRole: (member: MemberRecord, role: MembershipRole) => Promise<boolean>;
  onRemove: (member: MemberRecord) => void;
}) {
  const [chatgptUserId, setChatgptUserId] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<MembershipRole>("analyst");
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const busy = operation !== null;

  function resetForm() {
    setChatgptUserId("");
    setEmail("");
    setDisplayName("");
    setRole("analyst");
    setEditingMember(null);
  }

  function editMember(member: MemberRecord) {
    setRole(member.role);
    setEditingMember(member);
    document.getElementById("member-role")?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingMember) {
      const saved = await onChangeRole(editingMember, role);
      if (saved) resetForm();
      return;
    }
    const saved = await onUpsert({
      chatgptUserId: chatgptUserId.trim(),
      email: email.trim(),
      displayName: displayName.trim(),
      role,
    });
    if (saved) resetForm();
  }

  return (
    <section
      className="ops-section ops-members-section"
      id="membros"
      aria-labelledby="members-title"
      data-testid="members-section"
    >
      <div className="ops-section-heading">
        <div>
          <span className="ops-step-number">Acesso interno</span>
          <h2 id="members-title">Equipe e papéis</h2>
          <p>
            Administradores gerenciam os membros. Analistas trabalham com
            fontes e rascunhos; o perfil de leitura consulta somente relatórios
            aprovados.
          </p>
        </div>
        <strong className="ops-history-count">
          {members.length} {members.length === 1 ? "membro" : "membros"}
        </strong>
      </div>

      <form
        className="ops-member-form"
        onSubmit={handleSubmit}
        data-testid="member-form"
      >
        {editingMember ? (
          <p className="ops-member-helper">
            Alterando o papel de <strong>{editingMember.displayName}</strong>. A
            identidade original não é enviada para o navegador.
          </p>
        ) : (
          <>
            <label htmlFor="member-user-id">
              ID autenticado do ChatGPT
              <input
                id="member-user-id"
                value={chatgptUserId}
                onChange={(event) => setChatgptUserId(event.target.value)}
                required
                maxLength={256}
                autoComplete="off"
                data-testid="member-user-id"
              />
            </label>
            <label htmlFor="member-email">
              E-mail de convite
              <input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={320}
                autoComplete="email"
                data-testid="member-email"
              />
            </label>
            <label htmlFor="member-name">
              Nome exibido
              <input
                id="member-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                maxLength={200}
                autoComplete="name"
                data-testid="member-name"
              />
            </label>
          </>
        )}
        <label htmlFor="member-role">
          Papel na empresa
          <select
            id="member-role"
            value={role}
            onChange={(event) => setRole(event.target.value as MembershipRole)}
            data-testid="member-role"
          >
            <option value="admin">Administrador</option>
            <option value="analyst">Analista</option>
            <option value="viewer">Leitura</option>
          </select>
        </label>
        <div className="ops-member-form-actions">
          <button
            className="ops-button ops-button-primary"
            type="submit"
            disabled={busy}
            data-testid="member-submit"
          >
            {operation === "upsert-member"
              ? "Salvando papel…"
              : operation === "change-member-role"
                ? "Atualizando papel…"
                : editingMember
                ? "Atualizar membro"
                : "Adicionar membro"}
          </button>
          {editingMember && (
            <button
              className="ops-text-button"
              type="button"
              disabled={busy}
              onClick={resetForm}
            >
              Cancelar edição
            </button>
          )}
        </div>
        <small className="ops-member-helper">
          Identidades já cadastradas aparecem de forma pseudonimizada; dados reais
          permanecem protegidos no servidor. A empresa sempre mantém pelo menos
          um administrador.
        </small>
      </form>

      <div className="ops-member-list" role="list" aria-label="Membros da empresa">
        {members.map((member) => (
          <article
            className="ops-member-row"
            role="listitem"
            key={member.id}
            data-editing={editingMember?.id === member.id}
            data-testid={`member-row-${member.id}`}
          >
            <div className="ops-member-identity">
              <strong>{member.displayName}</strong>
              <span>{member.email}</span>
              <code>{member.chatgptUserId}</code>
            </div>
            <span className="ops-status" data-status={member.role}>
              {roleLabels[member.role]}
            </span>
            <small>Atualizado em {formatDateTime(member.updatedAt)}</small>
            <div className="ops-row-actions">
              <button
                className="ops-text-button"
                type="button"
                disabled={busy}
                onClick={() => editMember(member)}
                data-testid={`member-edit-${member.id}`}
              >
                Alterar papel
              </button>
              <button
                className="ops-text-button"
                type="button"
                disabled={busy}
                onClick={() => onRemove(member)}
                data-testid={`member-remove-${member.id}`}
              >
                Remover
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type SourcesWorkspaceProps = {
  company: CompanyMembership;
  files: StoredFile[];
  readyFiles: StoredFile[];
  selectedFileIds: string[];
  period: string;
  autoGenerate: boolean;
  localUploadQueue: LocalUploadItem[];
  operation: Operation | null;
  onUpload: (event: FormEvent<HTMLFormElement>) => void;
  onUploadSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (file: StoredFile) => void;
  onToggleSource: (fileId: string) => void;
  onPeriodChange: (value: string) => void;
  onAutoGenerateChange: (value: boolean) => void;
  onGenerate: (event: FormEvent<HTMLFormElement>) => void;
};

function SourcesWorkspace({
  company,
  files,
  readyFiles,
  selectedFileIds,
  period,
  autoGenerate,
  localUploadQueue,
  operation,
  onUpload,
  onUploadSelection,
  onDelete,
  onToggleSource,
  onPeriodChange,
  onAutoGenerateChange,
  onGenerate,
}: SourcesWorkspaceProps) {
  const busy = operation !== null;
  return (
    <section className="ops-section" id="fontes" aria-labelledby="files-title">
      <div className="ops-section-heading">
        <div>
          <span className="ops-step-number">01</span>
          <h2 id="files-title">Preparar fontes privadas</h2>
          <p>
            Selecione até 10 arquivos Markdown ou Excel de uma vez. Cada arquivo
            pode ter até 10 MB e o lote, até 25 MB.
          </p>
        </div>
        <form
          className="ops-upload-form"
          onSubmit={onUpload}
          data-testid="file-upload-form"
        >
          <label htmlFor="source-files">
            Selecionar arquivos
            <input
              id="source-files"
              name="files"
              type="file"
              multiple
              accept=".md,.xlsx,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              disabled={busy || files.length >= 10}
              onChange={onUploadSelection}
              data-testid="file-input"
            />
          </label>
          <label htmlFor="report-period">
            Período da análise
            <input
              id="report-period"
              type="month"
              value={period}
              onChange={(event) => onPeriodChange(event.target.value)}
              disabled={busy}
              required
              data-testid="report-period"
            />
          </label>
          <label className="ops-auto-generate" htmlFor="auto-generate-report">
            <input
              id="auto-generate-report"
              type="checkbox"
              checked={autoGenerate}
              onChange={(event) => onAutoGenerateChange(event.target.checked)}
              disabled={busy}
              data-testid="auto-generate-report"
            />
            Gerar rascunho quando todos os arquivos estiverem prontos
          </label>
          <button
            className="ops-button ops-button-secondary"
            type="submit"
            disabled={busy || files.length >= 10}
            data-testid="file-upload-submit"
          >
            {operation === "upload-file" ? "Processando lote…" : "Enviar arquivos"}
          </button>
        </form>
      </div>

      {localUploadQueue.length > 0 && (
        <div
          className="ops-local-upload-queue"
          aria-live="polite"
          aria-label="Fila local do envio atual"
          data-testid="local-upload-queue"
        >
          <span className="ops-kicker">Fila deste envio</span>
          <ul>
            {localUploadQueue.map((item) => (
              <li key={item.id} data-status={item.status}>
                <span>{item.name}</span>
                <small>{formatFileSize(item.size)}</small>
                <strong>
                  {item.status === "selected" && "Selecionado"}
                  {item.status === "uploading" && "Validando e armazenando"}
                  {item.status === "ready" && "Pronto"}
                  {item.status === "failed" && "Falhou"}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length === 0 ? (
        <div className="ops-inline-state" data-testid="file-empty">
          <span className="ops-step-number">0/10</span>
          <div>
            <h3>Nenhuma fonte adicionada.</h3>
            <p>
               Comece pelos quatro arquivos canônicos do kit Lume. O conteúdo
               fica privado e o relatório registra uma impressão digital de cada origem.
            </p>
          </div>
        </div>
      ) : (
        <div className="ops-file-list" role="list" data-testid="file-list">
          {files.map((file) => {
            const selected = selectedFileIds.includes(file.id);
            return (
              <article
                className="ops-file-row"
                role="listitem"
                key={file.id}
                data-ready={file.status === "ready"}
                data-selected={selected}
                data-testid={`file-row-${file.id}`}
              >
                <label className="ops-source-check">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={file.status !== "ready" || busy}
                    onChange={() => onToggleSource(file.id)}
                    data-testid={`file-source-${file.id}`}
                  />
                  <span className="sr-only">
                    Selecionar {file.originalName} como fonte
                  </span>
                </label>
                <div className="ops-file-copy">
                  <strong>{file.originalName}</strong>
                  <span>
                    {file.extension.toUpperCase()} · {formatFileSize(file.size)} · enviado por {file.uploadedByName}
                  </span>
                  {file.errorMessage && <small role="alert">{file.errorMessage}</small>}
                </div>
                <span className="ops-status" data-status={file.status}>
                  {fileStatusLabels[file.status]}
                </span>
                <div className="ops-row-actions">
                  <a
                    className="ops-text-link"
                    href={`/api/companies/${encodeURIComponent(company.companyId)}/files/${encodeURIComponent(file.id)}/download`}
                    data-testid={`file-download-${file.id}`}
                  >
                    Baixar
                  </a>
                  <button
                    className="ops-text-button"
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(file)}
                    data-testid={`file-delete-${file.id}`}
                  >
                    Remover
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <form
        className="ops-generation-form"
        onSubmit={onGenerate}
        data-testid="report-generate-form"
      >
        <div>
          <span className="ops-kicker">Fontes selecionadas</span>
          <strong data-testid="source-selection-count">
            {selectedFileIds.length} de {readyFiles.length}{" "}
            {readyFiles.length === 1 ? "pronta" : "prontas"}
          </strong>
          <small>
            A geração acontece no servidor e cria um rascunho, nunca uma
            aprovação automática.
          </small>
        </div>
        <button
          className="ops-button ops-button-primary"
          type="submit"
          disabled={busy || selectedFileIds.length === 0}
          data-testid="report-generate-submit"
        >
          {operation === "generate-report"
            ? "Gerando e validando…"
            : "Gerar rascunho"}
        </button>
      </form>
    </section>
  );
}

function ReportHistory({
  reports,
  activeReportId,
  busy,
  opening,
  onOpen,
}: {
  reports: ReportSummary[];
  activeReportId: string | null;
  busy: boolean;
  opening: boolean;
  onOpen: (reportId: string) => void;
}) {
  return (
    <section
      className="ops-section ops-history-section"
      id="historico"
      aria-labelledby="history-title"
    >
      <div className="ops-section-heading">
        <div>
          <span className="ops-step-number">04</span>
          <h2 id="history-title">Histórico de relatórios</h2>
          <p>
            Cada versão preserva autor, estado, modelo, datas, horários e o
            rastro das fontes usadas.
          </p>
        </div>
        <strong className="ops-history-count">
          {formatCount(reports.length, "versão", "versões")}
        </strong>
      </div>

      {reports.length === 0 ? (
        <div className="ops-inline-state" data-testid="report-empty">
          <span className="ops-step-number">—</span>
          <div>
            <h3>Nenhum relatório visível.</h3>
            <p>
              Analistas geram rascunhos a partir das fontes; pessoas com perfil
              de leitura veem somente versões aprovadas.
            </p>
          </div>
        </div>
      ) : (
        <div className="ops-report-list" role="list" data-testid="report-history">
          {reports.map((report) => (
            <article
              role="listitem"
              className="ops-report-row"
              data-active={activeReportId === report.id}
              key={report.id}
              data-testid={`report-row-${report.id}`}
            >
              <div>
                <span className="ops-report-id">{report.id.slice(0, 16)}</span>
                <strong>{reportTitle(report)}</strong>
                <small>
                  {report.createdByName} · {report.model} · atualizado em {formatDateTime(report.updatedAt)}
                </small>
                {report.generationError && (
                  <p className="ops-row-error">{report.generationError}</p>
                )}
              </div>
              <span
                className="ops-status"
                data-status={report.status}
                data-testid={`report-status-${report.id}`}
              >
                {reportStatusLabels[report.status]}
              </span>
              <button
                className="ops-button ops-button-secondary"
                type="button"
                disabled={
                  busy ||
                  opening ||
                  report.status === "failed" ||
                  report.status === "generating"
                }
                onClick={() => onOpen(report.id)}
                data-testid={`report-open-${report.id}`}
              >
                {activeReportId === report.id ? "Aberto" : "Abrir relatório"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type ReviewFields = {
  headline: string;
  recommendation: string;
  rationale: string;
  nextAction: string;
};

type ReviewFieldSetters = {
  [Key in keyof ReviewFields]: (value: string) => void;
};

function ReportWorkspace({
  company,
  detail,
  metricHistory,
  loading,
  operation,
  approvalConfirmed,
  reviewFields,
  onReviewFieldChange,
  onReview,
  onApprovalConfirmed,
  onApprove,
  onArchive,
}: {
  company: CompanyMembership;
  detail: ReportDetail | null;
  metricHistory: MetricHistoryResponse | null;
  loading: boolean;
  operation: Operation | null;
  approvalConfirmed: boolean;
  reviewFields: ReviewFields;
  onReviewFieldChange: ReviewFieldSetters;
  onReview: (event: FormEvent<HTMLFormElement>) => void;
  onApprovalConfirmed: (confirmed: boolean) => void;
  onApprove: () => void;
  onArchive: () => void;
}) {
  const busy = operation !== null;

  if (loading) {
    return (
      <section
        className="ops-section ops-report-workspace"
        id="relatorio-ativo"
        aria-busy="true"
        data-testid="report-loading"
      >
        <div className="ops-skeleton ops-report-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="sr-only" role="status">
          Abrindo relatório.
        </p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section
        className="ops-section ops-report-workspace"
        id="relatorio-ativo"
        data-testid="report-not-selected"
      >
        <div className="ops-inline-state">
          <span className="ops-step-number">02</span>
          <div>
            <h2>Abra uma versão para conferir o rastro completo.</h2>
            <p>
              O dossiê mostra resumo, gargalos, oportunidades, métricas,
              limitações e registros das fontes no mesmo contexto.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const { report, sources } = detail;
  const editable =
    report.status === "draft" && company.role !== "viewer" && report.payload;
  const approvable = report.status === "draft" && company.role === "admin";
  const archivable =
    company.role === "admin" &&
    (report.status === "draft" || report.status === "approved");

  return (
    <section
      className="ops-report-workspace"
      id="relatorio-ativo"
      aria-labelledby="active-report-title"
      data-testid="report-detail"
    >
      <header className="ops-report-toolbar">
        <div>
          <span className="ops-step-number">02–03</span>
          <h2 id="active-report-title">Revisar antes de decidir</h2>
          <p>
            {reportTitle(report)} · {report.createdByName} · {sources.length}{" "}
            {sources.length === 1
              ? "registro de fonte"
              : "registros de fontes"}
          </p>
        </div>
        <div className="ops-report-toolbar-actions">
          <span className="ops-status" data-status={report.status}>
            {reportStatusLabels[report.status]}
          </span>
          {archivable && (
            <button
              className="ops-text-button"
              type="button"
              disabled={busy}
              onClick={onArchive}
              data-testid="report-archive-submit"
            >
              {operation === "archive-report" ? "Arquivando…" : "Arquivar"}
            </button>
          )}
        </div>
      </header>

      {editable && (
        <form
          className="ops-review-form"
          onSubmit={onReview}
          data-testid="report-review-form"
        >
          <div className="ops-review-intro">
            <span className="ops-kicker">Revisão humana</span>
            <h3>Editar resumo executivo</h3>
            <p>
              Ao salvar, o servidor valida o resumo e preserva fontes,
              pontuações e limitações do mesmo rascunho.
            </p>
          </div>
          <div className="ops-review-fields">
            <label htmlFor="review-headline">
              Título executivo
              <input
                id="review-headline"
                value={reviewFields.headline}
                onChange={(event) => onReviewFieldChange.headline(event.target.value)}
                required
                data-testid="review-headline"
              />
            </label>
            <label htmlFor="review-recommendation">
              Recomendação
              <textarea
                id="review-recommendation"
                value={reviewFields.recommendation}
                onChange={(event) =>
                  onReviewFieldChange.recommendation(event.target.value)
                }
                rows={3}
                required
                data-testid="review-recommendation"
              />
            </label>
            <label htmlFor="review-rationale">
              Fundamentação
              <textarea
                id="review-rationale"
                value={reviewFields.rationale}
                onChange={(event) => onReviewFieldChange.rationale(event.target.value)}
                rows={4}
                required
                data-testid="review-rationale"
              />
            </label>
            <label htmlFor="review-next-action">
              Próxima ação
              <textarea
                id="review-next-action"
                value={reviewFields.nextAction}
                onChange={(event) => onReviewFieldChange.nextAction(event.target.value)}
                rows={3}
                required
                data-testid="review-next-action"
              />
            </label>
            <button
              className="ops-button ops-button-secondary"
              type="submit"
              disabled={busy}
              data-testid="report-review-submit"
            >
              {operation === "review-report" ? "Validando revisão…" : "Salvar revisão"}
            </button>
          </div>
        </form>
      )}

      {approvable && (
        <div className="ops-approval-panel" data-testid="approval-panel">
          <div>
            <span className="ops-kicker">Decisão exclusiva do administrador</span>
            <h3>Aprovar versão imutável</h3>
            <p>
              Confirme que revisou evidências, inferências, hipóteses,
              limitações e o plano. Correções futuras exigirão outra versão.
            </p>
          </div>
          <label className="ops-approval-check">
            <input
              type="checkbox"
              checked={approvalConfirmed}
              onChange={(event) => onApprovalConfirmed(event.target.checked)}
              data-testid="report-approve-confirm"
            />
            Revisei o relatório e assumo a decisão de aprovação.
          </label>
          <button
            className="ops-button ops-button-primary"
            type="button"
            disabled={busy || !approvalConfirmed}
            onClick={onApprove}
            data-testid="report-approve-submit"
          >
            {operation === "approve-report" ? "Aprovando…" : "Aprovar relatório"}
          </button>
        </div>
      )}

      {company.role === "analyst" && report.status === "draft" && (
        <p className="ops-permission-note" data-testid="analyst-approval-boundary">
          Como analista, você pode revisar este rascunho. A aprovação permanece
          reservada a um administrador.
        </p>
      )}

      {report.payload ? (
        <ReportDashboard
          report={report.payload}
          sources={sources}
          status={report.status}
          metricHistory={metricHistory}
        />
      ) : (
        <div className="ops-inline-state ops-inline-error" role="alert">
          <span className="ops-step-number">!</span>
          <div>
            <h3>Esta versão não possui conteúdo estruturado validado.</h3>
            <p>
              {report.generationError ??
                "Consulte o histórico e gere uma nova análise a partir das fontes prontas."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function closeContainingDetails(event: React.MouseEvent<HTMLAnchorElement>) {
  event.currentTarget.closest("details")?.removeAttribute("open");
}

function AuditLedger({ events }: { events: AuditEvent[] }) {
  return (
    <section
      className="ops-section ops-audit-section"
      id="auditoria"
      aria-labelledby="audit-title"
      data-testid="audit-log"
    >
      <div className="ops-section-heading">
        <div>
          <span className="ops-step-number">Registro</span>
          <h2 id="audit-title">Auditoria da empresa</h2>
          <p>
            Eventos sensíveis permanecem em um registro somente por acréscimo,
            sem armazenar o conteúdo integral dos arquivos.
          </p>
        </div>
        <strong className="ops-history-count">
          {formatCount(events.length, "evento", "eventos")}
        </strong>
      </div>

      {events.length === 0 ? (
        <div className="ops-inline-state">
          <span className="ops-step-number">—</span>
          <div>
            <h3>Nenhum evento registrado.</h3>
            <p>As ações operacionais aparecerão aqui em ordem cronológica.</p>
          </div>
        </div>
      ) : (
        <ol className="ops-audit-list">
          {events.map((event) => (
            <li key={event.id}>
              <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
              <strong>{auditActionLabels[event.action] ?? event.action}</strong>
              <span>{event.actorName}</span>
              <code>{event.entityType} · {event.entityId.slice(0, 18)}</code>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ActionFeedback({
  issue,
  notice,
}: {
  issue: ApiIssue | null;
  notice: string | null;
}) {
  if (!issue && !notice) return null;
  return (
    <div
      className={`ops-feedback ${issue ? "ops-feedback-error" : "ops-feedback-success"}`}
      role={issue ? "alert" : "status"}
      aria-live="polite"
      data-testid={issue ? "action-error" : "action-success"}
    >
      <strong>{issue ? "A ação não foi concluída." : "Etapa concluída."}</strong>
      <span>{issue?.message ?? notice}</span>
    </div>
  );
}

export default MissionControlApp;
