# Una vista da CRM per l'installatore — proposta

Scritta il 21 settembre 2026. È una proposta, non una cosa già fatta:
per questa non è stata scritta una riga di codice.

---

## La domanda vera

«Un CRM per i clienti dell'installatore» si può leggere in due modi, e
i due modi portano a due prodotti diversi.

**Lettura 1 — un posto dove l'installatore scrive.** Schede, note,
attività, «ultimo contatto», magari colonne da trascinare. È quello che
fa un CRM normale.

**Lettura 2 — un posto che dice all'installatore chi chiamare oggi, e
perché.** Non chiede niente: produce.

La prima la perdiamo. L'installatore ha già WhatsApp e ha già il
telefono, e quelli funzionano. Un secondo posto dove ricopiare a mano
quello che ha già fatto è lavoro in più che non gli restituisce niente:
dopo due settimane le schede sono vuote, e uno schermo con i campi
vuoti non è neutro, **mente**. Dice «nessuna attività» per un cliente
che l'installatore ha sentito ieri.

La seconda la vinciamo, e la vinciamo perché abbiamo una cosa che
WhatsApp non ha: **sappiamo a che punto è il fascicolo, e quanti soldi
ci sono attaccati**.

L'installatore non ha bisogno di un posto dove scrivere «chiamato
Josep». Ha bisogno che qualcuno gli dica: *«Josep ti sta aspettando da
sei giorni, e finché non manda il DNI quei 1.400 € restano fermi»*.

Quindi: **il CRM lo scriviamo noi, non lui.**

---

## Da dove escono i motivi per chiamare

Tre, e sono tutti e tre già calcolabili con i dati che abbiamo oggi.

### 1. Fermo per colpa del cliente

Il revisore ha chiesto qualcosa, o manca un documento che solo il
cliente può dare: il DNI, la firma sul Convenio, la firma sull'Anexo I.

Questa informazione esiste già — `TeToca` la mostra dentro il fascicolo,
con il motivo del revisore scritto per intero. Ma sta *dentro* il
fascicolo, e l'installatore ci arriva solo se ci entra.

Sulla scheda cliente diventa: *«Falta su DNI desde hace 6 días»*, con
sotto un bottone solo.

Questo non è «nudging» generico. È un fermo, e costa soldi adesso.

### 2. Fermo per colpa dell'orologio

Il CAE ha una finestra: l'attuazione va presentata entro un termine
dalla data di fine lavori. Un fascicolo con l'opera finita da due anni
e mezzo, ancora nel cassetto, sono soldi che stanno per evaporare.

**Questo motivo lo conosce solo la piattaforma**, perché solo la
piattaforma ha la data di fine attuazione. L'installatore non ce l'ha in
testa e non ce l'ha su WhatsApp.

È il caso in cui la vista si ripaga da sola la prima volta che si apre.

### 3. Silenzio dopo l'incasso

Fascicolo approvato e pagato da mesi, e poi più niente. Questo sì è
nudging nel senso classico, ed è il meno urgente dei tre — ma anche qui
possiamo essere specifici invece che generici, perché la fattura che
leggiamo con l'AI ci dice **cosa è stato sostituito e dove**. I clienti
del 2024 a cui è stata tolta una caldaia a gasolio sono esattamente
quelli i cui vicini sono il lavoro successivo.

---

## Quello che si scrive a mano è quasi niente

Vale la pena dirlo chiaro, perché è il punto che decide se la cosa
funziona o marcisce.

La cronologia di un cliente si può costruire **oggi, senza chiedere
niente a nessuno**, da:

- fascicoli creati, inviati, rimandati indietro, approvati, pagati —
  con il motivo del revisore testuale, che il server firma già
- documenti caricati, con la data
- documenti mandati a firmare, quando ci sarà Signaturit
- messaggi ed email partiti dalla piattaforma, quando ci sarà l'invio

Restano due sole cose da digitare: **una nota libera** e **«contattato
il giorno X, per telefono / WhatsApp»**.

E quelle due si meritano il loro posto solo *dopo* che la cronologia
automatica esiste — perché allora la nota cade dentro un flusso che vale
già la pena aprire, invece che dentro una pagina vuota.

---

## Le fasi

### Fase 1 — L'agenda. Niente da digitare.

Tutto derivato, nessun campo nuovo da riempire a mano.

- In cima a `/installer/clientes`, una fascia: **«Hoy: 3 clientes te
  están esperando»**. Se sono zero lo dice e sparisce — una fascia che
  c'è sempre si smette di leggere.
- Ogni scheda cliente prende uno stato che **non è una fase di vendita**,
  è la verità di adesso:
  `Te esperan a ti` · `Esperando al cliente` · `En revisión` ·
  `Cobrado` · `Sin movimiento desde…`
- La pagina del singolo cliente prende la **cronologia**, costruita dai
  fascicoli. Zero input.
