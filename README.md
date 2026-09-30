# Live Translate

Portal de evento: cada **sala** tem uma sessão de tradução contínua ao longo do dia (não por palestra individual) — quem trata do som liga uma vez, e os participantes entram uma vez e ficam a ouvir tudo o que acontece nessa sala, sem terem de voltar a fazer scan a cada palestra nova.

```
📋 Agenda (3 salas)
        │
        ├── PIN partilhado ──▶ 🎤 Orador/operador liga uma vez por sala
        │                              │  (escolhe pt-PT ou en-US)
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
                              📱 Participante A         📺 TV do palco            🌐 Site do evento
                              (via QR, agenda)          (/display/:roomId)        (mesma URL em <iframe>)
```

## Estrutura

- `client/` — React + Vite + TypeScript.
  - `HomePage` — a agenda: um cartão por sala (selo "AO VIVO", nº de participantes, "Entrar"/"Sou orador") no topo, e por baixo a tabela de horários por período (Manhã/Tarde) só para consulta — sem ações por palestra individual.
  - `SpeakRoomPage` (`/room/:roomId/speak`) — pede o PIN da sala; depois de validado, escolhe-se o idioma em que se vai falar (pt-PT ou en-US — a Azure não deixa trocar a meio de uma sessão a correr, por isso é uma escolha manual antes de "Começar a falar", que se pode mudar entre palestras parando e recomeçando), mostra o QR (fixo, aponta para a entrada dessa sala), começa/pára a tradução e mostra a transcrição.
  - `JoinRoomPage` (`/room/:roomId/join`) — escolher idioma e ver as legendas em tempo real; a lista de idiomas exclui automaticamente o idioma em que se está a falar, assim que souber qual é.
  - `DisplayPage` (`/display/:roomId?lang=en&embed=1`) — ecrã sem interação, para um monitor/TV atrás do palco (com legendas em rodapé, a câmara filma o monitor) **e** para embutir no site do evento via `<iframe>` (com `?embed=1`, fundo transparente, preenche o contentor em vez do ecrã inteiro). Liga direto à sessão da sala pedida — não depende de nenhuma palestra estar marcada como "ao vivo" na agenda. Deixa o separador aberto o dia todo.
- `api/` — Azure Functions (Node/TypeScript, programming model v4). Endpoints:
  - `GET /api/agenda` — devolve salas e palestras (a agenda é só informativa; a sessão de tradução em si não depende dela).
  - `POST /api/verifyPin` — valida `{ roomId, pin }` contra o PIN partilhado do evento; se corresponder, devolve um token assinado (HMAC, `SPEAKER_TOKEN_SECRET`) válido por 12h para essa sala.
  - `POST /api/negotiate` — credenciais de ligação ao Azure SignalR Service.
  - `POST /api/joinGroup` — junta uma ligação SignalR ao grupo `roomId:lang`.
  - `POST /api/broadcast` *(exige `X-Speaker-Token`)* — texto original + traduções por idioma, envia para cada grupo `roomId:lang`.
  - `POST /api/roomStarted` / `POST /api/roomEnded` *(exigem `X-Speaker-Token`)* — publicam o estado "ao vivo" (e o idioma escolhido) no grupo `agenda:live`, que a agenda e o `JoinRoomPage` escutam.
  - `POST /api/presence` / `POST /api/leave` — avisam `roomId:presence` (contador na página do orador) e `agenda:live` (contador na agenda) quando alguém entra/sai.
  - `GET /api/speechToken?roomId=...` *(exige `X-Speaker-Token`)* — emite um token temporário do Azure AI Speech.
- `api/src/lib/agenda.ts` — **fonte única da agenda** (salas, palestras, horários, PIN partilhado). Edita este ficheiro para pores o evento real.
- `client/public/staticwebapp.config.json` — configuração do Azure Static Web Apps (SPA fallback). Tem de estar dentro de `client/`, não na raiz.

`room.id` é o identificador usado em todo o lado — grupos do SignalR, tokens, e URLs (`/room/<id>/join`, `/room/<id>/speak`, `/display/<id>`). Como é estável (só há 3 salas, não mudam), os QR codes e os links de `/display` podem ser preparados e impressos com antecedência.

