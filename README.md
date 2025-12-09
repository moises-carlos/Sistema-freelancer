# Sistema de Gestão de Freelancers e Projetos

## Descrição do Projeto
Este projeto é uma plataforma para empresas contratarem freelancers e acompanharem o progresso de seus projetos. Ele fornece uma API RESTful completa para gerenciar usuários, projetos, propostas, avaliações, mensagens e contratos, além de um sistema robusto de autenticação e autorização.

## Usuários
O sistema conta com três tipos principais de usuários, cada um com diferentes permissões:
*   **Admin:** Modera a plataforma e tem acesso irrestrito.
*   **Empresa:** Cria projetos, avalia freelancers, envia mensagens e gerencia contratos.
*   **Freelancer:** Candidata-se a projetos, envia mensagens e recebe avaliações.

## Recursos Principais

*   **Autenticação de Usuários:**
    *   Login/Registro padrão com email e senha (hashing de senha com `bcrypt`).
    *   Login social com Google OAuth 2.0.
    *   Geração de JWT (JSON Web Tokens) para sessões de API.
*   **Autorização Baseada em Regras:** Middleware de autorização para proteger rotas e recursos com base no tipo de usuário (Admin, Empresa, Freelancer).
*   **Gestão de Usuários:** CRUD (Create, Read, Update, Delete) de usuários, com diferentes tipos (Empresa, Freelancer).
*   **Gestão de Projetos:**
    *   CRUD completo para projetos.
    *   Status do projeto (aberto, em andamento, finalizado, cancelado).
    *   Apenas empresas podem criar/gerenciar seus projetos.
*   **Gestão de Propostas:**
    *   CRUD para propostas de freelancers para projetos.
    *   Status da proposta (pendente, aceita, recusada).
    *   Apenas freelancers podem criar propostas; apenas empresas podem aceitar/recusar propostas em seus projetos.
*   **Gestão de Avaliações:**
    *   CRUD para avaliações após a conclusão (ou aceitação de proposta) de projetos.
    *   Empresas podem avaliar freelancers; freelancers podem avaliar empresas.
    *   Rating de 1 a 5 e comentários.
*   **Sistema de Mensagens e Anexos:**
    *   Envio de mensagens de texto e/ou com arquivos anexos dentro do contexto de um projeto.
    *   Participantes do projeto (empresa dona, freelancer com proposta aceita) podem se comunicar.
    *   Armazenamento de arquivos no diretório `uploads/`.
*   **Sistema de Contratos (Simulado):**
    *   Geração de contratos para projetos com propostas aceitas.
    *   Contrato vincula Empresa, Freelancer e Projeto.
    *   Status do contrato (ativo, finalizado, quebrado).

## Tecnologias Utilizadas

*   **Backend:** Node.js, Express.js
*   **Banco de Dados:** PostgreSQL (com `postgres.js` e `Supabase`)
*   **Autenticação:** JWT (`jsonwebtoken`), Passport.js (`passport`, `passport-google-oauth20`), `bcrypt` para hashing de senhas.
*   **Validação:** `express-validator`
*   **Testes:** Jest (`jest`, `supertest`) para TDD
*   **Variáveis de Ambiente:** `dotenv`
*   **Upload de Arquivos:** `multer`

## Configuração do Ambiente e Execução do Projeto

### Pré-requisitos
*   Node.js (versão 18 ou superior)
*   npm (gerenciador de pacotes do Node.js)
*   Banco de dados PostgreSQL (ex: Supabase)

### 1. Clonar o Repositório
```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd sistema_freelancer
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente (`.env`)
Crie um arquivo `.env` na raiz do projeto e preencha com as seguintes variáveis:
```env
PORT=3000
DATABASE_URL="postgres://user:password@host:port/database"
JWT_SECRET="seu_segredo_jwt_super_seguro"
SESSION_SECRET="um_segredo_aleatorio_e_longo_para_sua_sessao"
GOOGLE_CLIENT_ID="seu_google_client_id"
GOOGLE_CLIENT_SECRET="sua_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"
```
*   Substitua os valores de `DATABASE_URL` pelas credenciais do seu banco de dados PostgreSQL (ex: Supabase).
*   `JWT_SECRET` deve ser uma string longa e aleatória.
*   `SESSION_SECRET` deve ser uma string longa e aleatória para as sessões do Express.
*   Para as variáveis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_CALLBACK_URL`, siga as instruções fornecidas no Google Cloud Console para configurar as credenciais OAuth 2.0 para um "Aplicativo da Web". O `GOOGLE_CALLBACK_URL` deve ser `http://localhost:3000/api/auth/google/callback`.

