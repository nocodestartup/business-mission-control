# Contexto inicial da empresa (briefing) — Lume Manutenção Comercial

> Caso educacional inteiramente sintético. Nenhuma informação deste arquivo descreve uma empresa ou pessoa real.

## Visão geral

A Lume Manutenção Comercial presta manutenção preventiva e corretiva para pequenos estabelecimentos comerciais. O exercício combina uma série mensal agregada de junho de 2025 a maio de 2026 com o detalhamento operacional de maio de 2026.

- Equipe total: 14 pessoas.
- Contratos recorrentes ativos: 56.
- Áreas envolvidas no fluxo: Atendimento, Comercial, Operação e Direção.
- Canais de entrada: formulário do Site, mensageria comercial, telefone e indicação.
- Serviços mais frequentes: elétrica leve, climatização, refrigeração comercial e pequenos reparos hidráulicos.

Os identificadores usados nas bases são sintéticos. Não há CPF, CNPJ, telefone, e-mail, endereço completo ou nome de pessoa.

## Indicadores do piloto

Estas definições permanecem iguais nos 12 meses. As metas orientam o teste e não representam resultado já alcançado.

| Chave do indicador | O que mede | Unidade | Meta de teste | Comparação |
|---|---|---|---:|---|
| `mediana_primeira_resposta_min` | Mediana entre a entrada do contato e a primeira resposta revisada. | minutos | 90 | menor ou igual |
| `propostas_sem_followup_5d` | Propostas com cinco ou mais dias e nenhum acompanhamento registrado. | propostas | 10 | menor ou igual |
| `tempo_medio_preparo_min` | Média do tempo de preparo do rascunho até a revisão. | minutos | 7 | menor ou igual |
| `mensagens_sem_revisao` | Mensagens externas enviadas sem conferência humana. | mensagens | 0 | igual |

O ponto de maio de 2026 deve coincidir com o valor recalculado nos dados detalhados. Se definição, unidade ou período mudar, a comparação deve ser interrompida e registrada como limitação.

## Estrutura de trabalho

| Frente | Composição sintética | Responsabilidade principal |
|---|---:|---|
| Atendimento | 3 pessoas | Receber contatos, reunir contexto e informar andamento. |
| Comercial | 2 pessoas | Preparar e acompanhar propostas aprovadas pela direção. |
| Operação | 7 pessoas | Planejar visitas, executar serviços e completar ordens. |
| Direção | 2 pessoas | Definir preço, capacidade, prioridade e regras do piloto. |

## Processo atual

### 1. Entrada e triagem

Os contatos chegam por canais diferentes. O Atendimento registra o pedido, identifica o estabelecimento por uma referência sintética e procura três campos mínimos: tipo de serviço, região e urgência informada. Quando algum campo não chega, a equipe precisa voltar à conversa antes de encaminhar o caso.

A primeira resposta é escrita manualmente. A equipe deseja reduzir a espera, mas não autoriza envio automático nem classificação definitiva sem conferência.

### 2. Proposta comercial

Quando existe contexto suficiente, o Comercial consulta modelos aprovados, prepara um rascunho e confirma escopo, preço e condição com a Direção. O acompanhamento das propostas é feito em uma fila manual e pode perder prioridade quando a operação está mais carregada.

Modelos podem ser usados para preparar rascunhos. Preço, desconto, prazo, promessa de disponibilidade e aceite comercial continuam sendo decisões humanas.

### 3. Ordem e visita

Depois do aceite, a Operação cria uma ordem de serviço e combina uma janela de visita. Equipamento, sintoma, região e confirmação do contato são informações mínimas para preparar a equipe. Uma ordem incompleta não deve ser tratada como pronta apenas porque possui uma data.

Mudanças de agenda afetam clientes e técnicos. O sistema pode apontar conflitos ou sugerir agrupamentos, mas não pode reagendar uma visita por conta própria.

### 4. Retorno e comunicação

O Atendimento responde dúvidas de status, solicita documentos ausentes e comunica previsões já confirmadas. Rascunhos padronizados podem reduzir repetição, desde que cada mensagem seja revisada antes do envio.

## Objetivos da Direção

1. Responder contatos com mais rapidez sem perder contexto.
2. Reduzir propostas abertas sem acompanhamento.
3. Diminuir retrabalho causado por ordens incompletas.
4. Tornar o custo de mudanças de agenda mais visível.
5. Testar assistência por IA em um piloto de 30 dias, com escopo estreito e métricas verificáveis.

## Limites de autonomia

A IA pode:

- organizar informações já fornecidas;
- sinalizar campos ausentes e casos incertos;
- preparar classificações e rascunhos;
- sugerir uma próxima ação para revisão;
- comparar indicadores conforme uma fórmula previamente aprovada.

Uma pessoa sempre:

- confirma preço, desconto e condição comercial;
- aprova a data ou qualquer alteração de agenda;
- revisa mensagens antes do envio;
- valida o diagnóstico contra as fontes;
- aprova, arquiva ou compartilha um relatório;
- decide ampliar, ajustar ou interromper o piloto.

## Decisões proibidas para automação

- enviar mensagem externa sem revisão;
- criar ou alterar preço;
- confirmar promessa de prazo ou disponibilidade;
- reagendar visita;
- avaliar desempenho individual;
- dispensar conferência técnica;
- apresentar hipótese como resultado alcançado.

## Critério inicial do piloto

O piloto deve começar por tarefas reversíveis e verificáveis. Toda recomendação precisa mostrar fonte, classificação analítica, hipótese e próxima ação. Conflito ou ausência de evidência deve aparecer como limitação, nunca ser preenchido por plausibilidade.
