/**
 * Motore di calcolo CAES — ficha RES060.
 *
 * ── RISCRITTURA DEL 18 SETTEMBRE 2026 ─────────────────────────────────
 *
 * La versione precedente stimava il risparmio come `potenza × ore di
 * funzionamento`. Non è così che si calcola un CAE: la ficha ufficiale
 * RES060 del MITECO non guarda la potenza dell'apparecchio, guarda la
 * DOMANDA dell'edificio presa dal certificato di efficienza energetica.
 *
 *   AETOTAL = FP · [ (DCAL · S) · (1/η − 1/SCOP) + DACS · (1/η − 1/SCOPdhw) ]
 *
 *   FP       fattore di ponderazione                                  = 1
 *   DCAL     domanda di riscaldamento da certificato       kWh/m²·anno
 *   S        superficie utile abitabile                              m²
 *   DACS     domanda di acqua calda sanitaria da certificato  kWh/anno
 *   η        rendimento della caldaia sostituita, su PCS         = 0,92
 *   SCOP     rendimento stagionale della pompa in riscaldamento
 *   SCOPdhw  rendimento stagionale della pompa in ACS
 *   AETOTAL  risparmio ANNUO di energia finale                 kWh/anno
 *
 * Due conseguenze pratiche rispetto a prima:
 *
 * 1) Il valore lo fa la SUPERFICIE, non i kW installati. Una villa grande
 *    in zona fredda vale tre volte un appartamento in zona mite, ed è la
 *    ragione per cui i certificati veri stanno sui 2.000–3.000 € mentre il
 *    vecchio motore ne calcolava 500–1.400.
 *
 * 2) C'è un SECONDO termine per l'acqua calda sanitaria che prima mancava
 *    del tutto: erano kWh risparmiati che non venivano contati.
 *
 * Il CAE si conta sul risparmio ANNUO: un CAE = 1 kWh/anno di energia
 * finale. La ficha registra anche Di, «duración indicativa de la
 * actuación» in anni, ma serve alla contabilità dell'obbligo, non
 * moltiplica il numero di certificati emessi.
 *
 * Fonte: MITECO, catálogo vigente de fichas, Ficha RES060.
 *
 * ── AGGIORNAMENTO DEL 20 SETTEMBRE 2026 ───────────────────────────────
 *
 * Tariffa portata a 130 €/MWh e ripartizione riscritta secondo il modello
 * commerciale deciso: noi tratteniamo una quota FISSA del 30 %, e il 70 %
 * che resta è il piatto che installatore e cliente finale si dividono.
 *
 * Il cursore muove solo la linea dentro quel 70 %: quello che non prende
 * l'installatore non svanisce, va al cliente, e la somma dei due non
 * cambia mai. È la ragione per cui il numero grande della landing è il
 * piatto intero e non la fetta dell'installatore — il piatto è un fatto,
 * la fetta è una sua decisione.
 */

/** Tariffa CAES: € per kWh di energia finale risparmiata (= 130 €/MWh). */
export const TARIFA_CAES_EUR_KWH = 0.13

/** Come sopra, espressa in MWh: è così che la scrivono nel settore. */
export const TARIFA_CAES_EUR_MWH = 130

/** Risparmio minimo sulla linea base per qualificarsi, %. */
export const AHORRO_MINIMO_PCT = 20

/**
 * Tetto della commissione installatore, % sul totale.
 *
 * È il limite normativo citato in docs/REGULATIONS.md, non una scelta
 * commerciale: sopra il 30 % l'accordo CAES non vale. Per questo il
 * cursore si ferma qui e non arriva a 70, anche se il piatto è del 70 %.
 */
export const COMISION_MAXIMA_PCT = 30

/**
 * Quota FISSA che tratteniamo noi per la gestione dell'expediente, % sul
 * valore del certificato. Non la muove il cursore: è il nostro prezzo, ed
 * è l'unica delle tre quote che non si negozia.
 */
