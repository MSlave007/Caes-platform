# Analisi di sicurezza

Fatta il 19 settembre 2026 sul ramo `simulador-instalador-res060`, con il
server in esecuzione e il progetto Supabase collegato. Tutto quello che
segue è **verificato**, non dedotto dal codice: dove dico che una cosa è
aperta, l'ho aperta.

---

> **Questo documento e un diario, non una fotografia.** Le tornate
> sono in ordine di data e le piu vecchie raccontano cose che dopo
> sono state chiuse. **Lo stato di adesso sta in fondo**, sotto
> «Controllo del 21 settembre 2026, sera».

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

---

# Tornata del 21 settembre 2026 — i dati personali

Rivisto tutto il giro dell'utenza e dei file, perché da qui in avanti ci
sono dentro carte d'identità, fatture e foto di case di privati.

## Chiuso: chiunque poteva leggere i documenti di chiunque

`/api/documents/url` firmava QUALSIASI percorso a CHIUNQUE avesse una
sessione. Bastava registrarsi come installatore — la registrazione è
aperta — e chiedere il percorso di un documento altrui per ottenerne un
indirizzo valido cinque minuti.

C'era il controllo di AUTENTICAZIONE («chi sei») e mancava del tutto
quello di ACCESSO («questo è tuo»). Sono due domande diverse.

Adesso `src/lib/auth/propiedad.ts` risponde alla seconda: l'agenzia vede
tutto, l'installatore solo i file intestati a lui o citati nei suoi
espedienti.

## Chiuso: chiunque poteva CANCELLARE i file di chiunque

Stessa mancanza su `DELETE /api/upload`, con un effetto peggiore: non
una fuga di dati, una distruzione di dati. Stesso controllo.

## Chiuso: i percorsi erano indovinabili

I file si chiamavano `<marca temporale>-<5 caratteri di Math.random()>`.
`Math.random()` non è un generatore sicuro, la marca temporale è nota a
chi ha caricato, e cinque caratteri sono uno spazio piccolo. Adesso sono
`u/<id utente>/<uuid da crypto>`: imprevedibili, e soprattutto intestati
— un file senza padrone non esiste più.

## Chiuso: il recupero password non esisteva

Il link «¿La has olvidado?» puntava a una 404. Non è solo una scomodità:
senza recupero, l'unica strada è che qualcuno cambi la password per
conto di un altro, che è la pratica peggiore di tutte.

La pagina non dice se un indirizzo ha un account: risponderebbe diverso
a seconda, e diventerebbe un modo per farsi l'elenco degli installatori.

## Scelte, non conseguenze

- **La foto profilo sta nel bucket PRIVATO**, con gli stessi indirizzi
  firmati dei documenti. È la faccia di una persona: una URL permanente
  su un bucket aperto è quello che finisce indicizzato.
- **`/api/cuenta` non accetta un id.** Lavora sempre sull'utente della
  sessione. Una rotta che prende «di chi» è una rotta da proteggere, e
  quelle prima o poi restano scoperte — ne abbiamo appena trovate due.
- **Lista bianca dei campi scrivibili.** `role` non è fra quelli: senza,
  chiunque si scriverebbe `admin` con una chiamata sola. Una lista nera
  si dimentica del campo aggiunto domani, una bianca no.
- **Email e password si cambiano dal browser**, con la sessione viva.
  Cambiarle da un server per conto di un id è il modo di prendersi
  l'account di qualcuno.
- **Il cambio email chiede conferma sul vecchio indirizzo.** Se qualcuno
  entrasse in una sessione altrui, cambiare l'email sarebbe il primo
  passo per chiudere fuori il proprietario per sempre.

---

# Controllo del 21 settembre 2026, sera — stato verificato

Non dedotto dal codice: rifatto girando contro il server e contro
Supabase. Dove dico «chiuso», ho riprovato ad aprirlo.

## Il deposito dei documenti — CHIUSO

