import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import { esquemaDe, esquemaJsonDe, instruccionesDe } from './lectura'

/**
 * Chi legge le carte.
 *
 * ── DUE FORNITORI, UN PROMPT SOLO ─────────────────────────────────────
 *
 * Il prompt e lo schema stanno in `lectura.ts` e non nominano nessuno:
 * sono generati dall'elenco dei campi. Qui ci sono solo le due manine che
 * lo consegnano — a Google o ad Anthropic — e riportano indietro la
 * stessa forma.
 *
 * Serve a rispondere a una domanda che oggi non ha risposta: quale legge
 * meglio una fattura spagnola scansionata storta. Si carica la stessa
 * fattura, si cambia una variabile d'ambiente, si guarda. Senza questo si
 * sceglierebbe per sentito dire, che su un dato che finisce in un
 * documento firmato non è un criterio.
 *
 * Quando la risposta si sa, il perdente si cancella e resta un file più
 * corto. Finché non si sa, tenerli tutti e due costa meno che indovinare.
 *
 * ── SI SCEGLIE DALL'AMBIENTE ──────────────────────────────────────────
 *
 *   LECTOR          'gemini' (predefinito) o 'claude'
 *   LECTOR_MODELO   sovrascrive il modello, se si vuole provarne un altro
 *
 * I prezzi, a settembre 2026, per milione di token (entrata/uscita):
 *
 *   gemini-3.1-flash-lite   0,25 /  1,50
 *   gemini-3.5-flash-lite   0,30 /  2,50
 *   gemini-3.8-flash        0,75 /  3,75     tariffa introduttiva, sale
 *                                            a 1,50 / 7,50 dal 2027
 *   claude-opus-5           5,00 / 25,00
 *
 * Una fattura di una pagina sono ~1.600 token in entrata e ~400 in
 * uscita: mezzo centesimo con il più caro dei Gemini, due centesimi con
 * Opus. Il prezzo, a questi volumi, non è un criterio.
 *
 * ── LA PROVA DEL 20 SETTEMBRE 2026 ────────────────────────────────────
 *
 * Su una fattura di prova costruita con tre trappole — domicilio fiscale
 * diverso dall'indirizzo dell'opera, un numero d'ordine interno che
 * somiglia a un codice di modello, e la base imponibile accanto al
 * totale — i tre Gemini hanno tirato fuori gli stessi identici valori, e
 * tutti e tre hanno evitato tutte e tre le trappole.
 *
 * A separarli è stata un'altra cosa: la CONFIDENZA. I due flash-lite la
 * restituiscono piatta — 0,95 su ogni campo l'uno, 1,0 su ogni campo
 * l'altro — cioè non la calcolano, la riempiono. `gemini-3.8-flash` l'ha
 * fatta variare, e l'ha abbassata proprio sull'indirizzo, che era il
 * campo ambiguo. Siccome la confidenza è quello che accende l'avviso
 * giallo e manda chi rivede ad aprire il documento, una confidenza finta
 * vale meno di nessuna confidenza: dice «va tutto bene» sempre, anche
 * quando non va.
 *
 * Per questo il predefinito è il flash e non il lite. La prova però era
 * su un PDF generato, con il testo dentro: dove i modelli si separano
 * davvero è sulle scansioni storte, e quelle si provano con le fatture
 * vere.
 */

export type Lector = 'gemini' | 'claude'

/** Quello che torna indietro, uguale per tutti e due. */
export type Lectura = Record<string, { valor: string; confianza: number }>

export type Carta = {
    documento: string
    /** Il file, in base64. */
    datos: string
    mime: string
}

const MODELO_POR_DEFECTO: Record<Lector, string> = {
    // Flash e non Pro: leggere una fattura è riconoscimento, non
    // ragionamento. Se sbaglia, il salto da fare è di modello, non di
    // taglia — e si vede cambiando questa riga.
    gemini: 'gemini-3.8-flash',
    claude: 'claude-opus-5',
}

export function lectorActivo(): Lector {
    return process.env.LECTOR === 'claude' ? 'claude' : 'gemini'
}