## Editar a agenda (salas, palestras, horários)

Abre `api/src/lib/agenda.ts` e edita os arrays `ROOMS` e `TALKS`. `startsAt`/`endsAt` são ISO 8601 com offset explícito (ex. `2026-10-07T10:00:00+01:00`) — usados para a contagem decrescente e o "agora: `<título>`" mostrado nas páginas de sala (informativo — não controla a sessão de tradução em si, que corre independentemente da agenda). `EVENT_PIN` é o PIN partilhado por todas as salas. Depois de editar, faz commit e push — o deploy é automático.

## Como funciona a autorização do orador/operador

Um PIN sozinho não chega numa SPA estática — qualquer pessoa consegue ver o código-fonte JS. Por isso:

1. `POST /api/verifyPin` corre no servidor e compara o PIN com `timingSafeEqual` (evita timing attacks).
2. Se corresponder, devolve um **token assinado** (`roomId.expiry.hmac`, segredo em `SPEAKER_TOKEN_SECRET`).
3. Esse token tem de ir no header `X-Speaker-Token` em qualquer pedido que "fale" nessa sala (`broadcast`, `speechToken`, `roomStarted`, `roomEnded`) — a API valida a assinatura e o `roomId` antes de aceitar.

## Embutir as legendas no site do evento

`https://<url>/display/<roomId>?lang=en&embed=1` num `<iframe>`:

```html
<iframe
  src="https://<url>/display/tribuna-presidencial?lang=en&embed=1"
  style="width:100%; height:100px; border:0;"
  title="Legendas ao vivo"
></iframe>
```

Uma por sala (`tribuna-presidencial`, `sala-campeoes-europeus`, `sala-taca-latina`). Sem `embed=1` (ex. só `?lang=en`), a mesma página serve para um monitor/TV dedicado, a ocupar o ecrã inteiro.

## Recursos Azure necessários

1. **Azure AI Speech** (Speech Service) — precisas da chave e da região.
2. **Azure SignalR Service** — cria um recurso em modo **Serverless** (obrigatório para os bindings do Azure Functions). Copia a *Connection String*. O tier **Free (F1)** chega para testar (20 ligações simultâneas, 20k mensagens/dia) — para o evento real, considera o tier **Standard** se esperares mais gente ligada ao mesmo tempo do que isso.
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

- A chave do Azure AI Speech nunca é enviada ao browser — o cliente pede um token temporário a `/api/speechToken`, válido por poucos minutos, e só depois de provar (via `X-Speaker-Token`) que sabe o PIN da sala.
- A agenda pública (`GET /api/agenda`) não inclui o PIN — só a versão server-side em `api/src/lib/agenda.ts` o tem.

## Limitações conhecidas / próximos passos

- A agenda é um ficheiro estático no código (`api/src/lib/agenda.ts`) — editar requer um novo deploy. Para editar sem tocar em código, o próximo passo seria mover isto para uma tabela (Azure Table Storage).
- O único idioma-alvo é inglês (`client/src/lib/languages.ts`) — decisão deliberada: cada idioma-alvo extra é uma mensagem SignalR adicional por cada broadcast (`api/src/functions/broadcast.ts` envia uma por idioma), e isso soma-se depressa contra a quota diária do tier Free. Adicionar um idioma-alvo volta a multiplicar esse volume.
- Trocar o idioma de origem (pt-PT ↔ en-US) a meio do dia exige parar e recomeçar a sessão da sala — a Azure Speech não suporta trocar isto com a sessão a correr. Se o orador já fala em inglês (`en-US`), não há legendas a traduzir (o próprio pedido de "Começar a falar" avisa e não liga o reconhecimento) — normal para um orador internacional a falar entre portugueses na mesma sala.
- O selo "AO VIVO" e o contador de participantes dependem de sinais explícitos (carregar em "Parar"/sair da página, ou fechar o separador normalmente, capturado via `navigator.sendBeacon`). Uma quebra de rede abrupta (wifi cai, bateria acaba) não é detetada — o contador só corrige quando a pessoa volta a entrar ou sai normalmente. Resolver isto por completo exigiria configurar *Upstream webhooks* no recurso SignalR para reagir a desligações reais.
