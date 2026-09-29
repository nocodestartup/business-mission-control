# Verificação da distribuição v1.0.0

**Data: 28/09/2026. Veredito: pacote local pronto para revisão humana e publicação no GitHub no destino autorizado, com os limites abaixo.** Nenhum repositório remoto, tag, release, Site ou acesso foi criado ou alterado nesta preparação.

## O que foi entregue

- 22 aulas, incluindo M4 com navegação corrigida na cópia distribuída.
- Dez arquivos do kit inicial; prompt-base, critérios de aceite e checklist adaptados ao Site estático.
- Modelos de handoff e validação, sem respostas preenchidas ou skill pré-instalada.
- Pacote visual do M7, com capturas, código de referência e fontes/licenças.
- Exemplo concluído separado, com planejamento reconstruído e análise consolidada sem dependência de conversas privadas.
- Metadados de repositório, versão 1.0.0, notas da release, testes portáveis, inventário e empacotador.

O conteúdo do Desktop e os materiais originais do curso foram preservados. A exportação copiou somente os itens previstos. Ficaram fora histórico Git, configuração do Sites, recibos de publicação, identificação de contas, backups e rodadas intermediárias de validação.

## Conteúdo, fontes e integridade

As quatro fontes oficiais vieram do kit versionado do curso. A comparação das duas planilhas com as usadas no exemplo verificou todas as abas, coordenadas, tipos, valores e fórmulas/caches: **nenhuma divergência analítica**. A representação interna dos XLSX e seus hashes são diferentes. Os hashes exibidos no exemplo foram substituídos pelos hashes das cópias distribuídas; os nomes permitem abrir esses arquivos diretamente.

Os **quatro testes canônicos passaram**, recalculando indicadores e conciliando maio com os históricos: 214 contatos, mediana de 228 minutos, 126 propostas, 28 sem acompanhamento no recorte definido, 138 ordens e 27 incompletas. A verificação adicional recalcula 17/14/13 a partir das notas mostradas nos dossiês e confere a consistência com a seleção interativa.

O verificador confere os links locais, âncoras HTML, recursos CSS, conteúdo do ZIP visual e inventário. A busca de configuração particular, caminhos pessoais e padrões de credenciais não encontrou ocorrências. A busca por padrões não substitui uma auditoria universal de segredos. Links externos não foram consultados nesta validação.

## Navegador e impressão

Execução em **Chrome 153.0.8010.53, Windows, headless, escala 1**, servindo somente uma cópia isolada da distribuição por HTTP em loopback. Todas as requisições externas foram bloqueadas. Os arquivos originais não estavam acessíveis pelo servidor de teste.

**148 verificações passaram; zero falhas.**

| Grupo | Evidência desta execução |
|---|---|
| Aulas | As 22 páginas carregaram conteúdo e imagens; sem rolagem horizontal em 1440, 390 e 375 px após estabilizar o layout. |
| Exemplo final | Filtro por área, seleção de triagem, rastro, fonte, hipótese, responsável proposto, indicador e comparação de base/meta sincronizados. |
| Teclado | Tab alcançou a seleção de triagem; foco visível e Enter atualizaram o dossiê. |
| Estados | Filtro vazio, retorno ao conjunto completo e preservação da seleção; JSON de inicialização inválido exibiu erro e manteve os três dossiês legíveis. |
| Responsividade | Site conferido em 375, 390, 768, 1024 e 1440 px. |
| Fonte e contraste | Figtree local carregada; sete amostras de texto acima do limiar aplicável, com menor razão de 4,75:1. |
| Movimento reduzido | Preferência reconhecida e ausência de animação longa nos elementos visíveis. |
| Sem JavaScript | Três dossiês e quatro hashes presentes; leitura móvel sem transbordamento. |
| Impressão | PDF A4 com JavaScript e fundo; PDF sem JavaScript e sem fundo. Conteúdo extraído e amostras visuais conferidas. |
| Recursos | Sem erro JavaScript nas páginas observadas ou recurso local com erro HTTP; quatro fontes acessíveis. |

O roteiro solicita também a decodificação das imagens carregadas sob demanda. A checagem de largura aguarda a estabilização após mudança de viewport, evitando interpretar o layout anterior como resultado do celular.

## Evidências selecionadas

- [Resultado completo do navegador](resultado-navegador.json): contém os hashes de 92 arquivos examinados e do roteiro executado. O verificador exige correspondência com os arquivos distribuídos.
- [Comparação das fontes](comparacao-fontes.json).
- [Conferência de impressão](impressao.json).
- [Site em desktop](evidencias/site-desktop.png) e [celular](evidencias/site-mobile.png).
- [Aula 5.4 em celular](evidencias/aula-5-4-mobile.png).
- [Amostra de impressão](evidencias/impressao-pagina-1.png) e [impressão sem JavaScript](evidencias/impressao-sem-js-pagina-1.png).
- [Inventário SHA-256](inventario.json), cobrindo os arquivos da distribuição, exceto o próprio inventário. O hash externo da release cobre o ZIP completo.

## Limites e próxima decisão

Revisão de preparação para envio em 29/09/2026: verificadores e empacotador ajustados para funcionar dentro de um clone Git, excluindo os metadados `.git` da raiz do inventário e do ZIP. Conteúdo didático, fontes e arquivos examinados no navegador permanecem com os mesmos hashes. A data e os resultados da bateria de navegador acima permanecem os da execução original.

Validação executada pelo agente responsável pela preparação; não é auditoria independente por terceiro. A cobertura não inclui leitores de tela, dispositivos físicos, outros motores, todas as combinações de contraste nem inspeção visual de todas as páginas impressas. Não se certifica PDF acessível.

O exemplo preserva o visual final do exercício. Esta preparação não realizou uma nova auditoria de fidelidade completa contra cada componente da referência. As aulas usam fonte web opcional; sem rede, usam as alternativas do sistema. Os testes foram feitos nessa condição, e o conteúdo permaneceu legível.

Não foram testados login, backend, papéis ou acesso em produção; esses recursos não integram o Site estático distribuído. Metas, responsáveis e piloto continuam propostos. A próxima decisão é revisar a distribuição e publicar no repositório confirmado, com tópicos `openai` e `codex` e tag `v1.0.0`. Publicar um Site e alterar sua audiência são decisões separadas.
