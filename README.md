# Live Translate

Portal de evento: uma agenda com salas e palestras onde cada participante ouve a tradução em tempo real no próprio telemóvel, via QR Code, em vez de num ecrã partilhado.

```
📋 Agenda (salas → palestras)
        │
        ├── PIN da palestra ──▶ 🎤 Orador fala (pt-PT)
        │                              │
        │                              ▼
        │                    Azure AI Speech (Speech Translation, streaming)
        │                              │
        │                              ▼
        │                    Azure Functions API ──▶ Azure SignalR Service
        │                              │                     │
        └──────── selo "AO VIVO" ◀─────┴── grupo agenda:live ┤
                                                              │
                                    ┌─────────────────────────┼─────────────────────────┐
                                    ▼                         ▼                         ▼
                              📱 Pessoa A                📱 Pessoa B                📱 Pessoa C
                              (EN, via QR)              (ES, via QR)              (FR, via QR)
```

## Estrutura

- `client/` — React + Vite + TypeScript.
  - `HomePage` — a agenda: lista salas e palestras (hora, orador, nº de participantes, selo "AO VIVO" em tempo real).
  - `SpeakTalkPage` (`/talk/:talkId/speak`) — pede o PIN da palestra; depois de validado, mostra o QR (fixo, aponta para a página de entrada dessa palestra), começa/pára a tradução e mostra a transcrição.
  - `JoinTalkPage` (`/talk/:talkId/join`) — escolher idioma e ver as legendas em tempo real.
  - `DisplayPage` (`/display/:roomId?lang=en`) — ecrã sem interação para um monitor/TV atrás do palco (ex. para a câmara filmar com legendas em rodapé): segue automaticamente a palestra que estiver "ao vivo" nessa sala e mostra a legenda grande num idioma fixo (`en` por omissão, muda-se com `?lang=`). Não conta para o nº de participantes. Usa: `https://<url>/display/tribuna-presidencial?lang=en`. Deixa o separador aberto o dia todo — como não há histórico de "quem está ao vivo agora" guardado no servidor, um refresh a meio de uma palestra só volta a mostrar legendas quando essa palestra acabar/começar de novo (ou a seguinte começar).
- `api/` — Azure Functions (Node/TypeScript, programming model v4). Endpoints:
  - `GET /api/agenda` — devolve salas e palestras **sem os PINs** (os PINs só existem no servidor, nunca no bundle do cliente).
  - `POST /api/verifyPin` — valida `{ talkId, pin }`; se corresponder, devolve um token assinado (HMAC, `SPEAKER_TOKEN_SECRET`) válido por 12h para essa palestra.
  - `POST /api/negotiate` — credenciais de ligação ao Azure SignalR Service.
  - `POST /api/joinGroup` — junta uma ligação SignalR ao grupo `talkId:lang`.
  - `POST /api/broadcast` *(exige `X-Speaker-Token`)* — texto original + traduções por idioma, envia para cada grupo `talkId:lang`.
  - `POST /api/talkStarted` / `POST /api/talkEnded` *(exigem `X-Speaker-Token`)* — publicam o estado "ao vivo" no grupo `agenda:live`, que a agenda escuta para atualizar o selo em tempo real.
  - `POST /api/presence` / `POST /api/leave` — avisam `talkId:presence` (contador na página do orador) e `agenda:live` (contador na agenda) quando alguém entra/sai.
  - `GET /api/speechToken?talkId=...` *(exige `X-Speaker-Token`)* — emite um token temporário do Azure AI Speech.
- `api/src/lib/agenda.ts` — **fonte única da agenda** (salas, palestras, PINs). Edita este ficheiro para pores o evento real.
- `client/public/staticwebapp.config.json` — configuração do Azure Static Web Apps (SPA fallback). Tem de estar dentro de `client/`, não na raiz.

`talk.id` (definido em `agenda.ts`) é o identificador usado em todo o lado — grupos do SignalR e URLs (`/talk/<id>/join`, `/talk/<id>/speak`). Como é estável, os QR codes de cada palestra podem ser gerados e impressos com antecedência, antes do evento começar.

## Editar a agenda (salas, palestras, PINs, horários)

Abre `api/src/lib/agenda.ts` e edita os arrays `ROOMS` e `TALKS`. Cada `id` de palestra tem de ser único em todo o ficheiro. `startsAt`/`endsAt` são ISO 8601 com offset explícito (ex. `2026-10-07T10:00:00+01:00`) — usados para a contagem decrescente e o intervalo de horas mostrados na agenda. O PIN pode ser o que quiseres (atualmente é o mesmo para todas as palestras — o código postal da empresa). Depois de editar, faz commit e push — o deploy é automático.

