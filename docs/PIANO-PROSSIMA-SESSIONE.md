# Piano — collegare installatore e gestione

Scritto il 18 settembre 2026, a fine sessione. Serve a riprendere domani
senza dover ricostruire niente.

---

## Da dove riparti

Ramo **`simulador-instalador-res060`**, due commit, working tree pulito.
`master` non è stato toccato.

```
9e1f6cc  feat: simulatore guadagni installatore e motore sulla ficha RES060
dea0bff  fix: fissa turbopack.root, la landing aveva perso tutti i colori
```

Per avviare: `npm run dev` dentro `caes-platform/`, poi
<http://localhost:3000>.

### Cosa funziona già

- Landing cliente (`/es`) con la domanda «¿Quién eres?» come prima tappa
- Pagina installatori (`/es/instaladores`) con il simulatore guadagni
  (`#ganancias`)
- Motore di calcolo riscritto sulla ficha RES060 ufficiale
- Le pagine di gestione (`/admin/*`) e quelle installatore
  (`/installer/*`) esistono e sono disegnate

### Cosa NON funziona — ed è il lavoro di domani

Il giro **installatore → coda di revisione** è interrotto in due punti.
Verificato, non dedotto:

1. **Il modulo dell'installatore non invia niente.**
   `src/app/installer/documentos/page.tsx` salva solo in `localStorage`
   tramite `src/lib/draft.ts`. Non esiste nessuna chiamata a un'API in
   tutto il percorso, tappa «Envío» compresa.

2. **La scrittura e la lettura non si incontrano.**
   `src/app/api/projects/route.ts`:
   - **GET** senza sessione → ripiega su `mockDb` (cinque pratiche
     scritte a mano, in memoria)
   - **POST** senza sessione → `401 Not authenticated`, e comunque
     scrive solo su Supabase, mai su `mockDb`

   Prova fatta: `POST /api/projects` con una pratica «PROVA Marco» →
   401, e la coda è rimasta a cinque.

L'unica cosa che fa una POST oggi è la scheda di revisione admin
(`src/components/admin/ProjectReviewForm.tsx`): quindi admin→admin
funziona, installatore→admin no.

---

## La decisione da prendere per prima

Tutto il resto dipende da questa, quindi va sciolta prima di scrivere
codice.

### Strada A — modalità dimostrativa (consigliata per domani)

Far scrivere la POST nel magazzino in memoria quando non c'è sessione,
esattamente come già fa la lettura. Nessun login, nessuna tabella.

- **Serve:** niente, solo codice
- **Ottieni:** il giro completo installatore → coda → approvazione,
  da provare a mano in pochi minuti
- **Limite:** i dati si azzerano a ogni riavvio del server. Va bene per
  giocarci e per mostrarlo, non per un pilota con installatori veri

### Strada B — Supabase per davvero

- **Serve:** tabella `projects` creata, politiche RLS, e il login
  funzionante per i due ruoli
- **Ottieni:** dati che restano, più utenti, base per il pilota
- **Limite:** non è più una prova, è metterlo in piedi. Le credenziali
  in `.env.local` ci sono già, ma la tabella va verificata

**Suggerimento:** fai A domani mattina, così vedi il giro funzionare e
capisci se il flusso ha senso. B quando decidi di far entrare il primo
installatore vero.

---

## Strada A, passo per passo

### 1. Far scrivere la POST anche senza sessione

`src/app/api/projects/route.ts`

Nel ramo `else` della POST, dove oggi c'è
`return NextResponse.json({ error: 'Not authenticated...' }, { status: 401 })`,
scrivere invece su `mockDb`. Serve un metodo di inserimento in
`src/lib/mockDb.ts` accanto a `getProjects()` — controllare cosa espone
già l'oggetto `mockDb` prima di aggiungerne uno.

Due accortezze:

- generare un id nuovo, non riusare quelli della demo (2477–2481)
- mettere `status: 'submitted'` e `source: 'installer'`, perché la coda
  admin filtra su quei due campi

### 2. Far inviare il modulo

`src/app/installer/documentos/page.tsx`

Alla tappa «Envío» aggiungere la `POST` a `/api/projects` con i dati
raccolti nelle tappe precedenti. Il payload minimo che la coda admin si
aspetta si legge da `mockDb.ts`, tipo `Project`: come minimo
`client_name`, `installer_name`, `savings_eur`, `installer_pct`,
`status`, `source`, `address`.

A invio riuscito: `clearDraft()` e rimandare a
`/installer/dashboard`.

### 3. Verificare che il giro si chiuda

In quest'ordine:

1. `/installer/documentos` → compila e invia
2. `/installer/dashboard` → la pratica c'è?
3. `/admin/review` → compare nella coda «Por revisar»?
4. Aprire la pratica, impostare il margine, approvare
5. `/admin/dashboard` → i numeri in alto sono cambiati?

Se il punto 3 fallisce, quasi certamente è il filtro su `status` o
`source`.

---

## Separato dal codice: le cose da chiudere con Bettergy

Sono marcate `DA CONFERMARE` nel codice, così non si perdono. Nessuna
richiede lavoro da parte tua, solo una risposta da loro.

1. **Il termo elettrico non è una caldaia a combustione**, quindi a
   rigore non rientra nella ficha RES060 — ma il simulatore lo offre
   come opzione. Sotto quale ficha ricade?
2. **La tariffa.** Nel codice è 86 €/MWh, che è il minimo della forbice
   di mercato 2025–26 (85–155, primo trimestre 2026 sui 90–100). Quanto
   spuntate davvero? Si cambia in una riga di
   `src/lib/caes/estimate.ts` e si aggiorna tutto il sito insieme.
3. **I valori DCAL per zona climatica.** Nel simulatore sono di
   riferimento, ma nella pratica si leggono dal certificato energetico
   del cliente — che è già un documento obbligatorio del fascicolo.
   Quindi il dato vero ce l'avete a ogni pratica: vale la pena leggerlo
   invece di stimarlo.
4. **I tempi di pagamento.** Resta l'unica obiezione del playbook senza
   risposta, ed è il punto in cui l'installatore decide.

---

## Un debito che si è creato oggi

I due documenti su claude.ai contengono simulatori che usano ancora la
**vecchia** formula (potenza × ore), quindi adesso **contraddicono il
sito**:

- Mappa CAES — <https://claude.ai/artifact/LKAtTFxYb29sgiFBpMznkU>
- Playbook installatori — <https://claude.ai/artifact/RraiEznZxkDDD5At4vu3ot>

Vanno allineati alla RES060 o tolti, prima che qualcuno li usi per
parlare con un installatore. Il playbook invece resta valido: i fatti
normativi e le leve non dipendono dalla formula.
