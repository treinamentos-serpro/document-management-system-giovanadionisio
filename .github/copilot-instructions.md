# Instruções do projeto - Document Management System (DMS)

Estas instruções são aplicadas automaticamente pelo GitHub Copilot em todas as
interações neste repositório. Use-as como contexto de engenharia para gerar
código consistente com a arquitetura e as convenções do projeto.

## Visão geral

Sistema web para gestão de documentos com:

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário

## Stack

- Backend: Node.js + Express (CommonJS)
- Frontend: React + Vite (ESM)
- Testes backend: runner nativo do Node (`node:test`)
- Sem TypeScript nesta fase (JavaScript puro)

## Princípios obrigatórios

- SOLID, DRY, KISS, YAGNI
- 12-Factor App (configuração via variáveis de ambiente)
- Código legível tem prioridade sobre código complexo
- Sem overengineering e sem abstrações desnecessárias

## Arquitetura do backend (Clean Architecture simples)

Separe responsabilidades em quatro camadas dentro de `backend/src`:

- `routes/`: definem os endpoints e delegam para os controllers
- `controllers/`: tratam entrada/saída HTTP e validação básica
- `services/`: concentram as regras de negócio
- `repositories/`: cuidam da persistência

Fluxo de dependência: `routes -> controllers -> services -> repositories`.
Camadas internas não conhecem camadas externas.

## Endpoints previstos

- `POST /upload` - envia um documento
- `GET /documents` - lista os documentos
- `GET /documents/:id/download` - baixa um documento

Consulte [docs/specs/dms-spec.md](../docs/specs/dms-spec.md) para os contratos
completos da API e requisitos. As rotas usam `X-User-Id` para identificar o
proprietário; mantenha o formato de erro `{ error: { code, message } }`.

## Armazenamento (restrição importante)

- Os arquivos enviados são gravados no filesystem local da aplicação, na pasta
  `backend/storage`, utilizando `multer` com `diskStorage`.
- Os metadados dos documentos (id, nome original, tamanho, data, dono) ficam em
  memória nesta fase inicial.
- Não utilize provedores de armazenamento externos ou serviços de upload de
  terceiros. O armazenamento é estritamente local à aplicação.

## Convenções do frontend

- Componentes funcionais com React Hooks
- Organização baseada em componentes: `components/`, `pages/`, `services/`
- A comunicação com o backend é feita via `fetch`, através do prefixo `/api`
  (proxy configurado no Vite)
- Reutilize componentes e evite duplicação

## Estilo de código

- Nomes descritivos em inglês para símbolos de código
- Mensagens ao usuário e comentários em português
- Funções pequenas e com responsabilidade única
- Trate erros nos limites do sistema (entrada HTTP, leitura/escrita de arquivos)

## Restrições gerais

- Não quebrar funcionalidades existentes
- Manter o seed simples e evolutivo
- Preferir dependências já presentes no `package.json`

## Validação e referências

- Backend: `cd backend && npm test` (runner nativo `node:test`); `npm run dev`
  inicia o servidor com `node --watch`.
- Frontend: `cd frontend && npm run build`; `npm run dev` inicia o Vite e o
  proxy `/api` espera o backend em `localhost:3000`.
- Não há scripts de lint configurados nos `package.json` atuais.
- Use [backend/test/app.test.js](../backend/test/app.test.js) como exemplo para
  testes de integração HTTP. A configuração HTTP e o tratamento global de erros
  estão em [backend/src/app.js](../backend/src/app.js).
- No frontend, [documentApi.js](../frontend/src/services/documentApi.js)
  centraliza as chamadas HTTP; os componentes ficam em
  [frontend/src/components/](../frontend/src/components/).
- Os fluxos detalhados e limites do produto estão na
  [especificação](../docs/specs/dms-spec.md); consulte-a em vez de duplicar os
  requisitos aqui.