## Como funciona a autorização do orador

Um PIN sozinho não chega numa SPA estática — qualquer pessoa consegue ver o código-fonte JS. Por isso:

1. `POST /api/verifyPin` corre no servidor e compara o PIN com `timingSafeEqual` (evita timing attacks).
2. Se corresponder, devolve um **token assinado** (`talkId.expiry.hmac`, segredo em `SPEAKER_TOKEN_SECRET`).
3. Esse token tem de ir no header `X-Speaker-Token` em qualquer pedido que "fale" nessa palestra (`broadcast`, `speechToken`, `talkStarted`, `talkEnded`) — a API valida a assinatura e o `talkId` antes de aceitar.

## Recursos Azure necessários

1. **Azure AI Speech** (Speech Service) — precisas da chave e da região.
2. **Azure SignalR Service** — cria um recurso em modo **Serverless** (obrigatório para os bindings do Azure Functions). Copia a *Connection String*. O tier **Free (F1)** chega para testar (20 ligações simultâneas, 20k mensagens/dia).
3. **Azure Static Web Apps** — liga o repositório GitHub e aponta:
   - App location: `client`
   - Api location: `api`
   - Output location: `dist`

## Configuração local

```bash
cp api/local.settings.json.example api/local.settings.json
```

Edita `api/local.settings.json` e preenche:

- `AzureSignalRConnectionString` — do recurso SignalR Service (modo Serverless).
- `SPEECH_KEY` / `SPEECH_REGION` — do recurso Azure AI Speech.
- `SPEAKER_TOKEN_SECRET` — uma string aleatória (`openssl rand -hex 32` ou equivalente); assina os tokens de orador.

> `api/local.settings.json` está no `.gitignore` — nunca é commitado.

### Pré-requisitos

- Node.js 20+ (usado Node 25 no scaffold, mas o Azure Functions runtime recomenda 20 LTS — ajusta `engines` se fores fazer deploy).
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) (já incluído como devDependency em `api/`).

### Instalar dependências

```bash
npm install --prefix client
npm install --prefix api
npm install
```

### Correr localmente (client + api juntos, via SWA CLI)

```bash
npm run dev
```

Isto recompila a API (`tsc`), depois arranca o Vite (porta 5173) e o Functions host (`func start`), com o proxy da Static Web Apps CLI a servir tudo junto em `http://localhost:4280`. Para testar o QR num telemóvel, o telemóvel tem de conseguir alcançar esse endereço na mesma rede (ou usa um túnel como `ngrok`/`devtunnel`).

> `func start` só corre o que já está compilado em `api/dist` — não recompila TypeScript sozinho. O `npm run dev` da raiz já trata disto; se correres `func start` diretamente dentro de `api/`, lembra-te de correr `npm run build` primeiro.

### Correr client e api em separado (alternativa)

```bash
# terminal 1
npm run build --prefix api && npm run start --prefix api   # func start em :7071

# terminal 2
npm run dev --prefix client   # vite em :5173, aponta para /api via proxy
```

Neste modo define `VITE_API_BASE=http://localhost:7071/api` num `.env.local` dentro de `client/`.

## Notas de segurança

- A chave do Azure AI Speech nunca é enviada ao browser — o cliente pede um token temporário a `/api/speechToken`, válido por poucos minutos, e só depois de provar (via `X-Speaker-Token`) que sabe o PIN da palestra.
- A agenda pública (`GET /api/agenda`) nunca inclui os PINs — só a versão server-side em `api/src/lib/agenda.ts` os tem.

## Limitações conhecidas / próximos passos

- A agenda é um ficheiro estático no código (`api/src/lib/agenda.ts`) — editar requer um novo deploy. Para editar sem tocar em código, o próximo passo seria mover isto para uma tabela (Azure Table Storage).
- Os idiomas suportados estão fixos em `client/src/lib/languages.ts` — adicionar um idioma-alvo aumenta o custo/latência do Azure Speech Translation (cada idioma extra é uma stream adicional).
- O selo "AO VIVO" e o contador de participantes dependem de sinais explícitos (carregar em "Parar"/sair da página, ou fechar o separador normalmente, capturado via `navigator.sendBeacon`). Uma quebra de rede abrupta (wifi cai, bateria acaba) não é detetada — o contador só corrige quando a pessoa volta a entrar ou sai normalmente. Resolver isto por completo exigiria configurar *Upstream webhooks* no recurso SignalR para reagir a desligações reais.
