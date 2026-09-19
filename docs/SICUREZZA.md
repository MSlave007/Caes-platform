# Analisi di sicurezza

Fatta il 19 settembre 2026 sul ramo `simulador-instalador-res060`, con il
server in esecuzione e il progetto Supabase collegato. Tutto quello che
segue è **verificato**, non dedotto dal codice: dove dico che una cosa è
aperta, l'ho aperta.

---

## In una riga

Il database è protetto bene. L'applicazione davanti non lo era: l'area
agenzia si apriva senza login e quattro API rispondevano a chiunque. Ho
chiuso quelle. **Resta un buco grave che non posso chiudere io: il
deposito dei documenti è pubblico.**

---

## 1. Il deposito dei documenti è pubblico — DA CHIUDERE SUBITO

Il bucket `documents` è configurato come pubblico. Ho scaricato un file
da 2,7 MB **senza nessuna chiave**, con una richiesta anonima:

```
GET /storage/v1/object/public/documents/<nome-file>   →  200, 2.736.382 byte
```

In quel bucket ci sono oggi due file di prova. Quando ci finiranno i
fascicoli veri conterrà **carte d'identità, fatture e fotografie di case
di clienti**. Chiunque indovini o intercetti un nome di file li scarica.

Non posso chiuderlo io: serve la chiave con privilegi, e quella che avete
in `.env.local` non è valida (vedi punto 6).

**Cosa fare**, dal pannello Supabase, due minuti:

1. Storage → bucket `documents` → togliere la spunta *Public bucket*
2. Policies → consentire `select` e `insert` su `storage.objects` solo a
   utenti autenticati, e limitare al proprio fascicolo appena la tabella
   `projects` ha una colonna con l'id del proprietario
3. Cancellare i due file di prova che ci sono adesso

**Il codice è già pronto per il bucket privato.** L'ho cambiato oggi:
`/api/upload` non restituisce più un indirizzo pubblico permanente ma
solo il percorso, e per guardare un documento si chiede un indirizzo
**firmato e valido cinque minuti** a `/api/documents/url`, che prima
verifica chi sta chiedendo. Quindi quando chiudete il bucket non si
rompe niente: comincia a funzionare come deve.

---

## 2. Il middleware non è mai stato eseguito — CORRETTO

`middleware.ts` stava nella radice del progetto. Ma l'applicazione vive
in `src/`, e in quel caso Next.js cerca `src/middleware.ts`. L'ho
verificato con una sonda: nessun header di risposta, **non girava**.

Conseguenza doppia: nessun controllo di accesso, e nemmeno il rinnovo
della sessione Supabase, che è l'altro compito di quel file.

Spostato in `src/middleware.ts`.

---

## 3. Proteggeva una rotta che non esiste — CORRETTO

Anche una volta in funzione, l'unico controllo era:

```ts
request.nextUrl.pathname.startsWith('/dashboard')
```

In questo progetto `/dashboard` **non esiste**. Le aree vere sono
`/admin/*` e `/installer/*`, ed erano aperte a chiunque ne conoscesse
l'indirizzo: coda di revisione, margini dell'agenzia, elenco
installatori, impostazioni.

È il motivo per cui in tutta la sessione di ieri ho aperto l'area agenzia
senza mai fare login, e nessuno di noi due se n'era accorto.

---

## 4. Quattro API aperte — CORRETTE

| Rotta | Com'era | Cosa esponeva |
|---|---|---|
| `GET /api/leads` | nessun controllo | nome, telefono ed email di **tutti** i contatti |
| `GET·PATCH /api/projects/[id]` | nessun controllo | lettura e **modifica** di stato, risparmio e margine di qualsiasi pratica |
| `GET·POST /api/projects` | ripiegava sull'archivio dimostrativo per chi non aveva sessione | lettura e scrittura di tutte le pratiche |
| `POST /api/upload` | nessun controllo | caricamento libero nel deposito |

Tutte e quattro ora passano dal presidio in `src/lib/auth/guard.ts`.

---

## 5. Il caricamento non validava niente — CORRETTO

`/api/upload` accettava qualsiasi file, di qualsiasi dimensione, e
costruiva il percorso di destinazione **dal nome mandato dal client** —
che può contenere `../` o caratteri che cambiano dove finisce il file.

Ora: lista bianca di tipi (PDF e fotografie), tetto di 15 MB, e il nome
lo scriviamo noi partendo dal tipo dichiarato, mai da quello ricevuto.

---

