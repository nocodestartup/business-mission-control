# Aplicar a referência visual do BMC

Este pacote ajuda a reproduzir a apresentação do painel Business Mission Control no seu projeto. Use-o nas Aulas 7.1 e 7.2. As fontes e decisões continuam sendo as do seu HANDOFF.md.

## Preparar os arquivos

1. Baixe o pacote na Aula 7.1 e descompacte-o. Coloque referencias-visuais na raiz da pasta da Lume, ao lado de HANDOFF.md. Se já houver um pacote anterior, compare o conteúdo e acrescente os materiais ausentes sem apagar seu trabalho.
2. Confira GUIA-DO-ALUNO.md, CRITERIOS-VISUAIS.md, REGISTRO-VISUAL.md, DESIGN.md, app/, fonts/ e capturas/ dentro de referencias-visuais/bmc-original/.
3. O Codex precisa conseguir ler essa pasta e a candidata. Se estiver em outra máquina ou conversa sem acesso local, forneça os arquivos. Somente mencionar o caminho não dá acesso a eles.
4. Abra a conversa M7 · Validação e publicação. Use o pedido da Aula 7.1 para auditar. Depois da revisão, continue na mesma conversa com o pedido de adaptação da Aula 7.2.

## O que cada parte fornece

| Parte | Uso |
|---|---|
| DESIGN.md | Paleta, tipografia, composição e regras visuais. |
| app/globals.css e app/report-dashboard.tsx | Estilos e composição implementados no painel. |
| app/metric-sparkline.tsx e app/metric-sparkline-data.ts | Referência dos gráficos; use somente dados conferidos. |
| fonts/figtree/ | Fonte local, estilos de carregamento e licença. |
| capturas/ | Referência renderizada em desktop e celular, com o estado descrito em CAPTURAS.md. |
| CRITERIOS-VISUAIS.md e REGISTRO-VISUAL.md | O que comparar e como registrar a evidência. |
| Outros componentes e DEPENDENCIAS.json | Apoio para o Codex compreender a interface de origem. |

Você conduz a revisão; não precisa editar código manualmente. Os arquivos React são referências de implementação, não uma aplicação pronta para executar. A candidata pode continuar em HTML, CSS e JavaScript. O Codex precisa adaptar a estrutura e resolver a importação de Tailwind e o carregamento da Figtree; apenas copiar o CSS ou declarar o nome da fonte não basta.

## O significado de visual igual nesta atividade

Compare os mesmos componentes e estados: composição, fonte, cores, medidas, hierarquia e comportamento responsivo. Dados, textos e quantidades refletem a análise revisada de cada projeto. Registre essas diferenças esperadas em vez de alterar fatos para imitar uma captura.

As capturas mostram o painel original renderizado com dados sintéticos de apresentação. Não comprovam login, geração, aprovação, histórico operacional ou publicação. As telas operacionais complementares não são novas funcionalidades obrigatórias. Esta atividade exige fidelidade do painel de decisão; o escopo funcional continua definido pelo seu projeto.

Se faltarem capturas, se a fonte não carregar ou se o estado não puder ser comparado, mantenha a fidelidade pendente. Um Site funcional ainda pode ter diferenças visuais. O resultado é validado somente quando há comparação e as diferenças relevantes foram resolvidas.

## Registros e continuidade

O pedido da aula cria validacao/relatorio-m7.md e validacao/registro-visual.md na raiz da Lume. Eles registram versão, capturas, testes, limitações e veredito. Guarde a versão anterior para retorno. No fim da Aula 7.2, o handoff aponta para esses registros e distingue adaptação, validação, salvamento e publicação.
