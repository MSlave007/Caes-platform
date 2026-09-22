import { estado, type EstadoId } from '@/lib/caes/status'
import { proveedor } from '@/lib/caes/proveedores'
import { VALIDEZ_ANOS } from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

/**
 * Quello che il cliente finale può vedere della sua pratica.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * Oggi il cliente non ha nessuna vista. Firma un Convenio con cui cede
 * un certificato, e poi silenzio. Quando si stufa chiama l'installatore,
 * che perde tempo a dirgli una cosa che il sistema sa già.
 *
 * ── PERCHÉ È UN ELENCO DI COSE DA MOSTRARE E NON DA NASCONDERE ────────
 *
 * Una pagina pubblica si costruisce al contrario delle altre: non si
 * parte da tutto togliendo quello che non deve uscire — perché il campo
 * aggiunto domani esce da solo — si parte da niente e si aggiunge una
 * cosa alla volta.
 *
 * Fuori restano, per sempre: il margine dell'agenzia, la commissione
 * dell'installatore, i documenti, l'estrazione, le note interne, il
 * motivo di un rifiuto. Il cliente non ha bisogno di sapere quanto
 * guadagna chi gli ha fatto il lavoro.
 *
 * ── I SOLDI ───────────────────────────────────────────────────────────
 *
 * La parte del cliente si mostra **solo da approvato in poi**, perché
 * prima non è decisa: il riparto si fissa in approvazione. Dare una
 * cifra che poi cambia è peggio che non darne nessuna — diventa la
 * cifra che il cliente ricorda, e la differenza diventa una
 * discussione.
 */

export type VistaCliente = {
    /** Dove. Serve al cliente per riconoscere quale pratica è. */
    direccion: string
    /** Chi gli ha fatto il lavoro. */
    instalador: string | null
    /** In che punto è, con parole sue. */
    titulo: string
    detalle: string
    /** Quanti passi su quanti, per la barra. */
    paso: number
    total: number
    /** Quando è stata aperta. */
    desde: string
    /**
     * L'ultimo movimento.
     *
     * La pagina dice «si aggiorna da sola», e chi la riapre dopo due
     * settimane si chiede se e' vero. Una data lo dimostra; la frase da
     * sola e' una promessa.
     */
    movida: string
    /**
     * Quello che gli tocca, in €. `null` finché non è deciso — che non è
     * lo stesso di zero, e va detto in modo diverso.
     */
    suParte: number | null
    /** Vero quando è finita bene. */
    cerrado: boolean
    /**
     * Cosa dice il Convenio, in lingua normale.
     *
     * `null` finché non c'è niente di firmato da spiegare.
     */
    queFirmo: string[] | null
}

/**
 * Il Convenio spiegato, senza avvocato e senza modello.
 *
 * ── PERCHÉ NON LO SCRIVE UN'INTELLIGENZA ARTIFICIALE ──────────────────
 *
 * Perché il Convenio è un modello fisso con dei buchi. Il riassunto è
 * la stessa cosa: una frase fissa con gli stessi buchi. Generarlo ogni
 * volta vorrebbe dire pagare per riscrivere un testo che sappiamo già,
 * con la possibilità che una volta esca sbagliato — su un contratto che
 * qualcuno ha firmato.
 *
 * Una frase scritta bene una volta e rivista da una persona vale più di
 * mille generate.
 *
 * ── PERCHÉ NON SOSTITUISCE NIENTE ─────────────────────────────────────
 *
 * Non è il contratto e non ne fa le veci. Serve perché un cliente che
 * capisce cosa ha firmato non chiama a marzo per chiedere se gli hanno
 * tolto qualcosa. Sulla pagina è etichettato come riassunto, e il
 * documento vero resta quello che ha firmato.
 */
