---
name: Business Mission Control
description: Mesa operacional que transforma evidências em decisões humanas rastreáveis.
colors:
  graphite: "#171815"
  graphite-raised: "#22231F"
  ivory: "#F1EBDD"
  ivory-bright: "#FFF9EC"
  ink: "#20211E"
  muted: "#6C6961"
  muted-on-dark: "#C8C0B0"
  copper-dark: "#C47A4C"
  copper-light: "#9A5532"
  copper-wash: "rgba(154, 85, 50, 0.10)"
  line-dark: "rgba(255, 249, 236, 0.16)"
  line-light: "rgba(32, 33, 30, 0.20)"
typography:
  display:
    fontFamily: "\"Figtree Variable\", Figtree, system-ui, sans-serif"
    fontSize: "clamp(42px, 5vw, 72px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "\"Figtree Variable\", Figtree, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.5vw, 64px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "\"Figtree Variable\", Figtree, system-ui, sans-serif"
    fontSize: "clamp(28px, 3vw, 40px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  body:
    fontFamily: "\"Figtree Variable\", Figtree, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "\"Figtree Variable\", Figtree, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "normal"
rounded:
  mark: "6px"
  surface: "8px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
  section: "clamp(64px, 8vw, 112px)"
components:
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "9px 13px"
  filter-chip-active:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.ivory-bright}"
    rounded: "{rounded.pill}"
    padding: "9px 13px"
  matrix-panel:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "28px"
  matrix-point:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.ivory-bright}"
    rounded: "{rounded.circle}"
    size: "42px"
  matrix-point-active:
    backgroundColor: "{colors.copper-light}"
    textColor: "{colors.ivory-bright}"
    rounded: "{rounded.circle}"
    size: "42px"
  initiative-dossier:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.ivory-bright}"
    rounded: "{rounded.surface}"
    padding: "28px"
  active-trace:
    backgroundColor: "{colors.graphite-raised}"
    textColor: "{colors.ivory-bright}"
    rounded: "{rounded.surface}"
    padding: "18px 20px"
---

# Design System: Business Mission Control

## Overview

**Creative North Star: "A Mesa de Decisão Operacional"**

Business Mission Control traduz uma sala de operação em um dossiê contínuo: casco grafite, folha marfim, linhas finas e cobre reservado ao item que exige decisão. A interface deve responder rapidamente “o que fazemos agora?” e manter visível o caminho entre recomendação, fonte e ação.

O sistema favorece leitura executiva, comparação e rastreabilidade. Não é um dashboard genérico nem uma vitrine de IA: não usa gradientes, vidro, neon ou parede de cards; usa hierarquia tipográfica, regras, tabelas, plotagens e estados sincronizados.

**Key Characteristics:**

- **Folha contínua:** o conteúdo se comporta como um único dossiê dentro do casco grafite.
- **Rastro de decisão:** seleção, matriz, evidências e plano permanecem sincronizados.
- **Cobre reservado:** o acento aparece em seleção, estado e ligação analítica, nunca como decoração.
- **Densidade executiva:** números tabulares, títulos diretos e blocos comparáveis reduzem ambiguidade.

## Colors

A paleta contrapõe um casco grafite a papéis marfim; os dois cobres preservam contraste nos fundos escuro e claro.

### Primary

