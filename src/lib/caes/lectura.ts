import { z } from 'zod'
import { camposDe, type CampoDef } from './extraction'

/**
 * Come si chiede a un modello di leggere una carta del fascicolo.
 *
 * ── IL PROMPT NON SI SCRIVE A MANO ────────────────────────────────────
 *
 * L'elenco dei campi lo tiene già `extraction.ts`, con etichetta, tipo,
 * unità e una riga che dice dove il dato si trova nella carta. Quella
 * riga è scritta per un umano che deve cercarlo in un PDF, ed è la stessa
 * cosa che serve a un modello. Riscriverla altrove vorrebbe dire tenere
 * due liste allineate a mano, e non si resta allineati: si aggiunge un
 * campo al pannello, ci si dimentica del prompt, e il campo resta vuoto
 * per sempre senza che nessuno capisca perché.
 *
 * Quindi il prompt si genera da lì, e lo schema della risposta pure.
 *
 * ── SI RISPONDE IN STRINGHE, E MAI NULL ───────────────────────────────
 *
 * Anche i numeri. Le fatture spagnole scrivono «4.850,00 €» e un parser
 * che indovina fra punto decimale e separatore di migliaia sbaglia di un
 * fattore mille, silenziosamente. Meglio farsi dare la cifra normalizzata
 * come testo, con la regola scritta nel prompt, e convertire in un punto
 * solo del codice dove si può controllare.
 *
 * Il campo assente è la stringa vuota, non `null`. Sembra un dettaglio ed
 * è la ragione per cui lo stesso schema gira su provider diversi: il
 * `nullable` è l'angolo in cui ogni API ha inventato la sua sintassi —
 * `anyOf`, `type: [..., "null"]`, `nullable: true` — e nessuna accetta
 * quella dell'altra. Una stringa che può essere vuota la capiscono
 * tutti.
 *
 * ── LA CONFIDENZA NON È UN ORNAMENTO ──────────────────────────────────
 *
 * È quella che accende l'avviso giallo nel pannello e manda chi rivede ad
 * aprire il documento. Se il modello la restituisse sempre alta non
 * servirebbe a niente, quindi il prompt dice esplicitamente quando deve
 * essere bassa.
 */

/** Contesto specifico per documento, quello che lo schema non può dire. */
const CONTEXTO: Record<string, string> = {
    factura: `Es una factura española de una instalación de bomba de calor aerotérmica, emitida por el instalador al cliente final.

Cómo está hecha una factura así:
- El EMISOR es la empresa instaladora. El DESTINATARIO o cliente es el particular. Los datos del cliente que se piden abajo son SIEMPRE los del destinatario, nunca los del emisor. Si dudas de cuál es cuál, el emisor es quien lleva el logotipo y el número de factura; el destinatario aparece bajo un epígrafe como «Cliente», «Facturar a» o «Datos del cliente».
- La dirección de la actuación puede no ser la misma que la fiscal del cliente. Si la factura distingue entre «domicilio fiscal» y «dirección de la obra», «lugar de instalación» o similar, toma la de la obra.
- El equipo aparece en una línea de detalle, con descripción larga. La marca y el modelo comercial suelen ir en esa descripción; el código de modelo es la referencia alfanumérica del fabricante, a veces bajo «Ref.», «Cód.» o entre paréntesis. El código de una línea de pedido del instalador NO es el código de modelo del fabricante.
- El importe que se pide es el TOTAL de la factura, IVA incluido: es la base sobre la que el cliente aplica su deducción.`,
}

/** Una riga della tabella dei campi, per il prompt. */
function fila(c: CampoDef): string {
    const tipo =
        c.tipo === 'numero'
            ? `número${c.unidad ? ` en ${c.unidad}` : ''}`
            : c.tipo === 'fecha'
                ? 'fecha'
                : c.tipo === 'opcion'
                    ? `una de: ${c.opciones?.map((o) => o.id).join(', ')}`
                    : 'texto'

    return `- ${c.id} — ${c.label} (${tipo})${c.ayuda ? `. ${c.ayuda}` : ''}`
}

export function instruccionesDe(documentoId: string): string {
    const campos = camposDe(documentoId)
    const contexto = CONTEXTO[documentoId]

    return `Lees documentos de expedientes CAE españoles (Certificados de Ahorro Energético) y extraes datos concretos. El expediente lo revisa después una persona que compara lo que tú digas con el documento abierto al lado.

${contexto ? `${contexto}\n\n` : ''}Extrae estos campos:

${campos.map(fila).join('\n')}

Reglas, y son la parte importante:

1. Un campo que no esté en el documento se devuelve como cadena vacía: "". No lo deduzcas, no lo calcules a partir de otro, no pongas un valor plausible. Un hueco se ve y se rellena a mano; un dato inventado se cuela en un documento que alguien firma y del que responde diez años.
2. Copia lo que pone, no lo que debería poner. Si el documento tiene una errata, la errata es el dato.
3. Números: devuélvelos normalizados, con punto decimal y sin separador de miles ni símbolo de moneda. «4.850,00 €» se devuelve como "4850.00". «2,5 kW» como "2.5".
4. Fechas: siempre AAAA-MM-DD. Las facturas españolas escriben 14/02/2026, que es "2026-02-14".
5. NIF/NIE: sin espacios ni puntos, la letra en mayúscula. Un NIE empieza por X, Y o Z.
6. Teléfonos: solo los dígitos, sin prefijo internacional si es español, sin espacios.
7. La confianza es tuya y tiene que ser honesta. Alta (0.9+) solo si el valor está escrito con todas las letras y lo has leído sin dudar. Baja (0.5 o menos) si el escaneo está borroso, el campo está cortado, hay dos candidatos posibles, o lo has entendido por el contexto y no porque lo ponga. Si un valor te ha costado, dilo bajando la confianza: es lo que hace que la persona que revisa abra el documento y lo mire. Poner 0.95 en todo hace inútil el aviso.
8. Para un campo vacío, la confianza es 0.`
}

/** Schema della risposta: un valore e una confidenza per campo. */
export function esquemaDe(documentoId: string) {
    const campos = camposDe(documentoId)

    const forma = Object.fromEntries(
        campos.map((c) => [
            c.id,
            z.object({
                valor: z
                    .string()
                    .describe(`${c.label}. Cadena vacía si no aparece en el documento.`),
                confianza: z
                    .number()
                    .min(0)
                    .max(1)
                    .describe('0 a 1. 0 si el valor está vacío.'),
            }),
        ])
    ) as Record<string, z.ZodTypeAny>

    return z.object(forma)
}

/**
 * Lo stesso schema in JSON Schema, che è quello che chiede Gemini.
 *
 * `$schema` va tolto: a Google non serve e certe versioni lo rifiutano.
 */
export function esquemaJsonDe(documentoId: string): Record<string, unknown> {
    const { $schema, ...resto } = z.toJSONSchema(esquemaDe(documentoId)) as Record<
        string,
        unknown
    >
    void $schema
    return resto
}

/** I documenti che oggi si sanno leggere. */
export function sePuedeLeer(documentoId: string): boolean {
    return camposDe(documentoId).length > 0
}
