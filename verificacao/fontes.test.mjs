// Adapted from BMC commit 535cf883: same baseline assertions, numbered learner filenames.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import { excelSerialToDate, readXlsx } from "./helpers/xlsx-reader.mjs";

const kitDirectory = new URL("../projeto-inicial/", import.meta.url);

const expectedFiles = [
  "README.md",
  "02-atendimento_e_propostas_maio.xlsx",
  "01-briefing_da_empresa.md",
  "checklist_validacao_publicacao.md",
  "criterios_de_aceite.md",
  "04-feedbacks_e_rotina_maio.md",
  "mapa_logico_inicial.md",
  "metas_e_indicadores.md",
  "03-ordens_de_servico_maio.xlsx",
  "prompt_base_planejamento.md",
].sort();

const expectedPeriods = [
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
];

function historyRows(series, fields) {
  return series.map((row, index) => ({
    periodo: expectedPeriods[index],
    ...Object.fromEntries(fields.map((field, fieldIndex) => [field, row[fieldIndex]])),
  }));
}

const attendanceHistorySchema = [
  ["periodo", "month"],
  ["volume_propostas", "count"],
  ["mediana_primeira_resposta_min", "min"],
  ["propostas_sem_followup_5d", "count"],
  ["tempo_medio_preparo_min", "min"],
  ["estimativa_preparo_h", "h"],
];

const expectedAttendanceHistory = historyRows([
  [124, 286, 39, 15, 31],
  [122, 278, 37, 15, 30.5],
  [120, 291, 41, 16, 32],
  [123, 275, 36, 15, 30.8],
  [126, 267, 35, 14, 29.4],
  [125, 272, 34, 14, 29.2],
  [125, 258, 33, 14, 29.2],
  [128, 263, 35, 13, 27.7],
  [125, 249, 31, 13, 27.1],
  [123, 242, 30, 13, 26.6],
  [129, 235, 29, 12, 25.8],
  [126, 228, 28, 12, 25.2],
], attendanceHistorySchema.slice(1).map(([field]) => field));

const operationsHistorySchema = [
  ["periodo", "month"],
  ["visitas", "count"],
  ["mudancas_agenda", "count"],
  ["tempo_ajuste_min", "min"],
  ["ordens_incompletas", "count"],
  ["atendimentos_concluidos", "count"],
  ["retornos", "count"],
];

const expectedOperationsHistory = historyRows([
  [118, 21, 960, 31, 101, 13],
  [121, 19, 875, 29, 105, 12],
  [116, 24, 1_120, 34, 96, 15],
  [125, 22, 1_015, 30, 110, 14],
  [127, 20, 940, 28, 112, 12],
  [130, 23, 1_085, 32, 113, 14],
  [124, 25, 1_210, 30, 108, 16],
  [132, 22, 1_030, 29, 116, 13],
  [129, 24, 1_160, 31, 113, 15],
  [134, 21, 995, 28, 118, 13],
  [136, 22, 1_060, 26, 120, 14],
  [138, 23, 1_140, 27, 121, 14],
], operationsHistorySchema.slice(1).map(([field]) => field));

const feedbackHistorySchema = [
  ["periodo", "month"],
  ["conversas_categorizadas", "count"],
  ["conversas_status_documentos", "count"],
  ["mensagens_sem_revisao", "count"],
];

const expectedFeedbackHistory = historyRows([
  [84, 39, 0],
  [87, 40, 0],
  [82, 38, 0],
  [90, 41, 0],
  [91, 42, 0],
  [89, 40, 0],
  [92, 43, 0],
  [94, 41, 0],
  [91, 42, 0],
  [95, 44, 0],
  [93, 41, 0],
  [96, 42, 0],
], feedbackHistorySchema.slice(1).map(([field]) => field));

function values(records) {
  return records.map((record) => record.values);
}

function median(numbers) {
  const ordered = [...numbers].sort((left, right) => left - right);
  assert.equal(ordered.length % 2, 0, "a mediana canônica usa uma série par");
  return (ordered[ordered.length / 2 - 1] + ordered[ordered.length / 2]) / 2;
}

function isBlank(value) {
  return value === null || value === undefined || value === "";
}

function isTrue(value) {
  return value === true || value === 1;
}

function assertMay2026(serial, label) {
  const date = excelSerialToDate(serial);
  assert.equal(date.getUTCFullYear(), 2026, `${label}: ano`);
  assert.equal(date.getUTCMonth(), 4, `${label}: mês`);
}

