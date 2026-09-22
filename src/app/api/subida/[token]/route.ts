import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { dentroDelLimite, quienCuenta, demasiadas } from '@/lib/auth/ritmo'
import { clasificar, CAJON } from '@/lib/caes/clasificar'
import { DOCUMENTS, docLabel, type Role } from '@/lib/documents'
import { hayClave } from '@/lib/caes/lectores'

/**
 * La porta per caricare documenti senza entrare.
 *
 * ── COSA RISOLVE ──────────────────────────────────────────────────────
 *
 * Oggi: chi rivede chiede le carte, l'installatore entra, cerca il suo
 * espediente fra quaranta, e mette ogni file nella casella giusta.
 * Sbagliare casella è l'errore che fa più spesso — la foto del vano fra
 * quelle dell'apparecchio nuovo — e ogni sbaglio è un altro giro.
 *
 * Con questo: un link, si molla tutto insieme, e il modello smista.
 *
 * ── È UNA PORTA DI SCRITTURA SENZA PASSWORD ───────────────────────────
 *
 * Quindi vale la pena elencare cosa NON può fare, perché è la parte che
 * conta:
 *
 *   · non legge i documenti che ci sono già
 *   · non cancella niente, e non sovrascrive: aggiunge e basta
 *   · non dice il nome del cliente, l'indirizzo, né una cifra
 *   · vale per UN espediente, quello del token
 *   · scade, e si può uccidere mettendo la scadenza nel passato
 *
 * Il token è un uuid v4: 122 bit, non si indovina. Ma un indirizzo di
 * scrittura aperto per sempre è una responsabilità per sempre, e per
 * questo la scadenza non è un di più.
 *
 * ── PERCHÉ LA CHIAVE DI SERVIZIO ──────────────────────────────────────
 *
 * Perché qui non c'è nessun «tu»: le regole di riga su `projects`
 * parlano di `auth.uid()` e non c'è nessuna sessione. La chiave apre
 * tutto, quindi ogni query qui dentro è per token esatto e quello che
 * esce passa da una proiezione stretta — come nella pagina del cliente.
 */

export const maxDuration = 60

/** Un file per volta, e non enormi: è un telefono in un pianerottolo. */
const MAX_BYTES = 12 * 1024 * 1024
const TIPOS = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
])

type Proyecto = {
    id: string
    source: Role
    docs: { id: string; name: string; verified: boolean; path?: string }[] | null
    subida_caduca: string | null
    subida_nota: string | null
}

async function abrir(token: string): Promise<Proyecto | null> {
    const admin = createAdminClient()
    if (!admin) return null
    const { data } = await admin
        .from('projects')
        .select('id, source, docs, subida_caduca, subida_nota')
        .eq('subida_token', token)
        .maybeSingle()
    if (!data) return null

    // Scaduto è come non esistere. Non si distingue nella risposta: un
    // messaggio diverso direbbe a chi prova indirizzi che quel token è
    // esistito.
    if (data.subida_caduca && Date.parse(data.subida_caduca) < Date.now()) return null
    return data as Proyecto
}

/**
 * Cosa manca ancora, e nient'altro.
 *
 * Solo le ETICHETTE delle caselle vuote: né chi è il cliente, né dove
 * sta la casa, né quanto vale. Chi apre il link sa già di che obra si
 * tratta — glielo ha detto chi gliel'ha mandato.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params
    const p = await abrir(token)
    if (!p) return NextResponse.json({ error: 'caducado' }, { status: 404 })

    const puestos = new Set((p.docs ?? []).map((d) => d.id))
    const faltan = (DOCUMENTS[p.source] ?? DOCUMENTS.installer)
        .filter((d) => d.required && !puestos.has(d.id))
        .map((d) => ({ id: d.id, label: d.label, why: d.why }))

    return NextResponse.json({
        data: {
            /**
             * Una referencia corta, non l'id intero.
             *
             * Sul database gli id sono UUID, e «Expediente
             * #f449b9de-2c85-45fd-a6a2-f97024fb4f58» non dice niente a
             * nessuno: chi legge non lo riconosce e non lo puo ripetere
             * al telefono. Otto caratteri bastano a distinguere, e
             * quello che identifica davvero l'obra e la riga che scrive
             * chi rivede.
             */
            numero: String(p.id).slice(0, 8).toUpperCase(),
            nota: p.subida_nota,
            faltan,
            // Quanti ne ha già mandati in questa sessione di lavoro: gli
            // dice che sono arrivati, senza dirgli cosa c'era prima.
            recibidos: (p.docs ?? []).length,
        },
    })
}