export const CUOTA_CAES_PCT = 30

/**
 * Il piatto: quello che resta da ripartire fra installatore e cliente
 * finale, % sul totale. È il protagonista del simulatore — l'installatore
 * decide dove passa la linea, ma il piatto è sempre questo.
 */
export const POOL_REPARTIBLE_PCT = 100 - CUOTA_CAES_PCT

/**
 * Quanto del PIATTO tiene l'installatore per default, in % del piatto
 * stesso (0–100, non sul totale).
 *
 * È l'unità di misura giusta per la conversazione commerciale: il piatto
 * è quello che l'installatore e il suo cliente hanno da dividersi, e la
 * domanda è «di questo, quanto ne tengo io». Ragionare in percentuale sul
 * totale obbligherebbe a tenere a mente la nostra quota, che a loro non
 * interessa e che comunque non possono muovere.
 */
export const REPARTO_INSTALADOR_DEFECTO_PCT = 30

/** La stessa cosa espressa sul totale: è quello che maneggia il motore. */
export const COMISION_INSTALADOR_DEFECTO =
    (REPARTO_INSTALADOR_DEFECTO_PCT * POOL_REPARTIBLE_PCT) / 100

/** Conseguenza della riga sopra: quanto resta al cliente per default, %. */
export const CUOTA_CLIENTE_DEFECTO_PCT =
    POOL_REPARTIBLE_PCT - COMISION_INSTALADOR_DEFECTO

/** Da % del piatto a % del totale, e ritorno. */
export const repartoATotal = (pctPiatto: number) =>
    (pctPiatto * POOL_REPARTIBLE_PCT) / 100
export const totalAReparto = (pctTotal: number) =>
    POOL_REPARTIBLE_PCT > 0 ? (pctTotal * 100) / POOL_REPARTIBLE_PCT : 0

/** Validità del certificato emesso, anni. */
export const VALIDEZ_ANOS = 10

/** Fattore di ponderazione FP della ficha. */
export const FP = 1

/**
 * Rendimento della caldaia sostituita, riferito al PCS.
 * 0,92 è il valore di default scritto nella ficha RES060.
 */
export const RENDIMIENTO_CALDERA_DEFECTO = 0.92

/**
 * Domanda di riscaldamento per zona climatica, kWh/m²·anno.
 *
 * DA CONFERMARE — nella pratica va letta dal certificato di efficienza
 * energetica dell'abitazione, che è un documento obbligatorio del
 * fascicolo. Questi sono valori di riferimento per il parco esistente
 * (edifici pre-CTE, che sono quelli che si ristrutturano) e servono solo
 * a dare una stima prima di avere il certificato in mano.
 *
 * D3 è la zona di riferimento del simulatore ed è tarata a 130: è il caso
 * base su cui si ragiona. Le altre zone restano come stavano, e chi sta
 * altrove sceglie la sua dal menu.
 */
export const DEMANDA_CALEFACCION_POR_ZONA: Record<string, number> = {
    A3: 25,
    B3: 45,
    C1: 70,
    C3: 90,
    D2: 105,
    D3: 130,
    E1: 145,
}

/**
 * Rendimento dell'impianto sostituito.
 *
 * ATTENZIONE: la RES060 copre la «sustitución de caldera de combustión».
 * Il termo elettrico non è una caldaia a combustione, quindi a rigore non
 * rientra in questa ficha — resta qui perché il simulatore lo offre già,
 * ma prima di metterlo in produzione va verificato sotto quale ficha
 * ricade. DA CONFERMARE.
 */
export const RENDIMIENTO_EQUIPO_SUSTITUIDO: Record<string, number> = {
    termo_electrico: 1.0,
    caldera_gas: RENDIMIENTO_CALDERA_DEFECTO,
    caldera_gasoleo: 0.85,
}

