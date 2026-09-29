# Business Mission Control · NoCode

**v1.0.0 · OpenAI · Codex**

Material do aluno para construir um Site interativo com o Codex a partir de dados sintéticos da Lume Manutenção Comercial. Você conduz planejamento, análise, construção, revisão e publicação autorizada.

## Comece aqui

1. Baixe esta versão do repositório e extraia a pasta. Comece pelo [índice das 22 aulas](aulas/README.md).
2. Copie o conteúdo de [projeto-inicial](projeto-inicial/README.md) para uma pasta de trabalho chamada `lume-manutencao-comercial` e abra essa pasta como projeto no Codex. Preserve a cópia original das quatro fontes.
3. Use os apoios conforme cada aula. Na Aula 4.1, copie o [modelo HANDOFF.md](modelos/HANDOFF.md) para a raiz do seu projeto e registre somente o que você revisou.
4. No M6, crie a skill dentro do Codex seguindo a aula. Não há skill pré-instalada neste kit.
5. No M7, acrescente a [referência visual](referencias-visuais/bmc-original/GUIA-DO-ALUNO.md) ao seu projeto e use os [modelos de validação](modelos/README.md).
6. Consulte o [projeto concluído](projeto-concluido/README.md) depois do exercício ou como recuperação. Ele é um exemplo, não substitui suas decisões e revisões.

## O que você vai construir

Um Site estático em português com resumo executivo, gargalos rastreáveis, oportunidades comparáveis, prioridades propostas e plano de 30 dias. Filtros e seleção ajudam a explicar a decisão. Preço, prazo, agenda, mensagens externas, aprovação e início de piloto continuam sob decisão humana.

O exercício não exige implementar login, upload, banco de dados ou geração de relatório no servidor. Metas e pontuações são propostas; nenhum resultado de piloto foi medido.

## Visualizar localmente

Com esta pasta aberta no Codex, peça: “Abra uma prévia HTTP local desta pasta, mostre o índice das aulas e o exemplo em projeto-concluido/site/index.html. Não publique nem altere acesso.”

Alternativa, com Python 3 instalado: execute `python -m http.server 8000 --bind 127.0.0.1` na raiz e abra `http://127.0.0.1:8000/`. Navegue até `aulas/` ou `projeto-concluido/site/`. Encerre o servidor com Ctrl+C.

Os arquivos do exemplo usam fontes locais. As aulas têm fonte web opcional e alternativas do sistema; sem internet, a tipografia pode mudar. Links de ferramentas externas exigem conexão. Recursos do Codex e do Sites dependem da disponibilidade na sua conta; se Sites não estiver disponível, mantenha os arquivos locais e registre essa limitação.

## Entrega e manutenção

- [Histórico](CHANGELOG.md) e [notas da v1.0.0](RELEASE-v1.0.0.md).
- [Verificação e integridade](verificacao/README.md).
- [Orientações de publicação no GitHub](PUBLICACAO.md).
- [Créditos e licenças de terceiros](CREDITOS.md).

Distribuição preparada para um único repositório chamado `business-mission-control`, com tópicos `openai` e `codex`. Preparar arquivos, criar release no GitHub, publicar um Site e conceder acesso são ações distintas. Este pacote não concede acesso ao ambiente do instrutor.
