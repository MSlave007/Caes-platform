/**
 * Motore di calcolo CAES.
 *
 * ── CORREZIONI DEL 2 SETTEMBRE 2026, dallo schema di processo ──────────
 *
 * 1) LA TARIFFA. docs/REGULATIONS.md diceva «0,086 € per MJ/H». L'unità era
 *    sbagliata: la tariffa è 86 € per MWh risparmiato, cioè 0,086 €/kWh.
 *    Numero identico, unità diversa — ma scritta su una landing, «€/MJ·H»
 *    è un errore che un tecnico del settore nota subito.
 *
 * 2) LA RIPARTIZIONE. docs/MARGIN_LOGIC.md divideva il valore fra
 *    installatore, agenzia e una «riserva» senza destinatario. Nel processo
 *    vero il grosso va AL CLIENTE, come pagamento una tantum dello Stato sul
 *    suo conto. Installatore e agenzia trattengono una percentuale; il resto
 *    è del cliente. È il contrario di quello che avevo implementato.
 */

/** Tariffa CAES: € per kWh di energia primaria risparmiata (= 86 €/MWh). */
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
 *
 * Non è il tetto: il tetto è COMISION_MAXIMA_PCT. Questa è la quota tipica,
 * quella che usiamo nel calcolatore pubblico per stimare cosa arriva al
 * cliente. L'installatore decide caso per caso, quindi la cifra mostrata è
 * un «fino a», non una promessa.
 *
 * DA CONFERMARE — va tarata su quanto trattengono davvero i vostri.
 */
export const COMISION_TIPICA_PCT = 15

/** Validità del certificato emesso, anni. */
export const VALIDEZ_ANOS = 10

/**
 * Rendimento di una caldaia a gas quando manca il certificato energetico
 * precedente. Valore di default previsto dalla procedura.
 */
export const RENDIMIENTO_CALDERA_DEFECTO = 0.92

/** DA CONFERMARE — ore di funzionamento annue per zona climatica. */
export const ORE_ANUALES_POR_ZONA: Record<string, number> = {
    A3: 1400,
    B3: 1650,
    C1: 1800,
    C3: 1900,
    D2: 2100,
    D3: 2150,
    E1: 2400,
}

/** Rendimento dell'impianto sostituito. */
export const COP_EQUIPO_SUSTITUIDO: Record<string, number> = {
    termo_electrico: 1.0,
    caldera_gas: RENDIMIENTO_CALDERA_DEFECTO,
    caldera_gasoleo: 0.85,
}

/** DA CONFERMARE — SCOP medio dell'aerotermia installata. In produzione
 *  va letto dalla scheda tecnica dell'apparecchio, non stimato. */
export const COP_AEROTERMIA = 3.0

export type EstimateInput = {
    potenciaKw: number
    zona: string
    sustituido: string
    /** Quota trattenuta dall'installatore, % del totale (0–30) */
    comisionInstaladorPct?: number
    /** Quota trattenuta dall'agenzia, % del totale */
    margenAgenciaPct?: number
}

export type EstimateResult = {
    kwhAntes: number
    kwhDespues: number
    kwhAhorrados: number
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
    potenciaKw,
    zona,
    sustituido,
    comisionInstaladorPct = 25,
    margenAgenciaPct = MARGEN_AGENCIA_PCT,
}: EstimateInput): EstimateResult {
    const horas = ORE_ANUALES_POR_ZONA[zona] ?? ORE_ANUALES_POR_ZONA.C3
    const copAntes = COP_EQUIPO_SUSTITUIDO[sustituido] ?? 1.0

    // Domanda termica annua: la stessa prima e dopo, cambia il rendimento.
    const demandaKwh = potenciaKw * horas

    const kwhAntes = demandaKwh / copAntes
    const kwhDespues = demandaKwh / COP_AEROTERMIA
    const kwhAhorrados = Math.max(0, kwhAntes - kwhDespues)

    const ahorroPct = kwhAntes > 0 ? (kwhAhorrados / kwhAntes) * 100 : 0

    // Qui la tariffa ufficiale, non più un coefficiente tarato a mano.
    const valorTotal = kwhAhorrados * TARIFA_CAES_EUR_KWH

    const comision = Math.min(comisionInstaladorPct, COMISION_MAXIMA_PCT)
    const parteInstalador = valorTotal * (comision / 100)
    const parteAgencia = valorTotal * (margenAgenciaPct / 100)
    const parteCliente = Math.max(0, valorTotal - parteInstalador - parteAgencia)

    return {
        kwhAntes: Math.round(kwhAntes),
        kwhDespues: Math.round(kwhDespues),
        kwhAhorrados: Math.round(kwhAhorrados),
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
