# Verificação da distribuição

Para a pessoa responsável pela manutenção. O aluno pode pedir ao Codex que execute estas verificações; não precisa programar para acompanhar o curso.

## Verificação estática e de conteúdo

Requisitos: Python 3.10 ou superior e Node.js 20 ou superior. Nenhuma instalação de dependência é necessária para os comandos abaixo. Execute na raiz desta distribuição:

```text
python verificacao/verificar.py
```

O comando confere os 22 HTML, links locais e âncoras HTML, recursos CSS, hashes das quatro fontes e do exemplo, conteúdo do ZIP visual, inventário e padrões de credenciais/configuração particular. Depois executa quatro testes que recalculam os indicadores e históricos das planilhas. A busca por padrões não equivale a uma auditoria universal de segredos.

Os comandos funcionam também dentro de um clone Git: os metadados `.git` da raiz são ignorados pela verificação e nunca entram no inventário ou no ZIP. Repositórios aninhados continuam proibidos no material distribuído.

[comparacao-fontes.json](comparacao-fontes.json) registra a comparação executada durante a exportação: todas as abas, coordenadas, valores, tipos e fórmulas/caches. Os arquivos oficiais são os de `projeto-inicial/`. As cópias usadas anteriormente no exemplo tinham outra representação interna; nenhuma célula precisou ser alterada.

## Navegador

O roteiro reproduzível é [navegador.cjs](navegador.cjs). Requer Playwright disponível no ambiente e Chrome instalado. A variável opcional `BMC_PLAYWRIGHT_MODULE` aceita o caminho para uma instalação existente de Playwright. Não há download ou instalação automática pelo roteiro.

```text
node verificacao/navegador.cjs . output/verificacao
```

O roteiro inicia um servidor somente em loopback, limitado à pasta informada, e o encerra ao terminar. Exercita páginas, teclado, seleção, filtros, larguras, movimento reduzido, falha de inicialização, ausência de JavaScript e impressão. Os resultados gerados em `output/` são locais e não integram a release. Para reempacotar, use uma cópia limpa, sem essa pasta de resultados, ou indique uma saída fora da distribuição.

## Gerar uma release local

Depois de revisar alterações e atualizar versão, notas e relatório:

```text
python verificacao/empacotar.py
```

O comando regenera [inventario.json](inventario.json), verifica a distribuição e grava ZIP e SHA-256 na pasta imediatamente acima. O inventário cobre todos os arquivos, exceto ele próprio; o hash externo cobre o ZIP inteiro. Datas do contêiner são fixadas para reprodução dos mesmos bytes. Confira o hash após baixar ou copiar o arquivo.

O ZIP visual do M7 conserva o formato ensinado: ao extrair, fornece `referencias-visuais/bmc-original/` e o prompt de adaptação. Se alterar a referência, atualize também esse ZIP antes de empacotar.

## Evidência desta versão

Consulte [RELATORIO.md](RELATORIO.md) e [resultado-navegador.json](resultado-navegador.json). A execução automatizada não substitui revisão com tecnologias assistivas ou aprovação humana de publicação.