export function modeloActivo(lector: Lector = lectorActivo()): string {
    return process.env.LECTOR_MODELO || MODELO_POR_DEFECTO[lector]
}

/** La chiave del fornitore attivo. Manca → la rotta risponde 503. */
export function hayClave(lector: Lector = lectorActivo()): boolean {
    return Boolean(
        lector === 'gemini' ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY
    )
}

const IMAGEN = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif',
])

/** Risultato grezzo, prima della validazione. */
type Cruda = { texto: string; uso: { entrada?: number; salida?: number } }

/* ------------------------------------------------------------------ */
/*  Gemini                                                             */
/* ------------------------------------------------------------------ */

async function conGemini(carta: Carta, modelo: string): Promise<Cruda> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const adjunto = IMAGEN.has(carta.mime)
        ? ({ type: 'image', data: carta.datos, mime_type: carta.mime } as const)
        : ({ type: 'document', data: carta.datos, mime_type: 'application/pdf' } as const)

    const interaccion = await ai.interactions.create({
        model: modelo,
        system_instruction: instruccionesDe(carta.documento),
        // Il documento prima del testo: è la disposizione che dà le
        // letture migliori sulle scansioni storte.
        input: [adjunto, { type: 'text', text: 'Extrae los campos de este documento.' }],
        response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: esquemaJsonDe(carta.documento),
        },
    })

    return {
        texto: interaccion.output_text ?? '',
        uso: {
            entrada: interaccion.usage?.total_input_tokens,
            salida: interaccion.usage?.total_output_tokens,
        },
    }
}

/* ------------------------------------------------------------------ */
/*  Claude                                                             */
/* ------------------------------------------------------------------ */

async function conClaude(carta: Carta, modelo: string): Promise<Cruda> {
    const anthropic = new Anthropic()

    const adjunto: Anthropic.ContentBlockParam = IMAGEN.has(carta.mime)
        ? {
            type: 'image',
            source: {
                type: 'base64',
                media_type: carta.mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: carta.datos,
            },
        }
        : {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: carta.datos },
        }

    const respuesta = await anthropic.messages.create({
        model: modelo,
        max_tokens: 8000,
        system: instruccionesDe(carta.documento),
        messages: [
            {
                role: 'user',
                content: [adjunto, { type: 'text', text: 'Extrae los campos de este documento.' }],
            },
        ],
        output_config: { format: { type: 'json_schema', schema: esquemaJsonDe(carta.documento) } },
    })

    if (respuesta.stop_reason === 'refusal') {
        throw new Error('El modelo no ha querido leer este documento')
    }

    const texto = respuesta.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')

    return {
        texto,
        uso: {
            entrada: respuesta.usage.input_tokens,
            salida: respuesta.usage.output_tokens,
        },
    }
}

/* ------------------------------------------------------------------ */

export type Resultado = {
    lector: Lector
    modelo: string
    datos: Lectura
    uso: { entrada?: number; salida?: number }
}

/**
 * Leggere una carta.
 *
 * La risposta del modello si valida contro lo stesso schema che gli è
 * stato dato. Non è cerimonia: lo schema lo fa rispettare il fornitore,
 * ma è il fornitore stesso a poterlo sbagliare, e un campo mancante che
 * arriva fino al pannello diventa un `undefined` dentro un input.
 */
export async function leer(carta: Carta): Promise<Resultado> {
    const lector = lectorActivo()
    const modelo = modeloActivo(lector)

    const cruda =
        lector === 'gemini' ? await conGemini(carta, modelo) : await conClaude(carta, modelo)

    let crudo: unknown
    try {
        crudo = JSON.parse(cruda.texto)
    } catch {
        throw new Error('El modelo no ha devuelto JSON')
    }

    const validado = esquemaDe(carta.documento).safeParse(crudo)
    if (!validado.success) {
        throw new Error('La respuesta del modelo no encaja con los campos esperados')
    }

    return {
        lector,
        modelo,
        datos: validado.data as Lectura,
        uso: cruda.uso,
    }
}
