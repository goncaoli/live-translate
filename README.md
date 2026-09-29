# Live Translate

Legendas em tempo real no telemóvel de cada participante, via QR Code, em vez de num ecrã partilhado.

```
🎤 Orador fala (pt-PT)
        │
        ▼
Azure AI Speech (Speech Translation, streaming)
        │
        ▼
Azure Functions API  ──negotiate/joinGroup──▶  Azure SignalR Service
        │                                            │
        └──────────── broadcast por grupo ───────────┘
                                                       │
                                    ┌──────────────────┼──────────────────┐
                                    ▼                  ▼                  ▼
                              📱 Pessoa A        📱 Pessoa B        📱 Pessoa C
                              (EN, via QR)       (ES, via QR)       (FR, via QR)
```

## Estrutura

- `client/` — React + Vite + TypeScript. Três páginas: `HomePage`, `SpeakerPage` (cria sessão, mostra QR, capta e traduz o microfone) e `ViewerPage` (escolhe idioma, mostra legendas em tempo real).
- `api/` — Azure Functions (Node/TypeScript, programming model v4). Endpoints:
  - `POST/GET /api/negotiate` — devolve as credenciais de ligação ao Azure SignalR Service para o browser.
  - `POST /api/joinGroup` — junta uma ligação SignalR ao grupo `sessionId:lang`.
  - `POST /api/broadcast` — recebe o texto original + traduções por idioma e envia para cada grupo `sessionId:lang`.
  - `POST /api/presence` — avisa o grupo `sessionId:presence` quando alguém entra (o orador subscreve este grupo para mostrar quantos participantes estão ligados).
  - `GET /api/speechToken` — emite um token temporário do Azure AI Speech (a chave nunca vai para o browser).
- `client/public/staticwebapp.config.json` — configuração do Azure Static Web Apps (SPA fallback). Tem de estar dentro de `client/`, não na raiz — é aí que o Azure vai procurá-la, já que o `App location` do build é `/client`.

Cada sessão é identificada por um código curto gerado no browser do orador (ex. `X7K2QP`); os grupos do SignalR são `<sessionId>:<idioma>`, por isso não é preciso base de dados — o próprio SignalR trata do encaminhamento.

## Recursos Azure necessários

1. **Azure AI Speech** (Speech Service) — já criado (região `eastus`). Precisas da chave e da região.
2. **Azure SignalR Service** — cria um recurso em modo **Serverless** (obrigatório para funcionar com Azure Functions bindings). Copia a *Connection String*.
3. **Azure Static Web Apps** — só é necessário quando fores publicar; liga o repositório e aponta:
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

Isto arranca o Vite (porta 5173) e o Functions host (`func start`), com o proxy da Static Web Apps CLI a servir tudo junto (tipicamente em `http://localhost:4280`). Abre esse URL no browser do orador. Para testar o QR num telemóvel, o telemóvel tem de conseguir alcançar esse endereço na mesma rede (ou usa um túnel como `ngrok`/`devtunnel`).

### Correr client e api em separado (alternativa)

```bash
# terminal 1
npm run build --prefix api && npm run start --prefix api   # func start em :7071

# terminal 2
npm run dev --prefix client   # vite em :5173, aponta para /api via proxy
```

Neste modo define `VITE_API_BASE=http://localhost:7071/api` num `.env.local` dentro de `client/`.

## Notas de segurança

- A chave do Azure AI Speech nunca é enviada ao browser — o cliente pede um token temporário a `/api/speechToken`, válido por poucos minutos.
- Como as chaves foram partilhadas nesta conversa, considera regenerar a Key 1 no portal Azure (Azure AI services → Keys and Endpoint → Regenerate) antes de usar isto em produção, e mantém a Key 2 como reserva.

## Limitações conhecidas / próximos passos

- Os idiomas suportados estão fixos em `client/src/lib/languages.ts` — adicionar tradução para um novo idioma-alvo aumenta o custo/latência do Azure Speech Translation (cada idioma extra é uma stream adicional).
- Não há persistência de sessões: se o orador recarregar a página, gera-se um novo `sessionId` e o QR muda.
- Não há autenticação — qualquer pessoa com o link/QR entra na sessão.
