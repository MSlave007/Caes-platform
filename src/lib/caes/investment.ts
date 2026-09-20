/**
 * Il conto che interessa a chi ha casa.
 *
 * Il cliente finale non ha una fattura e non sa cos'è un CAES. Ha un pensiero
 * solo: «l'ho sempre voluto fare ma costa troppo». Quindi non gli serve sapere
 * quanto vale il certificato — gli serve sapere QUANTO GLI COSTA DAVVERO
 * cambiare, e in quanto tempo rientra.
 *
 * La catena è: prezzo di listino → meno il pagamento del certificato → meno
 * la deduzione fiscale → costo reale. Poi il risparmio annuo in bolletta dice
 * in quanti anni rientra.
 *
 * ⚠️ TUTTI I NUMERI DI COSTO SONO DA CONFERMARE. Non vengono da nessun
 * documento di progetto: sono ordini di grandezza di mercato. Prima di
 * mandarci traffico a pagamento vanno sostituiti con i prezzi veri dei
 * vostri installatori, altrimenti stiamo promettendo cifre che non
 * controlliamo.
 */

import { TARIFA_CAES_EUR_KWH, CUOTA_CLIENTE_DEFECTO_PCT } from './estimate'
import {
    PRECIO_KWH,
    RENDIMIENTO_ACTUAL,
    CUOTA_CLIMATIZACION,
    SCOP_POR_ZONA,
    ORE_ANUALES_ZONA,
    type SistemaActual,
    type Zona,
} from './consumer'

/** DA CONFERMARE — costo fisso di un'installazione: mano d'opera, idraulica, messa in servizio. */
export const COSTE_BASE_EUR = 4200

/** DA CONFERMARE — costo aggiuntivo per kW di potenza installata. */
export const COSTE_POR_KW_EUR = 720

/**
 * DA CONFERMARE — costo di rimpiazzare con lo STESSO tipo di impianto.
 *
 * È il confronto che conta davvero. Una caldaia che sta morendo va sostituita
 * comunque: la scelta non è «pompa di calore o niente», è «pompa di calore o
 * un'altra caldaia uguale». Quindi il denaro che il cliente mette in più per
 * scegliere l'aerotermia non è il prezzo pieno, è la differenza — ed è quella
 * che il risparmio in bolletta deve ripagare.
 */
export const COSTE_MISMO_SISTEMA: Record<string, number> = {
    gas: 2600,
    gasoleo: 3200,
    electrico: 1100,
}

/**
 * DA CONFERMARE — vita utile dell'apparecchio. Serve per dire quanto si
 * guadagna in totale, che è la domanda dopo «in quanto rientro».
 */
export const VIDA_UTIL_ANOS = 20

/** Incertezza mostrata come forbice attorno alla stima, ±. */
export const HORQUILLA = 0.18

/**
 * Deduzione sull'IRPF per interventi di miglioramento energetico
 * dell'abitazione. Dallo schema di processo: 30% del costo dell'impianto.
 * DA CONFERMARE — limiti, requisiti e finestra temporale.
 */
export const DEDUCCION_RENTA_PCT = 30

/** Quota del certificato che arriva al cliente: il residuo. */
const QUOTA_CLIENTE = CUOTA_CLIENTE_DEFECTO_PCT / 100

export type InvestmentInput = {
    sistema: SistemaActual
    facturaMensual: number
    zona: Zona
}

export type InvestmentResult = {
    /** Potenza stimata dell'apparecchio necessario, kW */
    potenciaKw: number
    /** Prezzo di listino stimato, € */
    costeBruto: number
    /** Estremi della forbice, € */
    costeMin: number
    costeMax: number
    /** Pagamento del certificato che arriva al cliente, € */
    pagoCaes: number
    /** Deduzione fiscale, € */
    deduccion: number
    /** Quello che gli costa davvero, € */
    costeNeto: number
    /** Risparmio in bolletta, €/anno e €/mese */
    ahorroAnual: number
    ahorroMensual: number
    /** Costo di rimettere lo stesso tipo di impianto, € */
    costeMismo: number
    /** Quanto costa in più scegliere l'aerotermia, € */
    sobrecoste: number
    /** Anni per rientrare del solo sovrapprezzo — il numero onesto e utile */
    anosRetorno: number
    /** Anni per rientrare dell'intero esborso, se non si sostituiva nulla */
    anosRetornoTotal: number
    /** Guadagno netto a dieci anni */
    balance10: number
    /** Guadagno netto su tutta la vita dell'apparecchio */
    balanceVida: number
    /** Anni di puro guadagno, dopo il rientro */
    anosGanancia: number
    /** Riduzione dei consumi, % */
    reduccionPct: number
}

