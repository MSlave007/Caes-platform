/**
 * Stima per il consumatore finale: quanto risparmia una famiglia che
 * sostituisce caldaia o resistenza elettrica con aerotermia.
 *
 * ⚠️ DA CONFERMARE — QUESTI NUMERI FINIRANNO IN PUBBLICITÀ
 *
 * Partiamo dalla bolletta reale che l'utente ci dichiara: è l'unico dato
 * onesto che abbiamo senza fare un sopralluogo. Da lì stimiamo quanta parte
 * è riscaldamento e acqua calda, quanto costerebbe la stessa quantità di
 * calore con una pompa di calore, e la differenza per dieci anni.
 *
 * I prezzi dell'energia sono medie di mercato, non tariffe ufficiali, e si
 * muovono parecchio: vanno riviste periodicamente o collegate a una fonte.
 * Gli SCOP per zona sono valori di settore ragionevoli, non dati BOE.
 *
 * NOTA DI MODELLO DI BUSINESS: in docs/MARGIN_LOGIC.md il valore del
 * certificato si ripartisce interamente fra installatore, agenzia e riserva —
 * al cliente finale non arriva nulla. Se vogliamo dirgli che il certificato
 * gli sconta l'installazione, quella quota va decisa e sottratta al resto.
 * QUOTA_CLIENTE_CAES qui sotto è il posto dove metterla.
 */

import {
    TARIFA_CAES_EUR_KWH,
    COMISION_TIPICA_PCT,
    MARGEN_AGENCIA_PCT,
} from './estimate'

/** DA CONFERMARE — prezzi medi dell'energia in Spagna, €/kWh. */
export const PRECIO_KWH = {
    gas: 0.09,
    gasoleo: 0.11,
    electrico: 0.15,
} as const

/** DA CONFERMARE — rendimento medio dell'impianto attuale. */
export const RENDIMIENTO_ACTUAL = {
    gas: 0.92,
    gasoleo: 0.85,
    electrico: 1.0,
} as const

/**
 * DA CONFERMARE — quota della bolletta che se ne va in riscaldamento e acqua
 * calda. Nel gasolio è quasi tutto; nell'elettrico la bolletta contiene anche
 * luci, elettrodomestici e tutto il resto.
 */
export const CUOTA_CLIMATIZACION = {
    gas: 0.75,
    gasoleo: 0.95,
    electrico: 0.45,
} as const

/**
 * DA CONFERMARE — SCOP medio della pompa di calore per zona.
 * Più fa freddo, meno rende: è il motivo per cui la zona conta davvero.
 */
export const SCOP_POR_ZONA = {
    norte: 2.8,
    centro: 3.1,
    levante: 3.4,
    sur: 3.6,
    islas: 3.5,
} as const

export type SistemaActual = keyof typeof PRECIO_KWH
export type Zona = keyof typeof SCOP_POR_ZONA

/**
 * DA CONFERMARE — ore di funzionamento annue per zona, usate per ricavare
 * la potenza dell'apparecchio dal fabbisogno di calore.
 */
export const ORE_ANUALES_ZONA: Record<Zona, number> = {
    norte: 2100,
    centro: 1900,
    levante: 1500,
    sur: 1300,
    islas: 1200,
}

/**
 * Quota del certificato che resta al cliente: tutto quello che non
 * trattengono installatore e agenzia. Nel processo reale è un pagamento
 * una tantum dello Stato sul suo conto, non uno sconto sull'installazione.
 */
export const QUOTA_CLIENTE_CAES =
    (100 - COMISION_TIPICA_PCT - MARGEN_AGENCIA_PCT) / 100

/** Orizzonte usato nella cifra grande: coincide con la validità del certificato. */
export const HORIZONTE_ANOS = 10


export type ConsumerInput = {
    /** Impianto attualmente in casa */
    sistema: SistemaActual
    /** Bolletta mensile media dichiarata, € */
    facturaMensual: number
    /** Zona climatica semplificata */
    zona: Zona
}

export type ConsumerResult = {
    /** Spesa annua attuale per riscaldamento e acqua calda, € */
    gastoActual: number
    /** Spesa annua stimata con aerotermia, € */
    gastoNuevo: number
    /** Risparmio in bolletta, €/anno */
    ahorroAnual: number
    /** Risparmio in bolletta su dieci anni, € */
    ahorroHorizonte: number
    /** Riduzione dei consumi, % */
    reduccionPct: number
    /** Valore pieno del certificato CAES generato, € */
    valorCaes: number
    /** Pagamento una tantum che arriva al cliente sul conto, € */
    descuentoCliente: number
    /** Cifra grande: bolletta su dieci anni + sconto sull'installazione */
    total: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function estimateConsumer({
    sistema,
    facturaMensual,
    zona,
}: ConsumerInput): ConsumerResult {
    const precio = PRECIO_KWH[sistema]
    const rendimiento = RENDIMIENTO_ACTUAL[sistema]
    const cuota = CUOTA_CLIMATIZACION[sistema]
    const scop = SCOP_POR_ZONA[zona]

    // Quanto della bolletta è davvero clima e acqua calda
    const gastoActual = facturaMensual * 12 * cuota

    // Energia acquistata oggi, e calore che ne esce
    const kwhComprados = gastoActual / precio
    const kwhCalor = kwhComprados * rendimiento

    // Stessa quantità di calore, prodotta con la pompa di calore
    const kwhElectricos = kwhCalor / scop
    const gastoNuevo = kwhElectricos * PRECIO_KWH.electrico

    const ahorroAnual = Math.max(0, gastoActual - gastoNuevo)
    const reduccionPct = gastoActual > 0 ? (ahorroAnual / gastoActual) * 100 : 0

    // Il certificato nasce dai kWh di energia primaria risparmiati
    const kwhAhorrados = Math.max(0, kwhComprados - kwhElectricos)
    const valorCaes = kwhAhorrados * TARIFA_CAES_EUR_KWH
    const descuentoCliente = valorCaes * QUOTA_CLIENTE_CAES

    const ahorroHorizonte = ahorroAnual * HORIZONTE_ANOS

    return {
        gastoActual: r2(gastoActual),
        gastoNuevo: r2(gastoNuevo),
        ahorroAnual: Math.round(ahorroAnual),
        ahorroHorizonte: Math.round(ahorroHorizonte),
        reduccionPct: Math.round(reduccionPct),
        valorCaes: Math.round(valorCaes),
        descuentoCliente: Math.round(descuentoCliente),
        total: Math.round(ahorroHorizonte + descuentoCliente),
    }
}