## 6. La chiave segreta di Supabase non è valida — DA RIGENERARE

`SUPABASE_SECRET_KEY` in `.env.local` risponde:

```
401  "Unregistered API key" — not registered for this project
```

È nel formato nuovo (`sb_secret_…`) ma non appartiene a questo progetto,
o è stata revocata. Per fortuna **non è usata da nessuna parte nel
codice**, quindi non sta trapelando: semplicemente, qualsiasi operazione
che richieda privilegi di servizio oggi non può funzionare — compreso
chiudere il bucket via API.

Da rigenerare dal pannello Supabase e sostituire in `.env.local`.

---

## 7. Nessuna separazione dei ruoli — ANCORA APERTO

`getUserRole()` esiste in `src/lib/auth/roleDetection.ts` e **non è
chiamata da nessuna parte**. Oggi un account installatore autenticato può
aprire `/admin/settings` e vedere i margini dell'agenzia.

Chiuso l'accesso anonimo, questo diventa il rischio principale: non è
più «chiunque», ma è comunque «qualsiasi installatore registrato».

Il controllo va messo nel middleware, leggendo il ruolo dal profilo. Ho
lasciato la nota nel file. Serve che la tabella `profiles` sia popolata:
esiste, ed è leggibile.

---

## 8. La tabella `leads` non esiste — difetto funzionale

```
GET /rest/v1/leads  →  404  PGRST205: Could not find the table 'public.leads'
```

Le rotte `/api/leads` scrivono e leggono una tabella che non c'è, e non
hanno ripiego dimostrativo. Quindi la raccolta contatti dal calcolatore
pubblico **oggi fallisce in silenzio**. Non è un problema di sicurezza ma
va sistemato: o si crea la tabella, o si toglie la funzione.

---

## Quello che invece è a posto

**Le regole di accesso al database funzionano.** Ho provato a scrivere
nella tabella `projects` con la chiave pubblica — quella che finisce nel
browser di chiunque — e la riga è stata respinta:

```
401  42501: new row violates row-level security policy for table "projects"
```

**Le chiavi non sono mai entrate nel repository.** `.env*` è in
`.gitignore` dal principio, `.env.local` non compare nella storia di git,
e nessun file versionato contiene stringhe che somiglino a una chiave.

**La chiave Anthropic non è esposta.** Compare solo dentro un commento in
`/api/extract`. Quando la collegherete, resta in una route handler, cioè
lato server: **non va mai chiamata `NEXT_PUBLIC_`**, perché quel prefisso
la spedisce nel browser di tutti.

---

## Da fare quando colleghiamo l'estrazione AI

Non è ancora collegata, ma le decisioni vanno prese prima di scrivere il
codice, non dopo.

- **La chiave sta solo lato server.** Mai `NEXT_PUBLIC_`, mai in un
  componente client.
- **Limitare le chiamate per utente.** Ogni estrazione costa. Senza un
  tetto, un modulo lasciato aperto in un ciclo svuota il credito, e chi
  volesse farvi danno ci mette poco.
- **Non mandare i documenti nei log.** Una fattura o una carta d'identità
  finita in un log ci resta, e i log si esportano.
- **Trattare l'estratto come dato non fidato.** È l'uscita di un modello
  su un file mandato da un estraneo: va confermata in revisione campo per
  campo, non scritta dritta nel fascicolo. È anche il motivo per cui in
  revisione i valori vanno mostrati come *proposte*, con il documento
  accanto.

## Da fare quando colleghiamo le notifiche per email

- **Nessun link a documenti dentro le email.** Un indirizzo in una email
  passa per server che non controllate e resta nella casella per anni.
  Si manda un link all'applicazione, dove serve la sessione.
- **La chiave del servizio di invio sta lato server**, come quella AI.
- **Il consenso va raccolto e registrato**: se scrivete al cliente finale
  servono base giuridica e possibilità di disiscriversi.

---

## Ordine consigliato

1. **Chiudere il bucket** — è l'unico punto dove oggi ci sono dati veri
   di persone raggiungibili da chiunque
2. **Rigenerare la chiave segreta** — serve per il punto 1 e per tutto il
   resto lato server
3. **Separazione dei ruoli** — dopo l'accesso anonimo, è il buco più largo
4. **Tabella `leads`** — funzionale, non di sicurezza, ma è rotta adesso

I punti 2, 3 e 4 dell'elenco sono lavoro da poco. Il punto 1 sono due
minuti nel pannello e non richiede codice, perché il codice è già pronto.
