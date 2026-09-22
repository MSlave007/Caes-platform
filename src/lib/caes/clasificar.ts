import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import { DOCUMENTS, type Role } from '@/lib/documents'
import { lectorActivo, modeloActivo, type Carta } from '@/lib/caes/lectores'

/**
 * «Questo foglio, in che casella va?»
 *
 * ── PERCHÉ È UNA DOMANDA DIVERSA DA «LEGGI I CAMPI» ───────────────────
 *
 * `lectores.leer()` parte sapendo già che carta ha davanti: gli si dice
 * «questa è una fattura, tirane fuori l'importo». Qui non lo sappiamo:
 * arriva un mucchio di file e bisogna capire cos'è ognuno.
 *
 * Sono due prompt e due schemi, e mescolarli vorrebbe dire un prompt che
 * fa male tutte e due le cose.
 *
 * ── PERCHÉ SERVE ──────────────────────────────────────────────────────
 *
 * Perché sbagliare casella è l'errore che l'installatore fa più spesso:
 * la foto del vano finisce fra quelle dell'apparecchio nuovo, il
 * certificato «dopo» nella casella del «prima». E ogni sbaglio è un
 * altro giro di revisione.
 *
 * Chiedergli di indovinare la casella mentre è in piedi in un
 * pianerottolo è chiedergli il lavoro che sappiamo fare noi.
 *
 * ── NON DECIDE: PROPONE ───────────────────────────────────────────────
 *
 * Sotto la soglia il file va in «otras fotos o documentos», che è la
 * casella onesta per «non lo so». Metterlo in quella sbagliata con
 * sicurezza è peggio che non metterlo: chi rivede si fida della casella
 * e non riapre il file.
 */

/** Sotto questo, non si mette in nessuna casella precisa. */
export const CONFIANZA_MINIMA = 0.7

/**
 * La casella per «non ho capito cos'è».
 *
 * Non ne ho inventata una: è , «Otras fotos o documentos», che
 * esiste già fra le caselle e vuol dire esattamente questo. Aggiungerne
 * una nuova avrebbe creato due posti per la stessa cosa.
 */
export const CAJON = 'extras'

export type Clasificacion = {
    documento: string
    confianza: number
    /** Cosa ha visto, in una riga. Serve a chi rivede per capire l'errore. */
    porque: string
}

/**
 * Il catalogo delle caselle, scritto per il modello.
 *
 * Si genera da `DOCUMENTS` e non a mano, per lo stesso motivo per cui il
 * prompt di lettura si genera da `CAMPOS`: due liste da tenere allineate
 * a mano non restano allineate, e la casella aggiunta domani resterebbe
 * per sempre sconosciuta al classificatore.
 */
function catalogo(role: Role): string {
    return (DOCUMENTS[role] ?? DOCUMENTS.installer)
        .map((d) => {
            const extra = [d.why, d.checklist?.join('; ')].filter(Boolean).join(' ')
            return `- ${d.id} — ${d.label}${extra ? `. ${extra}` : ''}`
        })
        .join('\n')
}

function instrucciones(role: Role): string {
    return `Eres quien clasifica los papeles de un expediente de ahorro energético en España (instalación de aerotermia).

Te llega UN archivo. Di en cuál de estas casillas va:

${catalogo(role)}
- ${CAJON} — cualquier cosa que no encaje claramente en las de arriba

REGLAS
1. Si dudas entre dos casillas, contesta "${CAJON}" con confianza baja. Meter un papel en la casilla equivocada con seguridad es peor que no meterlo: quien revisa se fía de la casilla y no vuelve a abrir el archivo.
2. Distingue con cuidado los pares que se parecen:
   - certificado energético ANTES y DESPUÉS de la obra: mira la fecha y el equipo que describe.
   - foto del equipo NUEVO instalado y foto del HUECO donde estaba el anterior: en la segunda normalmente no hay máquina, o hay una vieja, o se ven tubos y marcas en la pared.
3. "confianza" de 0 a 1. Ponla baja de verdad cuando dudes: es lo que decide si el archivo se coloca solo o espera a una persona.
4. "porque" es una frase corta en español que diga QUÉ has visto para decidirlo. La lee alguien que revisa, y le sirve para pillar tu error.

Contesta solo JSON.`
}

const ESQUEMA = {
    type: 'object',
    properties: {
        documento: { type: 'string' },
        confianza: { type: 'number' },
        porque: { type: 'string' },
    },
    required: ['documento', 'confianza', 'porque'],
} as const

const IMAGEN = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif',
])

async function conGemini(carta: Carta, role: Role, modelo: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const adjunto = IMAGEN.has(carta.mime)
        ? ({ type: 'image', data: carta.datos, mime_type: carta.mime } as const)
        : ({ type: 'document', data: carta.datos, mime_type: 'application/pdf' } as const)

    const interaccion = await ai.interactions.create({
        model: modelo,
        system_instruction: instrucciones(role),
        input: [adjunto, { type: 'text', text: '¿En qué casilla va este archivo?' }],
        response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: ESQUEMA,
        },
    })
    return interaccion.output_text ?? ''
}

async function conClaude(carta: Carta, role: Role, modelo: string): Promise<string> {
    const anthropic = new Anthropic()
    const adjunto = IMAGEN.has(carta.mime)
        ? ({
              type: 'image' as const,
              source: {
                  type: 'base64' as const,
                  media_type: carta.mime as 'image/jpeg',
                  data: carta.datos,
              },
          })
        : ({
              type: 'document' as const,
              source: {
                  type: 'base64' as const,
                  media_type: 'application/pdf' as const,
                  data: carta.datos,
              },
          })

    const res = await anthropic.messages.create({
        model: modelo,
        max_tokens: 400,
        system: instrucciones(role),
        messages: [
            {
                role: 'user',
                content: [
                    adjunto,
                    { type: 'text', text: '¿En qué casilla va este archivo? Solo JSON.' },
                ],
            },
        ],
    })

    const texto = res.content.find((c) => c.type === 'text')
    return texto && texto.type === 'text' ? texto.text : ''
}

/**
 * Classifica un file.
 *
 * Non solleva mai per una risposta strana: restituisce il cassetto con
 * confidenza zero. Un file che arriva è un file che va salvato, anche
 * quando il modello non collabora — perderlo perché non sappiamo
 * etichettarlo sarebbe il modo peggiore di fallire.
 */
export async function clasificar(
    carta: Carta,
    role: Role = 'installer'
): Promise<Clasificacion> {
    const lector = lectorActivo()
    const modelo = modeloActivo(lector)

    const validos = new Set([
        ...(DOCUMENTS[role] ?? DOCUMENTS.installer).map((d) => d.id),
        CAJON,
    ])

    try {
        const texto =
            lector === 'gemini'
                ? await conGemini(carta, role, modelo)
                : await conClaude(carta, role, modelo)

        const j = JSON.parse(texto) as Partial<Clasificacion>
        const documento = String(j.documento ?? '')
        const confianza = Number(j.confianza)

        // Una casella inventata è peggio di nessuna casella: il modello
        // può restituire un id che non esiste, e finirebbe in un file
        // senza casa.
        if (!validos.has(documento) || !Number.isFinite(confianza)) {
            return { documento: CAJON, confianza: 0, porque: 'No se ha podido clasificar.' }
        }

        return {
            documento: confianza >= CONFIANZA_MINIMA ? documento : CAJON,
            confianza,
            porque: String(j.porque ?? '').slice(0, 300),
        }
    } catch {
        return { documento: CAJON, confianza: 0, porque: 'No se ha podido clasificar.' }
    }
}