const r0 = (n: number) => Math.round(n)

export function estimateInvestment({
    sistema,
    facturaMensual,
    zona,
}: InvestmentInput): InvestmentResult {
    const precio = PRECIO_KWH[sistema]
    const rendimiento = RENDIMIENTO_ACTUAL[sistema]
    const cuota = CUOTA_CLIMATIZACION[sistema]
    const scop = SCOP_POR_ZONA[zona]
    const horas = ORE_ANUALES_ZONA[zona]

    // Quanto della bolletta è clima e acqua calda, e quanta energia ci vuole
    const gastoActual = facturaMensual * 12 * cuota
    const kwhComprados = gastoActual / precio
    const kwhCalor = kwhComprados * rendimiento

    // La potenza si ricava dal calore che serve in un anno, non si chiede:
    // nessuno sa quanti kW ha la propria caldaia.
    const potenciaKw = Math.max(3, Math.round((kwhCalor / horas) * 2) / 2)

    const costeBruto = COSTE_BASE_EUR + COSTE_POR_KW_EUR * potenciaKw

    // Certificato: nasce dall'energia primaria risparmiata
    const kwhElectricos = kwhCalor / scop
    const kwhAhorrados = Math.max(0, kwhComprados - kwhElectricos)
    const pagoCaes = kwhAhorrados * TARIFA_CAES_EUR_KWH * QUOTA_CLIENTE

    // ⚠️ ASSUNZIONE DA CONFERMARE: la deduzione la applichiamo solo
    // all'aerotermia, non al rimpiazzo con una caldaia uguale. In Spagna la
    // deduzione per miglioramento energetico chiede di dimostrare una
    // riduzione della domanda o del consumo di energia primaria non
    // rinnovabile, cosa che una caldaia identica di norma non fa. Se invece
    // anche quella accede alla deduzione, il confronto va corretto: oggi
    // gioca a nostro favore.
    const deduccion = costeBruto * (DEDUCCION_RENTA_PCT / 100)
    const costeNeto = Math.max(0, costeBruto - pagoCaes - deduccion)

    const gastoNuevo = kwhElectricos * PRECIO_KWH.electrico
    const ahorroAnual = Math.max(0, gastoActual - gastoNuevo)
    const reduccionPct = gastoActual > 0 ? (ahorroAnual / gastoActual) * 100 : 0

    const costeMismo = COSTE_MISMO_SISTEMA[sistema] ?? 0
    const sobrecoste = Math.max(0, costeNeto - costeMismo)

    // Il rientro che mostriamo è quello sul sovrapprezzo, non sul totale:
    // il totale risponderebbe a una domanda che nessuno si pone davvero.
    const anosRetorno = ahorroAnual > 0 ? sobrecoste / ahorroAnual : Infinity
    const anosRetornoTotal = ahorroAnual > 0 ? costeNeto / ahorroAnual : Infinity
    const balance10 = ahorroAnual * 10 - sobrecoste
    const balanceVida = ahorroAnual * VIDA_UTIL_ANOS - sobrecoste
    const anosGanancia = Math.max(0, VIDA_UTIL_ANOS - anosRetorno)

    return {
        potenciaKw,
        costeBruto: r0(costeBruto),
        costeMin: r0(costeBruto * (1 - HORQUILLA)),
        costeMax: r0(costeBruto * (1 + HORQUILLA)),
        pagoCaes: r0(pagoCaes),
        deduccion: r0(deduccion),
        costeNeto: r0(costeNeto),
        ahorroAnual: r0(ahorroAnual),
        ahorroMensual: r0(ahorroAnual / 12),
        costeMismo: r0(costeMismo),
        sobrecoste: r0(sobrecoste),
        anosRetorno: Math.round(anosRetorno * 10) / 10,
        anosRetornoTotal: Math.round(anosRetornoTotal * 10) / 10,
        balance10: r0(balance10),
        balanceVida: r0(balanceVida),
        anosGanancia: Math.round(anosGanancia * 10) / 10,
        reduccionPct: r0(reduccionPct),
    }
}