/** DA CONFERMARE — SCOP medio in riscaldamento. In produzione va letto
 *  dalla scheda tecnica dell'apparecchio, non stimato. */
export const SCOP_CALEFACCION = 3.5

/** DA CONFERMARE — SCOP medio in produzione di acqua calda sanitaria.
 *  È sempre più basso di quello in riscaldamento. */
export const SCOP_ACS = 2.8

/**
 * Consumo di acqua calda: 28 litri al giorno a persona a 60 °C, come da
 * CTE DB-HE. In energia: 28 l × 1,16 Wh/(l·K) × 48 K ≈ 1,56 kWh al giorno
 * a persona, cioè circa 569 kWh l'anno.
 */
export const KWH_ACS_POR_PERSONA_ANO = Math.round(28 * 1.16 * 48 * 365) / 1000

/** Occupanti stimati dalla superficie, quando non si sa quanti sono. */
export function ocupantesEstimados(superficieM2: number): number {
    return Math.min(6, Math.max(2, Math.round(superficieM2 / 40)))
}

export type EstimateInput = {
    /** Superficie utile abitabile, m² — è questa a fare il valore. */
    superficieM2: number
    /** Zona climatica CTE: determina la domanda di riscaldamento. */
    zona: string
    /** Impianto sostituito: determina il rendimento di partenza. */
    sustituido: string
    /** Domanda ACS in kWh/anno; se omessa si stima dalla superficie. */
    demandaAcsKwh?: number
    /** SCOP in riscaldamento della pompa installata. */
    scop?: number
    /** SCOP in ACS della pompa installata. */
    scopDhw?: number
    /** Quota trattenuta dall'installatore, % del totale */
    comisionInstaladorPct?: number
    /** Quota fissa che tratteniamo noi, % del totale */
    cuotaCaesPct?: number
    /**
     * Tetto alla quota dell'installatore, % del totale.
     *
     * Di default è il limite normativo (30 %), ed è quello che deve valere
     * quando si firma davvero: la piattaforma non passa niente e resta
     * vincolata. Il simulatore della landing passa invece il piatto
     * intero, perché lì l'installatore sta esplorando come dividere con il
     * cliente e bloccarlo a metà corsa nasconderebbe il ragionamento.
     * Sopra il tetto normativo la schermata lo avvisa.
     */
    topeComisionPct?: number
}

