# Critérios de fidelidade visual

Compare o painel com as capturas e a implementação fornecidas. Use os mesmos tamanhos de janela, zoom de 100%, fonte carregada e iniciativa selecionada equivalente. O texto pode variar conforme a análise aprovada; isso deve constar no registro.

| Critério | Como conferir |
|---|---|
| Composição | Barra superior escura; folha contínua; indicadores, série quando disponível, fila, gargalos, matriz/dossiê, fontes e plano na mesma hierarquia. |
| Paleta | Grafite #171815 e #22231F, marfim #F1EBDD e #FFF9EC, tinta #20211E, cobre #C47A4C no escuro e #9A5532 no claro. |
| Tipografia | Figtree Variable realmente carregada; escala, pesos, entrelinha, quebras e números tabulares conferidos contra o CSS. |
| Medidas | Conteúdo de até 1440 px, margens e espaçamentos do CSS; contornos e raios equivalentes; sem novas decorações. |
| Componentes | Filtros, seleção, indicadores, gráficos sustentados por fontes, fila, matriz, dossiê e plano usam a aparência da referência. |
| Celular | Matriz vira lista e seções empilham; informações e seleção continuam acessíveis; sem corte ou rolagem horizontal. |
| Estados | Conferir estado inicial, outra iniciativa selecionada, filtro ativo, retorno ao conjunto e vazio/erro quando aplicáveis. |
| Acessibilidade | Teclado, foco visível, contraste, leitura sem JavaScript, movimento reduzido e impressão continuam utilizáveis. |

Capturas principais: 1440 × 1000 e 390 × 844. Teste também larguras 375, 768 e 1024 px. A captura de página inteira mantém a largura indicada, mas sua altura é maior que a janela. Registre navegador, zoom, estado e data.

Use capturas lado a lado; para o mesmo conteúdo e estado, uma sobreposição ajuda a identificar deslocamentos. Compare também componentes individualmente quando o tamanho do texto mudar. Não imponha igualdade pixel a pixel entre textos, dados ou ambientes diferentes.

## Veredito

- Conforme: os critérios visuais foram comparados e atendidos; diferenças esperadas de conteúdo estão justificadas.
- Divergente: há mudança de fonte, composição, cor, medida, estado ou responsividade a corrigir.
- Não verificado: faltou referência, execução ou condição equivalente para comparar.

Enquanto a fidelidade acordada estiver divergente ou não verificada, o escopo visual não está concluído e a candidata fica não pronta para a entrega prevista no M7. Uma diferença estética não é automaticamente um risco de segurança, mas continua sendo um critério de aceite pendente. Mudança deliberada da referência precisa de decisão explícita e não pode ser registrada como igualdade visual.

Depois de qualquer ajuste, repita a comparação e os testes afetados na nova versão. Publicação exige autorização separada, para essa mesma versão.