### 4. Configurar o Banco de Dados
Conecte-se ao seu banco de dados PostgreSQL e execute os comandos SQL do arquivo `database.sql` na **ordem em que aparecem** para criar todas as tabelas e funções necessárias.

### 5. Rodar a Aplicação
```bash
npm run dev
```
O servidor estará rodando em `http://localhost:3000`.

### 6. Rodar os Testes
Para executar todos os testes (Auth, Projetos, Propostas, etc.):
```bash
npm test
```
Para executar um arquivo de teste específico (ex: apenas os testes de autenticação):
```bash
npm test -- src/tests/auth.test.js
```

## Rotas da API (Visão Geral)
As rotas são prefixadas com `/api`.

*   **Autenticação (`/api/auth`)**
    *   `POST /register`: Registra um novo usuário.
    *   `POST /login`: Realiza o login e retorna um JWT.
    *   `GET /google`: Inicia o fluxo de login com Google.
    *   `GET /google/callback`: Callback do Google para processar o login.
    *   `GET /protected` (somente para testes): Rota protegida.

*   **Usuários (`/api/users`)**
    *   `POST /`: Cria um novo usuário.

*   **Projetos (`/api/projects`)**
    *   `POST /`: Cria um projeto (Empresa).
    *   `GET /`: Lista todos os projetos (Admin, Empresa, Freelancer).
    *   `GET /:id`: Obtém detalhes de um projeto (Admin, Empresa, Freelancer).
    *   `PUT /:id`: Atualiza um projeto (Empresa dona).
    *   `DELETE /:id`: Deleta um projeto (Empresa dona).

*   **Propostas (`/api/proposals`)**
    *   `POST /`: Cria uma proposta (Freelancer).
    *   `GET /project/:projectId`: Lista propostas de um projeto (Empresa dona, Admin).
    *   `GET /freelancer/:freelancerId`: Lista propostas de um freelancer (Freelancer dono, Admin).
    *   `GET /:id`: Obtém detalhes de uma proposta (Dono, Empresa dona do projeto, Admin).
    *   `PATCH /:id/status`: Atualiza o status da proposta (Empresa dona do projeto).
    *   `DELETE /:id`: Deleta uma proposta (Freelancer dono, se pendente).

*   **Avaliações (`/api/reviews`)**
    *   `POST /`: Cria uma avaliação (Participantes do projeto com proposta aceita).
    *   `GET /reviewee/:revieweeId`: Lista avaliações recebidas (Reviewee, Admin).
    *   `GET /reviewer/:reviewerId`: Lista avaliações feitas (Reviewer, Admin).
    *   `GET /:id`: Obtém detalhes de uma avaliação (Reviewer, Reviewee, Admin).
    *   `PUT /:id`: Atualiza uma avaliação (Reviewer).
    *   `DELETE /:id`: Deleta uma avaliação (Reviewer).

*   **Mensagens (`/api/messages`)**
    *   `POST /`: Envia mensagem com ou sem anexo (Participantes do projeto).
    *   `GET /project/:projectId`: Lista mensagens de um projeto (Participantes do projeto).
    *   `DELETE /:id`: Deleta uma mensagem (Remetente).

*   **Contratos (`/api/contracts`)**
    *   `POST /`: Cria um contrato (Empresa, para projeto com proposta aceita).
    *   `GET /my`: Lista contratos do usuário autenticado (Empresa, Freelancer).
    *   `GET /:id`: Obtém detalhes de um contrato (Empresa, Freelancer, Admin).
    *   `PATCH /:id/status`: Atualiza o status do contrato (Empresa dona, Admin).
    *   `DELETE /:id`: Deleta um contrato (Admin).

## Autor
[Seu Nome Aqui]