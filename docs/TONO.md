# Come si scrive nella piattaforma

Scritto il 22 settembre 2026. È la parte riutilizzabile del playbook
commerciale (`business-canvas/playbook-installatori.html`): quello resta
il documento per chi telefona, questo è quello da rileggere prima di
scrivere una riga di testo che vede un installatore o un cliente finale.

Serve trenta secondi di lettura. Se ne serve di più, è scritto male.

---

## Chi legge

Un installatore riceve venditori per mestiere e riconosce la fuffa in
dieci secondi. Non è ostile: è allenato. Con lui **la competenza tecnica
è la tecnica di vendita**, e ogni parola astratta è un segnale che sta
parlando con l'ennesima agenzia.

Il cliente finale è un'altra persona: non ha un arretrato, non ragiona
per volumi, ha fatto un lavoro solo. Con lui la leva dell'urgenza è
debole e quella della competenza è inutile. Cambia il tono, non le
regole qui sotto.

---

## Le sei regole

1. **La perdita prima del guadagno.** «Tre anni di lavoro fatto, mai
   incassato» funziona; «puoi guadagnare» no. È la stessa cifra e non è
   una manipolazione: quei soldi erano suoi e stanno scadendo.

2. **L'intervallo intero, mai «fino a».** Il minimo è la parte che ti fa
   credere. Se dici 85–155, dì anche 85. «Fino a» è pubblicità e viene
   scartata.

3. **Nessun numero che non sai ricostruire.** Ogni cifra in interfaccia
   deve avere dietro una fonte o una formula. Se non ce l'ha, o non si
   scrive o si scrive da dove viene. Vale anche per i tempi: «quindici
   minuti» è un numero come gli altri.

4. **Vocabolario concreto.** Factura, albarán, RES060, caldera, kWh,
   bonifico, fotos. Mai soluzione, piattaforma, digitalizzazione,
   opportunità, ecosistema. L'astratto è il segnale numero uno che
   riconosce nei venditori.

5. **Ammetti il limite prima che lo trovi lui.** Chi dichiara il caso
   peggiore viene creduto sul resto. Vale per il margine dichiarato, per
   la forbice di prezzo, per quello che l'installatore deve comunque
   fare.

6. **L'unica urgenza è quella vera.** Tre anni dalla fine
   dell'installazione, scritti nella norma e verificabili. Se un
   installatore diffidente va a controllare e trova conferma, la tua
   credibilità sale di colpo; se trova una scadenza inventata, hai
   chiuso.

---

## Cinque cose da non scrivere mai

| Mai | Invece |
|---|---|
| «Tú solo instalas» / «non deve fare niente» | Dì cosa deve fare: fotografare la caldaia vecchia prima di smontarla, caricare la fattura. Dirgli «niente» fa perdere la pratica al primo intoppo. |
| «Tarifa oficial» sul prezzo del CAE | Il prezzo è di mercato e si negozia col soggetto delegato. Nel BOE ci sono il 20 %, il 30 %, i 10 anni e i 3 anni — non i 130 €/MWh. |
| «Hasta 10.000 € al año» | La forbice intera, con il minimo davanti. |
| «Oportunidad única, plazas limitadas» | Non ci sono fondi limitati e lo scoprirà. La scarsità vera ce l'hai già. |
| Una promessa di tempo senza misura dietro | O la misuri, o la togli. |

Il caso di confine: **«tú no tienes que presentar nada en ningún
sitio»** (in `consumer.ts`) va bene, perché è specifico e vero. La
regola non è non dire mai cosa non deve fare — è non dire mai «niente».

---

## Dove si applica

| Sezione | Cosa ne prende |
|---|---|
| `/[lang]` e `/[lang]/instaladores` | La leva della perdita (`ganancias`), la scadenza dei tre anni, il margine dichiarato invece che nascosto |
| Simulatore | La forbice, mai la cifra secca. Il numero prima di chiedere la registrazione: è reciprocità, non un regalo |
| `/subida` | «Tre foto prima di smontare» va insegnato nel punto in cui serve, non in una FAQ. È utile all'installatore anche se poi non firma |
| FAQ e onboarding | Le sette obiezioni del playbook sono già una FAQ scritta meglio. Ognuna ha sotto una domanda diversa da quella che sembra |
| `consumer.ts` | Il playbook ha una sezione dedicata al cliente finale, con due leve distinte: ha già installato / deve ancora installare |
| Email e notifiche all'installatore | Struttura: fai il calcolo prima di chiedere, chiudi su una pratica sola |

---

## Cosa è ancora aperto

Due cose che il playbook lascia scoperte e che si ripercuotono sul testo
della piattaforma:

- **I tempi di pagamento del soggetto delegato.** È l'unica obiezione
  senza risposta, ed è quella su cui l'installatore decide. Finché
  manca, in interfaccia non si scrive nessun tempo.
- **La tariffa vera.** In `proveedores.ts` i 130 €/MWh sono marcati
  `DA CONFERMARE` e il mercato 2026 sta fra 85 e 155. Se il prezzo reale
  del contratto Bettergy è più basso, tutti i numeri del sito vanno
  rivisti, non solo quello.

---

## Registro

**22 settembre 2026 — allineata la landing a queste regole.**

- `landing.ts` hero: «Tú solo instalas» → «Tú fotografías la caldera
  vieja antes de quitarla y subes la factura» (e la corrispondente
  inglese). Quello che gli si chiede è nel wizard, passo 1: adesso lo
  dice anche la home.
- I 130 €/MWh non sono più «tarifa oficial» né «vigente»: sono «nuestra
  tarifa de hoy». Il disclaimer del simulatore dichiara la forbice di
  mercato 85–155.
- Nella sezione «La normativa, en cuatro cifras» la scheda della tariffa
  è stata sostituita con i **tre anni dalla fine dell'obra**, che è una
  cifra davvero normativa — e la leva più forte che abbiamo. Il prezzo
  resta nell'hero e nel simulatore, dove è un calcolo e non una regola.