/**
 * Riceve un file, lo classifica, lo mette dove va.
 *
 * Un file per chiamata: il telefono carica una foto alla volta e così
 * ognuna arriva a destinazione da sola, invece di perdersi tutte quando
 * la terza fallisce.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params

    // Il limite prima di tutto: è una porta pubblica.
    const LIMITE = { cuantas: 40, segundos: 600 }
    if (!dentroDelLimite(quienCuenta(request), LIMITE)) {
        return demasiadas(LIMITE.segundos)
    }

    const p = await abrir(token)
    if (!p) return NextResponse.json({ error: 'caducado' }, { status: 404 })

    const form = await request.formData().catch(() => null)
    const archivo = form?.get('archivo')
    if (!(archivo instanceof File)) {
        return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
    }
    if (archivo.size > MAX_BYTES) {
        return NextResponse.json(
            { error: 'El archivo pesa demasiado. Máximo 12 MB.' },
            { status: 413 }
        )
    }
    if (!TIPOS.has(archivo.type)) {
        return NextResponse.json(
            { error: 'Solo PDF o fotos.' },
            { status: 415 }
        )
    }

    const admin = createAdminClient()
    if (!admin) {
        return NextResponse.json({ error: 'No configurado' }, { status: 503 })
    }

    const bytes = Buffer.from(await archivo.arrayBuffer())

    // ── dove va ──────────────────────────────────────────────────────
    //
    // Senza lettore configurato non ci si ferma: il file si salva nel
    // cassetto e lo smista una persona. Perdere un documento perché non
    // sappiamo etichettarlo sarebbe il modo peggiore di fallire.
    let clasificacion = { documento: CAJON, confianza: 0, porque: '' }
    if (hayClave()) {
        clasificacion = await clasificar(
            { documento: '', datos: bytes.toString('base64'), mime: archivo.type },
            p.source
        )
    }

    // ── dove si salva ────────────────────────────────────────────────
    //
    // Sotto il prefisso dell'espediente e con un nome casuale: un
    // percorso indovinabile è un percorso che si scarica.
    const ext = archivo.name.split('.').pop()?.slice(0, 8) ?? 'bin'
    const ruta = `subidas/${p.id}/${crypto.randomUUID()}.${ext}`

    const { error: errSubida } = await admin.storage
        .from('documents')
        .upload(ruta, bytes, { contentType: archivo.type, upsert: false })

    if (errSubida) {
        return NextResponse.json(
            { error: 'No se ha podido guardar. Vuelve a probar.' },
            { status: 502 }
        )
    }

    // ── se lo aggiunge all'espediente ────────────────────────────────
    //
    // Si rilegge adesso invece di fidarsi della copia di prima: fra la
    // lettura e questa riga possono essere arrivati altri file, e
    // scrivere la lista vecchia li cancellerebbe.
    const { data: fresco } = await admin
        .from('projects')
        .select('docs')
        .eq('id', p.id)
        .maybeSingle()

    const docs = [
        ...((fresco?.docs ?? []) as Proyecto['docs'] as NonNullable<Proyecto['docs']>),
        {
            id: clasificacion.documento,
            name: archivo.name.slice(0, 180),
            // Mai verificato: lo ha mandato qualcuno senza entrare, e
            // «verificato» vuol dire che una persona lo ha guardato.
            verified: false,
            path: ruta,
        },
    ]

    await admin.from('projects').update({ docs }).eq('id', p.id)

    return NextResponse.json({
        data: {
            // L'etichetta, non l'id: chi carica non sa cosa sia «cee-antes».
            casilla: docLabel(clasificacion.documento),
            seguro: clasificacion.confianza >= 0.7,
            porque: clasificacion.porque,
        },
    })
}