- **Cobre sobre escuro** (#C47A4C): use `copper-dark` em estados e indicadores sobre grafite.
- **Cobre sobre claro** (#9A5532): use `copper-light` em seleção, pontuação e ligação sobre marfim.

### Neutral

- **Casco grafite** (#171815 a #22231F): `graphite` enquadra o produto; `graphite-raised` identifica dossiês ativos e áreas funcionais elevadas.
- **Folha marfim** (#F1EBDD a #FFF9EC): `ivory` sustenta o dossiê e `ivory-bright` separa trechos de maior atenção sem criar novos cartões.
- **Tinta operacional** (#20211E): `ink` conduz a leitura principal.
- **Texto secundário** (#6C6961 a #C8C0B0): `muted` e `muted-on-dark` organizam contexto, metadados e notas.
- **Regras translúcidas:** `line-light` e `line-dark` estruturam tabelas, faixas e divisões sem competir com o conteúdo.

### Named Rules

**The Cobre Raro Rule.** O cobre marca a decisão ativa, o vínculo de evidência ou um estado; sua raridade comunica prioridade.

**The Três Superfícies Rule.** Use somente casco grafite, folha marfim e área selecionada; novas superfícies precisam cumprir uma função operacional explícita.

## Typography

**Display Font:** Figtree Variable (with Figtree, system-ui, sans-serif)
**Body Font:** Figtree Variable (with Figtree, system-ui, sans-serif)

**Character:** Uma única família sem serifa mantém o produto sóbrio e contemporâneo. Contraste vem de escala, peso e espaçamento; números usam algarismos tabulares.

### Hierarchy

- **Display** (700, 42–72px, line-height 0.98): reservado à decisão recomendada da primeira dobra.
- **Headline** (700, 34–64px, line-height 1): abre cada etapa do dossiê e deve permanecer curto e balanceado.
- **Title** (700, 28–40px, line-height 1.05): nomeia filas, iniciativas, fases e componentes analíticos.
- **Body** (400, 17px, line-height 1.55): explica motivo, hipótese e próxima ação; limite a leitura longa a aproximadamente 68 caracteres.
- **Label** (700, 12px, line-height 1.35): identifica estado, fonte, período e métrica; caixa alta não é padrão universal.

### Named Rules

**The Hierarquia Direta Rule.** Um título formula a decisão; subtítulos explicam o contexto; labels nunca substituem uma hierarquia clara.

## Layout

O `workboard` é uma folha contínua de até 1440 px, enquadrada por 16 px nas laterais. A barra de missão permanece fixa no topo com 64 px. Na primeira dobra, recomendação e fila ocupam uma composição 7/5; na comparação, matriz e dossiê ocupam 8/4. Seções usam ritmo vertical amplo e regras de 1 px em vez de pilhas de cartões.

Em até 1180 px, navegação e grades se compactam; em até 900 px, primeira dobra, matriz e dossiê empilham; em até 640 px, a matriz vira lista, o plano de quatro fases vira sequência vertical e a folha ocupa toda a largura. Não há rolagem horizontal como solução responsiva.

**The Rastro Contínuo Rule.** A iniciativa ativa deve continuar reconhecível da fila ao plano de 30 dias, inclusive quando a composição muda de grade para lista.

## Elevation & Depth

O sistema é plano por padrão. Profundidade vem de contraste tonal, bordas e sobreposição funcional; a única sombra reutilizável é `shadow-functional`, aplicada a menus flutuantes, rastro ativo, pontos da matriz e dossiê em destaque.

### Shadow Vocabulary

- **Funcional** (`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18)`): comunica sobreposição ou seleção sem criar atmosfera.

### Named Rules

**The Elevação Funcional Rule.** Sombra só comunica sobreposição, seleção ou acesso temporário; nunca cria atmosfera ou uma parede de cartões.

## Shapes

Cantos discretamente curvos de 8 px formam painéis, menus e superfícies ativas. A marca usa 6 px; filtros e indicadores usam pílulas; pontos de plotagem são circulares. Linhas de 1 px e recortes ortogonais preservam a linguagem de dossiê.

## Components

### Buttons

Controles são discretos em repouso e inequívocos quando selecionados.

- **Shape:** filtros usam pílula; pontos da matriz usam círculo; linhas clicáveis permanecem retangulares.
- **Primary:** estado ativo inverte para grafite ou cobre, conforme o contexto analítico.
- **Hover / Focus:** hover altera fundo ou borda; foco visível usa contorno cobre de 3 px com afastamento de 4 px.

### Chips

- **Style:** filtros usam fundo transparente e regra clara; seleção usa fundo grafite e texto marfim.
- **State:** `aria-pressed` é a fonte acessível do estado ativo.

### Cards / Containers

- **Corner Style:** superfícies funcionais usam cantos discretos.
- **Background:** matriz permanece marfim; dossiê e rastro ativo usam grafite elevado.
- **Shadow Strategy:** somente elevação funcional; listas e fases são delimitadas por regras.
- **Internal Padding:** 28 px nos painéis analíticos principais.

### Navigation

A barra de missão é sticky, escura e textual. Links recebem sublinhado cobre no hover; abaixo de 1180 px, o menu “Seções” abre um painel compacto alinhado à direita.

### Rastro de decisão

Selecionar uma oportunidade sincroniza fila, ponto da matriz, evidências relacionadas e fases do plano. A transição dura 180 ms com curva de desaceleração; em `prefers-reduced-motion`, o estado muda de forma praticamente instantânea. Preserve `aria-pressed`, `aria-live` e foco visível.

## Do's and Don'ts

### Do:

- **Do** preserve a folha contínua, a primeira dobra 7/5 e a comparação 8/4.
- **Do** reserve cobre para seleção, estado e vínculo de evidência.
- **Do** maintain foco visível, `aria-pressed`, `aria-live` e alternativa com movimento reduzido.
- **Do** convert a matriz em lista e as quatro fases em sequência vertical no celular.

### Don't:

- **Don't** use gradientes, glassmorphism, neon, glow ou sombras largas.
- **Don't** fragment o dossiê em uma parede de cartões genéricos.
- **Don't** use cobre como preenchimento decorativo ou sem a variante de contraste adequada ao fundo.
- **Don't** solve responsividade com rolagem horizontal ou esconder o rastro de decisão.
