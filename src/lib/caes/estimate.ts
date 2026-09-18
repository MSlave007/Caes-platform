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
 */

/** Tariffa CAES: € per kWh di energia finale risparmiata (= 86 €/MWh). */
export const TARIFA_CAES_EUR_KWH = 0.086

/** Come sopra, espressa in MWh: è così che la scrivono nel settore. */
export const TARIFA_CAES_EUR_MWH = 86

/** Risparmio minimo sulla linea base per qualificarsi, %. */
export const AHORRO_MINIMO_PCT = 20

/** Tetto della commissione installatore, % sul totale. */
export const COMISION_MAXIMA_PCT = 30

/** Quota che tratteniamo noi come agenzia, % sul totale. */
export const MARGEN_AGENCIA_PCT = 25

/**
 * Quota che l'installatore trattiene di solito, % sul totale.
 * DA CONFERMARE — va tarata su quanto trattengono davvero i vostri.
 */
export const COMISION_TIPICA_PCT = 15

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
 */
export const DEMANDA_CALEFACCION_POR_ZONA: Record<string, number> = {
    A3: 25,
    B3: 45,
    C1: 70,
    C3: 90,
    D2: 105,
    D3: 120,
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
    /** Quota trattenuta dall'installatore, % del totale (0–30) */
    comisionInstaladorPct?: number
    /** Quota trattenuta dall'agenzia, % del totale */
    margenAgenciaPct?: number
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
    /** Quota dell'installatore, € */
    parteInstalador: number
    /** Quota dell'agenzia, € */
    parteAgencia: number
    /** Quello che arriva al cliente sul conto, una tantum, € */
    parteCliente: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function estimate({
    superficieM2,
    zona,
    sustituido,
    demandaAcsKwh,
    scop = SCOP_CALEFACCION,
    scopDhw = SCOP_ACS,
    comisionInstaladorPct = 25,
    margenAgenciaPct = MARGEN_AGENCIA_PCT,
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

    const comision = Math.min(comisionInstaladorPct, COMISION_MAXIMA_PCT)
    const parteInstalador = valorTotal * (comision / 100)
    const parteAgencia = valorTotal * (margenAgenciaPct / 100)
    const parteCliente = Math.max(0, valorTotal - parteInstalador - parteAgencia)

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
        parteInstalador: round2(parteInstalador),
        parteAgencia: round2(parteAgencia),
        parteCliente: round2(parteCliente),
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