Era il buco piu grave aperto. Dopo l'SQL che hai lanciato, riprovato
oggi su quattro file del bucket con una richiesta anonima, senza
nessuna intestazione e con un parametro finto per scavalcare la cache
di Cloudflare:

```
4 file provati, scaricabili senza chiave: 0
```

Prima ne scendeva uno da 2,7 MB. Adesso l'origine risponde 400.

## Le API, provate da sconosciuto

Tutte le tredici rotte sotto `src/app/api` nominano la guardia
(`quienLlama` o `soloAgencia`): verificato file per file, nessuna
scoperta. E provate davvero, con la dimostrazione spenta dal cookie
`caes_sin_demo`:

```
401  GET   /api/projects          elenco fascicoli
401  GET   /api/clientes          schede clienti
401  GET   /api/drafts            bozze altrui
401  GET   /api/cuenta            il profilo
401  GET   /api/documents/url     firmare un percorso altrui
401  DEL   /api/upload            cancellare un file altrui
401  POST  /api/extract           la rotta che costa soldi
401  PATCH /api/projects/1        approvarsi da solo
401  POST  /api/projects (con id) scavalcare la PATCH
401  GET   /api/leads             i contatti commerciali
```

Le pagine: `/admin/*` e `/installer/*` rimandano tutte a
`/login?volver=…`. Restano pubbliche solo `/es`, `/login`,
`/forgot-password` e `/register`, che devono esserlo.

## Il limite di frequenza — ATTIVO

Non solo importato: provato. Venticinque chiamate di fila a
`/api/extract`:

```
20 risposte normali, poi 5 volte 429 — il primo alla chiamata 21
```

Il limite e 20 ogni 5 minuti, e scatta **prima** di toccare il modello
a pagamento. Lo stesso su `/api/upload` (40/5min), `/api/leads`
(5/10min) e `/api/clientes` (20/5min).

Vale la pena ripeterlo: e un contatore in memoria del processo. Ferma
un ciclo impazzito e uno che prova a indovinare, **non** ferma un
attacco distribuito, e si azzera a ogni riavvio. Per quello serve
qualcosa davanti (Cloudflare, o il rate limit di Supabase).

---

## Come stiamo, in una riga

**Le cose che facevano uscire i dati sono chiuse, e sono state chiuse
riprovandole.** Quello che resta non e un buco aperto: sono cose non
ancora costruite, e si sa quali sono.

## Resta aperto

1. **La registrazione e libera.** `/register` risponde 200 a chiunque.
   Il danno oggi e limitato — il trigger forza il ruolo `installer`, e
   `admin` si da solo a mano dal database — ma un estraneo puo crearsi
   un account e vedere il guscio dell'applicazione. **Si chiude quando
   l'agenzia puo creare gli account lei**, che e comunque il modello
   che vogliamo: «non e una piattaforma in cui uno entra perche l'ha
   trovata». Finche non c'e quella schermata, togliere `/register` vuol
   dire non poter creare nessuno.

2. **Niente registro di chi ha GUARDATO un documento.** Sappiamo chi ha
   confermato un dato e chi ha cambiato uno stato — il server timbra
   `por` e `en` dentro `firmar()`. Non sappiamo chi ha aperto il DNI di
   un cliente. Con dati personali dentro, prima o poi serve: e la
   domanda che fa un cliente quando chiede «chi ha visto le mie carte».

3. **Nessun fornitore email collegato.** Non e un buco di sicurezza ma
   ci somiglia: senza, la conferma di registrazione e il recupero
   password funzionano solo a meta, e l'installatore non viene avvisato
   quando il revisore gli rimanda indietro un fascicolo.

4. **Il limite di frequenza sta in memoria** (vedi sopra).

5. **Tre righe di prova** restano dentro `projects` (`Test`,
   `Demo Hotel Central`, `Test`). Vanno tolte prima dei dati veri.