export type EstimateResult = {
    /** Domanda di riscaldamento dell'abitazione, kWh/anno */
    demandaCalefaccion: number
    /** Domanda di acqua calda sanitaria, kWh/anno */
    demandaAcs: number
    /** Risparmio dal riscaldamento, kWh/anno */
    ahorroCalefaccion: number
    /** Risparmio dall'acqua calda sanitaria, kWh/anno */
    ahorroAcs: number
    /** AETOTAL: risparmio annuo di energia finale, kWh/anno */
    kwhAhorrados: number
    /** Energia finale consumata prima dell'intervento, kWh/anno */
    kwhAntes: number
    /** Energia finale consumata dopo, kWh/anno */
    kwhDespues: number
    ahorroPct: number
    cumpleMinimo: boolean
    /** Valore CAES totale generato, € */
    valorTotal: number
    /**
     * Il piatto: quello che resta dopo la nostra quota, e che installatore
     * e cliente si dividono. Non dipende da dove cade il cursore.
     */
    poolRepartible: number
    /** Quota dell'installatore, € */
    parteInstalador: number
    /** La nostra quota di gestione, € */
    parteCaes: number
    /** Quello che arriva al cliente, una tantum, € */
    parteCliente: number
    /** Dove è caduta la linea, in punti percentuali sul totale */
    comisionPct: number
    /** Il complemento della riga sopra dentro il piatto, punti sul totale */
    clientePct: number
    /** La stessa linea letta sul piatto: 0–100, è quella che vede l'utente */
    repartoInstaladorPct: number
    /** Complemento della riga sopra sul piatto, 0–100 */
    repartoClientePct: number
    /** true se si è passato il tetto normativo del 30 % sul totale */
    superaTopeLegal: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function estimate({
    superficieM2,
    zona,
    sustituido,
    demandaAcsKwh,
    scop = SCOP_CALEFACCION,
    scopDhw = SCOP_ACS,
    comisionInstaladorPct = COMISION_INSTALADOR_DEFECTO,
    cuotaCaesPct = CUOTA_CAES_PCT,
    topeComisionPct = COMISION_MAXIMA_PCT,
}: EstimateInput): EstimateResult {
    const dcal = DEMANDA_CALEFACCION_POR_ZONA[zona] ?? DEMANDA_CALEFACCION_POR_ZONA.C3
    const eta = RENDIMIENTO_EQUIPO_SUSTITUIDO[sustituido] ?? RENDIMIENTO_CALDERA_DEFECTO

    const demandaCalefaccion = dcal * superficieM2
    const demandaAcs =
        demandaAcsKwh ?? ocupantesEstimados(superficieM2) * KWH_ACS_POR_PERSONA_ANO

    // AETOTAL, i due termini della ficha RES060.
    const ahorroCalefaccion = FP * demandaCalefaccion * (1 / eta - 1 / scop)
    const ahorroAcs = FP * demandaAcs * (1 / eta - 1 / scopDhw)
    const kwhAhorrados = Math.max(0, ahorroCalefaccion + ahorroAcs)

    // Energia finale prima e dopo, per la verifica della soglia del 20 %.
    const kwhAntes = (demandaCalefaccion + demandaAcs) / eta
    const kwhDespues = demandaCalefaccion / scop + demandaAcs / scopDhw
    const ahorroPct = kwhAntes > 0 ? (kwhAhorrados / kwhAntes) * 100 : 0

    const valorTotal = kwhAhorrados * TARIFA_CAES_EUR_KWH

    // Il piatto è quello che resta dopo la nostra quota. Dentro il piatto il
    // cursore decide solo dove passa la linea: quello che non prende
    // l'installatore va al cliente, non a noi.
    const poolPct = Math.max(0, 100 - cuotaCaesPct)
    const comisionPct = Math.min(
        Math.max(0, comisionInstaladorPct),
        Math.min(topeComisionPct, poolPct)
    )
    const clientePct = poolPct - comisionPct

    // La stessa linea, letta sul piatto invece che sul totale: è l'unità in
    // cui il simulatore parla all'installatore.
    const repartoInstaladorPct =
        poolPct > 0 ? Math.round((comisionPct * 100) / poolPct) : 0

    return {
        demandaCalefaccion: Math.round(demandaCalefaccion),
        demandaAcs: Math.round(demandaAcs),
        ahorroCalefaccion: Math.round(ahorroCalefaccion),
        ahorroAcs: Math.round(ahorroAcs),
        kwhAhorrados: Math.round(kwhAhorrados),
        kwhAntes: Math.round(kwhAntes),
        kwhDespues: Math.round(kwhDespues),
        ahorroPct: round2(ahorroPct),
        cumpleMinimo: ahorroPct >= AHORRO_MINIMO_PCT,
        valorTotal: round2(valorTotal),
        poolRepartible: round2(valorTotal * (poolPct / 100)),
        parteInstalador: round2(valorTotal * (comisionPct / 100)),
        parteCaes: round2(valorTotal * (cuotaCaesPct / 100)),
        parteCliente: round2(valorTotal * (clientePct / 100)),
        comisionPct,
        clientePct,
        repartoInstaladorPct,
        repartoClientePct: 100 - repartoInstaladorPct,
        superaTopeLegal: comisionPct > COMISION_MAXIMA_PCT,
    }
}

/** Formattazione in euro con le convenzioni spagnole (1.234,56 €). */
export function eur(n: number, locale = 'es-ES') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n)
}