function queFirmoElCliente(p: Project): string[] | null {
    // Prima dell'approvazione non c'è ancora un Convenio con dei numeri
    // dentro: spiegare un contratto che può ancora cambiare è peggio che
    // non spiegarlo.
    if (!['approved', 'issued', 'paid'].includes(p.status)) return null

    const sd = proveedor(p.proveedor)
    const suya = parteDelCliente(p)

    return [
        `Cediste a ${sd.etiqueta} el certificado de ahorro energético que genera tu instalación. El certificado pasa a ser suyo; la instalación sigue siendo tuya.`,
        suya === null
            ? 'A cambio recibes una cantidad, una sola vez.'
            : `A cambio recibes ${suya.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}, una sola vez. No es una cuota ni un descuento en la factura de la luz: es un pago.`,
        `El certificado vale ${VALIDEZ_ANOS} años y no te obliga a nada más: ni a mantener un contrato, ni a cambiar de compañía, ni a dejar entrar a nadie en tu casa.`,
    ]
}

/**
 * Le cinque tappe che vede il cliente.
 *
 * Non sono gli stati interni: «Enviado» e «Cambios solicitados» per lui
 * sono la stessa cosa — qualcuno ci sta lavorando e non tocca a lui.
 * Dargli lo stato preciso vorrebbe dire dargli una preoccupazione su cui
 * non può fare niente.
 */
const PASOS = 4

const TEXTOS: Record<
    EstadoId,
    { titulo: string; detalle: string; paso: number }
> = {
    draft: {
        titulo: 'Tu instalador está preparando la documentación',
        detalle:
            'Todavía no ha llegado nada a revisión. No tienes que hacer nada.',
        paso: 1,
    },
    submitted: {
        titulo: 'Estamos revisando la documentación',
        detalle:
            'Comprobamos que las facturas y los certificados dicen lo mismo y que cumple lo que pide la norma. Suele ser cosa de unos días.',
        paso: 2,
    },
    changes_requested: {
        // Il cliente non deve sapere che manca una carta: non e' colpa
        // sua e non puo' farci niente. Sapere che qualcuno ci sta
        // lavorando e' tutto quello che gli serve.
        titulo: 'Estamos revisando la documentación',
        detalle:
            'Hemos pedido a tu instalador un par de cosas para completarla. Él ya lo sabe; tú no tienes que hacer nada.',
        paso: 2,
    },
    approved: {
        titulo: 'Aprobado',
        detalle:
            'La documentación está verificada. Ahora el certificado se tramita con la empresa que lo registra oficialmente.',
        paso: 3,
    },
    issued: {
        titulo: 'El certificado ya existe',
        detalle:
            'Está emitido a tu nombre y cedido según el Convenio que firmaste. Falta que se venda y que llegue el dinero.',
        paso: 4,
    },
    paid: {
        titulo: 'Cobrado',
        detalle: 'El dinero ha llegado y el reparto está hecho.',
        paso: 4,
    },
    rejected: {
        titulo: 'Esta ayuda no ha podido seguir adelante',
        detalle:
            'Tu instalador puede contarte los detalles: es quien tiene el expediente completo.',
        paso: 0,
    },
}

/** Da approvato in poi il riparto è fissato, e la sua parte è un numero. */
function parteDelCliente(p: Project): number | null {
    const fijado = ['approved', 'issued', 'paid'].includes(p.status)
    if (!fijado) return null
    if (typeof p.savings_eur !== 'number') return null

    const instalador = (p.savings_eur * (p.installer_pct ?? 0)) / 100
    const resto = p.savings_eur - instalador
    const agencia = (resto * (p.agency_pct ?? 0)) / 100
    const suya = resto - agencia
    return suya > 0 ? Math.round(suya * 100) / 100 : 0
}

/**
 * La proiezione. Prende il fascicolo intero e ne fa uscire solo questo.
 *
 * È volutamente l'unico modo di costruire la pagina pubblica: così il
 * giorno in cui `projects` prende una colonna nuova, quella colonna non
 * compare da nessuna parte finché qualcuno non la scrive qui.
 */
export function vistaParaCliente(p: Project): VistaCliente {
    const e = estado(p.status)
    const t = TEXTOS[e.id] ?? TEXTOS.submitted

    return {
        direccion: p.address || 'Tu vivienda',
        instalador: p.installer_name ?? null,
        titulo: t.titulo,
        detalle: t.detalle,
        paso: t.paso,
        total: PASOS,
        desde: p.created_at,
        movida:
            (p as { updated_at?: string }).updated_at || p.created_at,
        suParte: parteDelCliente(p),
        cerrado: p.status === 'paid',
        queFirmo: queFirmoElCliente(p),
    }
}