- L'ordine dell'elenco è «chi blocca e da quanto», non alfabetico.
  L'ordine alfabetico è l'ammissione che non sappiamo cosa è importante.

Costo: medio. Nessuna colonna nuova obbligatoria — gli eventi si
ricavano dalle date già su `projects` e dalle firme che il server timbra
dentro `firmar()`.

### Fase 2 — Il contatto. Un campo e un bottone.

- Bottone **«Contactado»** sulla scheda: scrive `last_contact_at`,
  `last_contact_via` (whatsapp / llamada / email) e una riga di nota
  facoltativa. Un tocco, dalla scheda, senza aprire un modulo.
- Bottone **WhatsApp**: apre `wa.me/<telefono>?text=<testo già scritto>`.
  Non serve nessuna API, non costa niente, funziona dal telefono — e **il
  testo lo generiamo noi dal motivo vero del fermo**: «Hola Josep, para
  poder terminar tu ayuda me falta una foto de tu DNI por las dos
  caras…». Premerlo registra anche il contatto.

**Qui sta il trucco di tutta la proposta.** L'installatore riceve valore
(il messaggio è già scritto) nello stesso gesto in cui lascia il dato (il
contatto è registrato). Il campo si riempie da solo, perché riempirlo non
è il prezzo: è l'effetto collaterale di una cosa che voleva fare comunque.

Costo: piccolo. Due colonne su `clientes` e una tabella `contactos`.

### Fase 3 — L'invio vero.

Dipende da due cose già in coda per altri motivi: il **fornitore email**
(blocca anche la conferma di registrazione e gli avvisi del revisore) e
**Signaturit**.

Quando ci sono, «manda il Convenio da firmare» diventa un'azione dalla
scheda cliente, e la cronologia registra mandato / aperto / firmato.

Costo: zero in più rispetto a quelle due integrazioni.

### Fase 4 — Trovare clienti nuovi. Da parlarne.

Qui devo essere onesto su due punti.

**Primo: non so cosa sia «Muse, la nuova ID Meta».** Non l'ho
riconosciuta, e non voglio costruire una proposta su una cosa che sto
indovinando. Mandami un link e ci ragiono sopra davvero.

**Secondo, e vale comunque qualunque cosa sia:** mandare i dati dei
clienti a una piattaforma pubblicitaria per cercare «persone simili» è un
trasferimento di dati personali a un terzo, per una finalità diversa da
quella per cui sono stati raccolti. Il cliente ha dato il suo DNI per
ottenere un aiuto CAE, non per fare da seme a un pubblico simile. Il GDPR
chiede per quello una base giuridica sua — consenso separato ed esplicito
— e oggi nella piattaforma non c'è niente che la copra.

Non è un motivo per non farlo. È un motivo perché stia in una corsia
separata, costruita sui dati che **l'installatore** possiede e su un
consenso raccolto per quello, e non sul mucchio dei fascicoli.

E vale la pena dire qual è l'asset migliore che abbiamo per trovare
clienti, che non è Meta: **sappiamo, installatore per installatore, che
impianto è stato sostituito e in che via**. L'aiuto CAE è un motivo per
cui chiama il vicino. È un canale nostro, legale, e non lo paghiamo.

---

## Quello che non costruiamo

- **Il kanban con le fasi da trascinare.** L'installatore ha quaranta
  clienti, non quattromila. Una colonna che deve spostare a mano è
  esattamente la cosa che dopo un mese è ferma a «in trattativa».
- **Valore del contratto, probabilità di chiusura, punteggio del lead.**
  Non è una pipeline di vendita. L'installatore sa quanto vale il lavoro.
- **Le sequenze email automatiche.** Mandare tre email da sole a qualcuno
  che ha dato il DNI per una pratica è il modo più veloce di trasformare
  un aiuto pubblico in spam.

---

## Una linea da tracciare adesso

**L'agenzia non deve vedere le note dell'installatore sui suoi clienti.**

Conviene deciderlo prima che quei dati esistano, non dopo. L'agenzia vede
i fascicoli, perché li deve revisionare. Il rapporto fra installatore e
cliente è dell'installatore. Se domani la piattaforma serve installatori
che si fanno concorrenza fra loro, questa riga è la differenza fra uno
strumento e un problema.

Tecnicamente è già così: `clientes` ha la regola di riga
`installer_id = auth.uid()`, e l'agenzia non ha una scorciatoia con la
chiave di servizio su quella tabella. **Va mantenuto**: il giorno che
serve mostrare il cliente al revisore durante la revisione, si mostrano i
dati del fascicolo, non la scheda.

---

## Se si deve scegliere una cosa sola

La **Fase 1**, e dentro la Fase 1 il **punto 2: l'orologio**.

È l'unica delle tre che nessun altro strumento può dare all'installatore,
perché nessun altro strumento sa quando scade la finestra. Tutto il
resto, alla peggio, se lo ricorda lui.
