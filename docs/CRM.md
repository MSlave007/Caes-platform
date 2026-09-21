# Una vista da CRM per l'installatore — proposta

Scritta il 21 settembre 2026. È una proposta, non una cosa già fatta:
per questa non è stata scritta una riga di codice.

---

> **Aggiornamento del 21 settembre, sera.** Marco ha ribaltato la
> domanda: «magari il CRM non verrebbe nemmeno utilizzato
> dall'installatore ma dal capo degli installatori, per capire quanti
> clienti hanno e il cliente X a chi e assegnato».
>
> Costruita: `/admin/installers` — vedi **«Lo stesso conto, due
> altezze»** in fondo.
>
> **Il verdetto di Marco, lo stesso giorno:** «va bene cosi, pero
> chiaramente questa e piu una visione per vedere tutti gli
> installatori che abbiamo cosa stanno facendo. Non era proprio quello
> che chiedevo, chiaramente un CRM.»
>
> Quindi mettiamolo agli atti, perche fra un mese non si legga questo
> documento e si pensi che il CRM e fatto: **`/admin/installers` e la
> vista di rete, non il CRM.** Il CRM vero e quello descritto qui
> sotto — per cliente, con la cronologia e il contatto — e resta da
> fare. Il motore in `cartera.ts` serve a tutte e due, ma il motore non
> e il prodotto.
>
> Marco ha anche detto che un **filtro per installatore** dentro la
> vista di rete andrebbe bene. E piccolo e va fatto quando si riprende.

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

**Primo, sul «Muse» di Meta.** Marco ha chiarito che e la loro nuova
AI, e che semmai se ne riparla «successivamente, o con altre che ne
verranno». Quindi qui non si progetta niente: si prende nota che il
giorno in cui si aggancia qualcosa del genere, vale il punto qui sotto,
che non dipende da quale sia lo strumento.

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


---

# Lo stesso conto, due altezze

Il pezzo che mancava alla proposta qui sopra, e che e arrivato dalla
domanda di Marco.

Il conto non e «un CRM per l'installatore». E **una funzione sola,
applicata a due livelli diversi**:

> chi sta fermo, da quanti giorni, e quanti soldi ci sono sopra.

Cambia solo il soggetto.

| | soggetto | chi guarda | la domanda |
|---|---|---|---|
| **in basso** | i suoi clienti | l'installatore | quale cliente chiamo oggi? |
| **in alto** | i suoi installatori | il capo | quale installatore chiamo oggi? |

Per questo il calcolo sta in `src/lib/caes/cartera.ts` e non dentro una
pagina: perche la seconda vista non sia una copia della prima scritta
due volte. Due copie e il modo in cui, fra sei mesi, i due schermi
cominciano a mostrare numeri diversi per la stessa cosa — e da li non
si torna piu indietro, perche nessuno sa quale dei due ha ragione.

## Perche si comincia dall'alto

Tre motivi, e sono buoni.

**Il ruolo esiste gia.** L'agenzia c'e, ha il suo guscio, la sua
navigazione e i suoi permessi. La vista del capo si e potuta aprire
oggi. La vista dell'installatore avrebbe richiesto prima la cronologia
per cliente, che e piu lavoro.

**I dati bastano gia.** Chi blocca lo dice `estado(id).actor`, da
quanto lo dicono le date. Non serve niente di nuovo da riempire.

**Il capo ha un problema che l'installatore non ha.** L'installatore ha
quaranta clienti e in testa ce li ha. Il capo ha cinque installatori per
quaranta clienti ciascuno, e **in testa non ce li ha**. Il valore di uno
schermo e inversamente proporzionale a quanto chi lo guarda gia sa.

## Cosa mostra oggi `/admin/installers`

- **La fascia in cima**: chi ha roba ferma in mano, da quanti giorni, e
  quanti euro sono fermi con lui. Se non c'e niente, sparisce.
- **Ogni installatore**: clienti distinti, espedienti, fermi, incassato.
  Con una frase sotto il nome che dice la situazione a parole, perche i
  numeri da soli non dicono se e un problema.
- **L'ordine**: per urgenza, mai alfabetico.
- **Quattro situazioni**, derivate: `Te necesita` (fermo da oltre 7
  giorni in mano sua), `Dormido` (oltre 90 giorni di silenzio), `Nuevo`
  (appena arrivato: i numeri bassi sono l'inizio, non un problema),
  `Al dia`.
- **La ricerca trova anche i clienti**, ed e li che risponde al
  «il cliente X a chi e assegnato». Quando lo stesso cliente sta in
  mano a due installatori, lo segnala: e una cosa che nessun altro
  schermo puo far notare.
- **Aprendo una riga**, i suoi clienti, con quanti espedienti ciascuno.

## Cosa non c'e ancora, e in che ordine

1. **Assegnare un installatore a un espediente orfano** da qui. Oggi si
   vedono ma non si smistano.
2. **La stessa vista per l'installatore**, sui suoi clienti. Il motore
   e gia scritto e vale per tutti e due: manca la pagina.
3. **Il contatto** (Fase 2 sopra): «chiamato il giorno X», col bottone
   WhatsApp che scrive il messaggio da solo. Vale a tutte e due le
   altezze: il capo chiama l'installatore, l'installatore chiama il
   cliente.
4. **`Verificado` che persista.** Il bottone c'era ma non salvava
   niente — l'ho tolto. Un interruttore che non fa niente e peggio di
   un interruttore che non c'e.

## Una domanda ancora aperta

**Chi e «il capo degli installatori»?** Ci sono due letture, e portano
a due permessi diversi:

- **l'agenzia** — noi, che coordiniamo installatori di ditte diverse;
- **il titolare di una ditta** che ha sotto piu tecnici.

La vista e la stessa in tutte e due i casi. Cambia una cosa sola: su
quali installatori si affaccia. E un parametro, non un'altra pagina —
ma il giorno in cui serve la seconda lettura serve anche un livello che
oggi non c'e: la ditta, con dentro piu utenti.

Per adesso e costruita per l'agenzia, perche quel ruolo esiste.