function assertUnique(records, field) {
  const identifiers = records.map((record) => record[field]);
  assert.equal(new Set(identifiers).size, identifiers.length, `${field} deve ser único`);
}

function assertMonthlyHistory(records, schema, expected, label) {
  const history = values(records);
  const keys = schema.map(([key]) => key);
  assert.equal(history.length, 12, `${label}: deve conter 12 períodos`);
  assert.deepEqual(history.map((row) => row.periodo), expectedPeriods, `${label}: períodos`);
  assertUnique(history, "periodo");

  for (const [index, row] of history.entries()) {
    assert.deepEqual(Object.keys(row), keys, `${label} linha ${index + 2}: chaves e ordem`);
    for (const [key, unit] of schema.slice(1)) {
      assert.ok(Number.isFinite(row[key]), `${label} ${row.periodo}: ${key} deve ser finito`);
      if (unit === "count" || unit === "min") {
        assert.ok(Number.isSafeInteger(row[key]), `${label} ${row.periodo}: ${key} deve usar ${unit} inteiro`);
      } else {
        assert.equal(unit, "h", `${label}: unidade não reconhecida para ${key}`);
      }
      assert.ok(row[key] >= 0, `${label} ${row.periodo}: ${key} não pode ser negativo`);
    }
  }
  assert.deepEqual(history, expected, `${label}: valores canônicos`);
  return history;
}

function feedbackMonthlyHistory(markdown) {
  const section = /## Histórico mensal consolidado([\s\S]*?)(?=\n## )/.exec(markdown)?.[1];
  assert.ok(section, "F04: seção de histórico mensal ausente");
  assert.ok(
    section.includes("| periodo | conversas_categorizadas | conversas_status_documentos | mensagens_sem_revisao |"),
    "F04: chaves do histórico mensal",
  );
  return [...section.matchAll(/^\| (\d{4}-\d{2}) \| (\d+) \| (\d+) \| (\d+) \|$/gm)]
    .map((match) => ({
      periodo: match[1],
      conversas_categorizadas: Number(match[2]),
      conversas_status_documentos: Number(match[3]),
      mensagens_sem_revisao: Number(match[4]),
    }));
}

