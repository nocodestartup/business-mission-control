# Metas e indicadores — Lume Manutenção Comercial

> As linhas de base abaixo pertencem ao caso sintético de maio de 2026. As quatro métricas principais também possuem série observada de junho de 2025 a maio de 2026 nas fontes F02 e F04. Metas são hipóteses de teste; não representam resultado alcançado nem promessa de retorno.

## Linhas de base observáveis

| Indicador | Linha de base | Fonte | Regra de cálculo |
|---|---:|---|---|
| Contatos recebidos | 214 | F02 | Quantidade de linhas válidas em `contatos`. |
| Mediana da primeira resposta | 3h48 | F02 | Mediana de `tempo_primeira_resposta_min`, convertida para horas e minutos. |
| Contatos acima de quatro horas | 62 | F02 | `tempo_primeira_resposta_min > 240`. |
| Cadastros incompletos | 81 (38% arredondados) | F02 | Falta em cliente, tipo de serviço ou região; percentual `81 / 214`. |
| Propostas sem acompanhamento após cinco dias | 28 | F02 | Cinco ou mais dias no corte e nenhum acompanhamento registrado. |
| Tempo médio de preparo de proposta | 12 min | F02/F04 | Média das medições sintéticas de preparo. |
| Estimativa mensal de preparo | 25,2 h | F02/F04 | `126 propostas × 12 min ÷ 60`; inferência, não apontamento individual. |
| Visitas registradas | 138 | F03 | Quantidade de ordens com visita planejada no recorte. |
| Mudanças de agenda | 23 | F03 | Linhas de agenda com `houve_mudanca = verdadeiro`. |
| Tempo de ajuste de agenda | 19 h | F03 | Soma de `tempo_ajuste_min ÷ 60`. |
| Ordens incompletas | 27 | F03 | Falta em equipamento, sintoma ou confirmação do contato. |
| Atendimentos concluídos | 121 | F03 | Ordens com status `Concluída`. |
| Concluídos com visita de retorno | 14 | F03 | Concluída e `retorno_necessario = verdadeiro`. |
| Conversas categorizadas | 96 | F04 | Quantidade de linhas da amostra de conversas. |
| Conversas sobre status ou documentos | 42 | F04 | Soma das categorias `Status` e `Documentos`. |
| Mensagens sem revisão humana | 0 | F01/F04 | Regra operacional e conferência da coluna de revisão. |

## Contrato dos quatro indicadores-chave (KPIs)

| Chave canônica | Unidade | Base em 2026-05 | Meta | Comparador | Série sustentada pelas fontes |
|---|---|---:|---:|---|---|
| `mediana_primeira_resposta_min` | min | 228 | 90 | `lte` | F02 `historico_mensal` |
| `propostas_sem_followup_5d` | propostas | 28 | 10 | `lte` | F02 `historico_mensal` |
| `tempo_medio_preparo_min` | min | 12 | 7 | `lte` | F02 `historico_mensal` |
| `mensagens_sem_revisao` | mensagens | 0 | 0 | `eq` | F04 `Histórico mensal consolidado` |

Cada série possui 12 períodos consecutivos. O ponto de maio deve ser idêntico à linha de base recalculada nos dados detalhados; não combine unidades ou definições diferentes.

## Hipóteses de meta para o piloto

| Indicador | Base | Meta de teste | Classificação |
|---|---:|---:|---|
| Primeira resposta | 3h48 | até 1h30 | Hipótese |
| Propostas sem acompanhamento | 28 | até 10 | Hipótese |
| Preparo de proposta | 12 min | até 7 min | Hipótese |
| Envios sem revisão | 0 | permanecer 0 | Regra |

Uma meta só vira resultado quando o período posterior é medido com a mesma definição. Redução aparente causada por mudança de regra, amostra ou período deve ser registrada como limitação.

## Fórmula de prioridade

```text
prioridade = impacto + velocidade + (6 - esforço) + (6 - risco)
```

- Cada dimensão usa escala de 1 a 5.
- A pontuação total vai de 4 a 20.
- Empates favorecem o menor risco.
- A fórmula organiza testes; não prevê economia, receita ou causalidade.
- Impacto, esforço, risco e velocidade devem ser justificados no relatório.

## Regra de qualidade

Nenhuma afirmação factual pode ficar sem um identificador de fonte (`sourceId`). Se a evidência não for suficiente, registre a limitação e uma pergunta de validação. Não complete o dado por plausibilidade.
