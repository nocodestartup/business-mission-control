# Publicar esta distribuição no GitHub

Este documento orienta a pessoa responsável pela entrega. O pacote não executa comandos remotos.

1. Confirme a organização NoCode e a audiência desejada. O nome do repositório é `business-mission-control`.
2. Crie o repositório no destino autorizado. Copie o conteúdo desta pasta para sua raiz, preservando arquivos ocultos, fontes e licenças. Não use o diretório particular do Sites nem o histórico Git do instrutor.
3. Execute a verificação descrita em `verificacao/README.md`, examine o diff e confirme que somente os materiais desta distribuição serão enviados. A configuração `.gitattributes` preserva bytes para que o Git não altere os hashes publicados.
4. Após autorização de envio, faça o commit e o push para o remoto confirmado. Na área About do GitHub, use a descrição de `verificacao/repositorio.json` e os tópicos `openai` e `codex`.
5. Sobre o commit exato revisado, crie a tag anotada com `git tag -a v1.0.0 -m "Business Mission Control v1.0.0"`. Confira o commit associado antes de enviar a tag ao remoto autorizado.
6. Crie a release a partir dessa tag, usando `RELEASE-v1.0.0.md` como corpo. Anexe o ZIP e o SHA-256 correspondentes à versão conferida.
7. Confira o download e o acesso pela audiência prevista. A release do GitHub não publica o Site nem modifica acesso no Sites.

Não mova uma tag já publicada. Para corrigir arquivos, prepare outra versão, atualize VERSION/CHANGELOG/notas, repita a verificação e gere novos hashes e arquivos de release. Configure GitHub Pages somente se houver uma decisão separada de hospedar o conteúdo.