test("the canonical Lume kit contains exactly the ten approved artifacts", async () => {
  const entries = await readdir(kitDirectory, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  assert.deepEqual(files, expectedFiles);

  const readme = await readFile(new URL("README.md", kitDirectory), "utf8");
  assert.match(readme, /inteiramente fictícia/i);
  assert.match(readme, /histórico mensal agregado: junho de 2025 a maio de 2026/i);
  assert.match(readme, /selecione os quatro arquivos `01–04` em uma única ação/i);
  assert.match(readme, /maio de 2026/i);
});

test("attendance and proposals metrics are recalculated from source cells", async () => {
  const workbook = await readXlsx(new URL("02-atendimento_e_propostas_maio.xlsx", kitDirectory));
  assert.deepEqual([...workbook.sheets.keys()], ["contatos", "propostas", "dicionario", "historico_mensal"]);

  const contacts = values(workbook.sheets.get("contatos").records);
  assert.equal(contacts.length, 214);
  assertUnique(contacts, "contato_id");

  const responseTimes = contacts.map((contact, index) => {
    assertMay2026(contact.recebido_em, `contatos linha ${index + 2} recebido_em`);
    assertMay2026(contact.primeira_resposta_em, `contatos linha ${index + 2} primeira_resposta_em`);
    const recalculated = Math.round(
      (contact.primeira_resposta_em - contact.recebido_em) * 1_440,
    );
    assert.equal(contact.tempo_primeira_resposta_min, recalculated);
    assert.equal(isTrue(contact.acima_4h), recalculated > 240);
    const complete = !isBlank(contact.cliente_ref)
      && !isBlank(contact.tipo_servico)
      && !isBlank(contact.regiao);
    assert.equal(isTrue(contact.cadastro_completo), complete);
    return recalculated;
  });

  assert.equal(median(responseTimes), 228);
  assert.equal(responseTimes.filter((minutes) => minutes > 240).length, 62);
  assert.equal(responseTimes.filter((minutes) => minutes === 240).length, 3);
  assert.equal(contacts.filter((contact) => !isTrue(contact.cadastro_completo)).length, 81);

  const proposals = values(workbook.sheets.get("propostas").records);
  assert.equal(proposals.length, 126);
  assertUnique(proposals, "proposta_id");
  const measuredPreparation = proposals
    .map((proposal) => proposal.tempo_preparo_min)
    .filter((value) => !isBlank(value));
  assert.equal(measuredPreparation.length, 21);
  const averagePreparationMinutes =
    measuredPreparation.reduce((total, minutes) => total + minutes, 0)
      / measuredPreparation.length;
  assert.equal(averagePreparationMinutes, 12);

  let withoutFollowUp = 0;
  for (const [index, proposal] of proposals.entries()) {
    assertMay2026(proposal.criada_em, `propostas linha ${index + 2} criada_em`);
    assertMay2026(proposal.enviada_em, `propostas linha ${index + 2} enviada_em`);
    if (!isBlank(proposal.ultimo_follow_up_em)) {
      assertMay2026(proposal.ultimo_follow_up_em, `propostas linha ${index + 2} follow_up`);
    }
    const ageAtCutoff = Math.max(0, Math.floor(46_173 - proposal.criada_em));
    assert.equal(proposal.dias_em_aberto_no_corte, ageAtCutoff);
    const stale = ageAtCutoff >= 5 && isBlank(proposal.ultimo_follow_up_em);
    assert.equal(isTrue(proposal.sem_follow_up_apos_5_dias), stale);
    if (stale) withoutFollowUp += 1;
    assert.equal(isTrue(proposal.revisada_por_humano), true);
  }
  assert.equal(withoutFollowUp, 28);
  const estimatedPreparationHours = (proposals.length * averagePreparationMinutes) / 60;
  assert.equal(estimatedPreparationHours, 25.2);

  const history = assertMonthlyHistory(
    workbook.sheets.get("historico_mensal").records,
    attendanceHistorySchema,
    expectedAttendanceHistory,
    "F02 historico_mensal",
  );
  const may = history.at(-1);
  assert.equal(may.volume_propostas, proposals.length, "F02 maio: volume de propostas");
  assert.equal(may.mediana_primeira_resposta_min, median(responseTimes), "F02 maio: mediana");
  assert.equal(may.propostas_sem_followup_5d, withoutFollowUp, "F02 maio: follow-up");
  assert.equal(may.tempo_medio_preparo_min, averagePreparationMinutes, "F02 maio: preparo");
  assert.equal(may.estimativa_preparo_h, estimatedPreparationHours, "F02 maio: estimativa");
});

test("orders and scheduling metrics are recalculated from source cells", async () => {
  const workbook = await readXlsx(new URL("03-ordens_de_servico_maio.xlsx", kitDirectory));
  assert.deepEqual([...workbook.sheets.keys()], ["ordens", "agenda", "dicionario", "historico_mensal"]);

  const orders = values(workbook.sheets.get("ordens").records);
  assert.equal(orders.length, 138);
  assertUnique(orders, "ordem_id");

  let incomplete = 0;
  let completed = 0;
  let completedWithReturn = 0;
  for (const [index, order] of orders.entries()) {
    assertMay2026(order.aberta_em, `ordens linha ${index + 2} aberta_em`);
    assertMay2026(order.visita_realizada_em, `ordens linha ${index + 2} visita_realizada_em`);
    const isComplete = !isBlank(order.equipamento_ref)
      && !isBlank(order.descricao_sintoma)
      && isTrue(order.contato_confirmado);
    const isCompleted = order.status === "Concluída";
    assert.equal(isTrue(order.ordem_completa), isComplete);
    assert.equal(isTrue(order.atendimento_concluido), isCompleted);
    assert.equal(isTrue(order.visita_realizada), true);
    if (!isComplete) incomplete += 1;
    if (isCompleted) completed += 1;
    if (isCompleted && isTrue(order.retorno_necessario)) completedWithReturn += 1;
    if (isTrue(order.retorno_necessario)) assert.equal(isCompleted, true);
  }
  assert.equal(incomplete, 27);
  assert.equal(completed, 121);
  assert.equal(completedWithReturn, 14);

  const schedule = values(workbook.sheets.get("agenda").records);
  assert.equal(schedule.length, 138);
  const changed = schedule.filter((entry) => isTrue(entry.houve_mudanca));
  assert.equal(changed.length, 23);
  const totalAdjustmentMinutes = changed.reduce((total, entry) => total + entry.tempo_ajuste_min, 0);
  assert.equal(totalAdjustmentMinutes, 1_140);
  assert.equal(totalAdjustmentMinutes / 60, 19);
  for (const [index, entry] of schedule.entries()) {
    assertMay2026(entry.data_original, `agenda linha ${index + 2} data_original`);
    assertMay2026(entry.data_final, `agenda linha ${index + 2} data_final`);
    assert.equal(isTrue(entry.aprovado_por_humano), true);
    if (!isTrue(entry.houve_mudanca)) {
      assert.equal(entry.tempo_ajuste_min, 0);
      assert.equal(entry.data_final, entry.data_original);
    }
  }

  const history = assertMonthlyHistory(
    workbook.sheets.get("historico_mensal").records,
    operationsHistorySchema,
    expectedOperationsHistory,
    "F03 historico_mensal",
  );
  const may = history.at(-1);
  assert.equal(may.visitas, orders.length, "F03 maio: visitas");
  assert.equal(may.mudancas_agenda, changed.length, "F03 maio: mudanças de agenda");
  assert.equal(may.tempo_ajuste_min, totalAdjustmentMinutes, "F03 maio: tempo de ajuste");
  assert.equal(may.ordens_incompletas, incomplete, "F03 maio: ordens incompletas");
  assert.equal(may.atendimentos_concluidos, completed, "F03 maio: atendimentos concluídos");
  assert.equal(may.retornos, completedWithReturn, "F03 maio: retornos");
});

test("the Markdown evidence agrees with the spreadsheet baselines", async () => {
  const feedback = await readFile(new URL("04-feedbacks_e_rotina_maio.md", kitDirectory), "utf8");
  const conversations = [...feedback.matchAll(/^\| (CV\d{3}) \| ([^|]+?) \| .*? \| (Sim|Não) \|$/gm)];
  assert.equal(conversations.length, 96);
  assert.equal(new Set(conversations.map((match) => match[1])).size, 96);
  const categoryCounts = conversations.reduce((counts, match) => {
    counts.set(match[2], (counts.get(match[2]) ?? 0) + 1);
    return counts;
  }, new Map());
  assert.deepEqual(Object.fromEntries(categoryCounts), {
    Status: 24,
    Documentos: 18,
    Orçamento: 18,
    Agendamento: 15,
    Técnico: 12,
    Geral: 9,
  });
  assert.equal((categoryCounts.get("Status") ?? 0) + (categoryCounts.get("Documentos") ?? 0), 42);
  const messagesWithoutReview = conversations.filter((match) => match[3] !== "Sim").length;
  assert.equal(messagesWithoutReview, 0);

  const feedbackHistory = feedbackMonthlyHistory(feedback);
  const history = assertMonthlyHistory(
    feedbackHistory.map((row, index) => ({ rowNumber: index + 2, values: row })),
    feedbackHistorySchema,
    expectedFeedbackHistory,
    "F04 histórico mensal",
  );
  const may = history.at(-1);
  assert.equal(may.conversas_categorizadas, conversations.length, "F04 maio: conversas");
  assert.equal(
    may.conversas_status_documentos,
    (categoryCounts.get("Status") ?? 0) + (categoryCounts.get("Documentos") ?? 0),
    "F04 maio: status e documentos",
  );
  assert.equal(may.mensagens_sem_revisao, messagesWithoutReview, "F04 maio: revisão humana");

  const preparationSample = [...feedback.matchAll(/^\| TM\d{2} \| (\d+) \| Sim \| Sim \|$/gm)]
    .map((match) => Number(match[1]));
  assert.equal(preparationSample.length, 21);
  assert.equal(
    preparationSample.reduce((total, minutes) => total + minutes, 0)
      / preparationSample.length,
    12,
  );
  assert.match(feedback, /126 propostas × 12 minutos = 1\.512 minutos/);
  assert.match(feedback, /As 25,2 horas são uma \*\*inferência de carga de trabalho\*\*/);

  const indicators = await readFile(new URL("metas_e_indicadores.md", kitDirectory), "utf8");
  for (const expected of [
    "| Contatos recebidos | 214 |",
    "| Mediana da primeira resposta | 3h48 |",
    "| Contatos acima de quatro horas | 62 |",
    "| Cadastros incompletos | 81 (38% arredondados) |",
    "| Propostas sem acompanhamento após cinco dias | 28 |",
    "| Estimativa mensal de preparo | 25,2 h |",
    "| Visitas registradas | 138 |",
    "| Mudanças de agenda | 23 |",
    "| Tempo de ajuste de agenda | 19 h |",
    "| Ordens incompletas | 27 |",
    "| Atendimentos concluídos | 121 |",
    "| Concluídos com visita de retorno | 14 |",
    "| Conversas categorizadas | 96 |",
    "| Conversas sobre status ou documentos | 42 |",
  ]) {
    assert.ok(indicators.includes(expected), `linha canônica ausente: ${expected}`);
  }
});
