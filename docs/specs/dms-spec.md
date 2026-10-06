# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para que usuários enviem, listem e baixem seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, respeitando seu proprietário.
- Armazenamento dos arquivos em `backend/storage`, usando `multer` com `diskStorage`.
- Armazenamento dos metadados em memória durante a execução do backend.
- Interface web React para upload, listagem e download.
- Configuração operacional por variáveis de ambiente.

### Fora do escopo

- Armazenamento em nuvem ou uso de provedores externos.
- Versionamento, edição, exclusão ou compartilhamento de documentos.
- Persistência de metadados em banco de dados.
- Autenticação, cadastro ou gerenciamento de credenciais.
- Garantia de isolamento seguro entre usuários em um ambiente público.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo por vez usando `multipart/form-data`, no campo `file`. |
| RF-02 | O backend deve atribuir um identificador único ao documento e registrar nome original, tamanho, data de upload e proprietário. |
| RF-03 | O usuário pode listar os metadados dos documentos associados à sua identidade lógica. |
| RF-04 | O usuário pode baixar um documento pelo identificador quando ele pertence à identidade lógica da requisição. |
| RF-05 | O download deve usar o nome original do arquivo como nome sugerido ao navegador, sem usá-lo como caminho de armazenamento. |
| RF-06 | O backend deve rejeitar requisições sem arquivo, com arquivo vazio, identidade ausente ou identificador inválido. |
| RF-07 | O backend deve retornar erro apropriado quando o documento não existir, não pertencer ao usuário ou não puder ser lido. |
| RF-08 | A interface deve permitir selecionar e enviar um arquivo, apresentar o resultado e atualizar a listagem após upload bem-sucedido. |
| RF-09 | A interface deve permitir iniciar o download de cada documento listado e apresentar estados de carregamento e erro. |
| RF-10 | O endpoint existente `GET /health` deve continuar disponível como verificação simples de saúde do backend. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados localmente em `backend/storage`, usando `multer` com `diskStorage`. |
| RNF-02 | Os metadados devem permanecer em memória; eles serão perdidos quando o processo do backend reiniciar. |
| RNF-03 | O nome físico do arquivo deve ser gerado pelo backend, sem confiar no nome fornecido pelo cliente. |
| RNF-04 | A configuração deve usar variáveis de ambiente, seguindo o princípio 12-Factor. |
| RNF-05 | O backend deve usar Node.js, Express e CommonJS; os testes devem usar `node:test`. |
| RNF-06 | O frontend deve usar React, Vite, componentes funcionais e Hooks; as chamadas à API devem usar `fetch`. |
| RNF-07 | O backend deve validar entradas e tratar erros de upload, leitura e escrita de arquivos nos limites apropriados. |
| RNF-08 | As respostas de erro da API devem ter formato JSON consistente, exceto quando uma falha ocorrer antes de o backend conseguir produzir uma resposta. |

### Configuração proposta

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local de armazenamento. |
| `MAX_FILE_SIZE_MB` | `10` | Tamanho máximo permitido por arquivo, em MiB. |

A validação de tamanho deve ocorrer no upload. Na primeira versão, qualquer tipo de arquivo é permitido, respeitado o limite configurado.

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string (UUID) | API e interno | Identificador único gerado pelo backend. |
| `originalName` | string | API e interno | Nome original informado pelo cliente, usado para exibição e download. |
| `size` | number | API e interno | Tamanho do arquivo em bytes. |
| `uploadedAt` | string (ISO 8601) | API e interno | Data e hora do upload em UTC. |
| `owner` | string | API e interno | Identificador lógico do proprietário. |
| `storageName` | string | Somente interno | Nome físico gerado pelo backend para o arquivo armazenado. |

Os metadados serão mantidos em uma coleção em memória no repositório. O caminho físico deve ser resolvido a partir do diretório de armazenamento configurado e do nome gerado pelo backend; nunca deve ser montado diretamente com uma entrada do cliente.

### Identidade do usuário

Na ausência de autenticação nesta fase, a identidade lógica será recebida no cabeçalho `X-User-Id`. Esse valor serve apenas para associar e filtrar documentos em um ambiente local ou confiável. Não constitui autenticação e não protege dados contra clientes que possam escolher outro valor. A aplicação não deve ser considerada segura para uso público ou multiusuário não confiável sem autenticação.

## 6. Contratos de API

As rotas abaixo são caminhos do backend. Durante o desenvolvimento, o frontend as acessará pelo prefixo `/api`, removido pelo proxy existente do Vite.

### Formato de erro

Erros JSON devem seguir o formato:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}