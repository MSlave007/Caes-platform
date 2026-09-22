import { NextResponse } from 'next/server'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/utils/supabase/server'
import { negado, quienLlama, soloAgencia } from '@/lib/auth/guard'
import { COMISION_MAXIMA_PCT, CUOTA_CAES_PCT } from '@/lib/caes/estimate'
import { PROVEEDORES } from '@/lib/caes/proveedores'

/**
 * Le impostazioni dell'agenzia.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * La schermata Ajustes aveva un bottone «Guardar cambios» che mostrava
 * «Guardado» e non salvava niente. La confessione era in grigio chiaro
 * in fondo alla pagina, dove non la legge nessuno.
 *
 * Un controllo che mente è peggio di un controllo che non c'è: chi lo
 * usa crede di aver fatto una cosa, e scopre mesi dopo che il margine
 * non era mai cambiato.
 *
 * ── SE LA TABELLA NON C'È ─────────────────────────────────────────────
 *
 * La risposta porta `persistente: false` invece di rompersi. La pagina
 * lo legge, disattiva il bottone e dice perché — così da fuori si vede
 * la differenza fra «non l'ho salvato» e «l'ho salvato». Appena l'SQL
 * in `src/utils/supabase/setup.sql` è passato, si salva per davvero
 * senza toccare altro.
 *
 * ── COSA NON SI SALVA QUI ─────────────────────────────────────────────
 *
 * Tarifa CAES, ahorro mínimo, comisión máxima e validità: li fissa la
 * norma, vivono nel motore di calcolo e si cambiano con una revisione
 * del codice. Un pannello che li lascia toccare è un modo di invalidare
 * espedienti alle undici di sera.
 */

export type Ajustes = {
    margen_pct: number
    proveedor: string | null
    dias_revision: number
    /**
     * Mesi per presentare un'attuazione dalla fine dei lavori.
     *
     * `null` = l'orologio è spento. Sta qui e non nel motore di calcolo
     * perché è un termine che fissa la norma, e scriverlo nel codice
     * senza esserne certi vorrebbe dire renderlo il numero che tutti
     * citano. Vedi src/lib/caes/reloj.ts.
     */
    meses_presentacion: number | null
}

export const POR_DEFECTO: Ajustes = {
    margen_pct: CUOTA_CAES_PCT,
    proveedor: null,
    dias_revision: 5,
    meses_presentacion: null,
}

const CAMPOS = 'margen_pct, proveedor, dias_revision, meses_presentacion'

/* ------------------------------------------------- archivio dimostrativo */

const ARCHIVO = join(process.cwd(), '.caes-demo.ajustes.json')

function leerDemo(): Ajustes {
    try {
        if (!existsSync(ARCHIVO)) return POR_DEFECTO
        return { ...POR_DEFECTO, ...JSON.parse(readFileSync(ARCHIVO, 'utf8')) }
    } catch {
        return POR_DEFECTO
    }
}

/* --------------------------------------------------------------- forma */

/**
 * Lista bianca, e limiti che hanno un senso commerciale, non solo
 * tecnico: il margine non può mangiarsi tutta la commissione
 * dell'installatore, e i giorni di revisione sono una promessa, quindi
 * non possono essere zero.
 */
function sanear(body: unknown): Ajustes | { error: string } {
    if (!body || typeof body !== 'object') return { error: 'Petición no válida' }
    const b = body as Record<string, unknown>

    const margen = Math.round(Number(b.margen_pct))
    if (!Number.isFinite(margen) || margen < 0 || margen > 100 - COMISION_MAXIMA_PCT) {
        return {
            error: `El margen tiene que estar entre 0 % y ${100 - COMISION_MAXIMA_PCT} %, para que quede algo al cliente.`,
        }
    }

    const dias = Math.round(Number(b.dias_revision))
    if (!Number.isFinite(dias) || dias < 1 || dias > 30) {
        return { error: 'El compromiso de revisión va de 1 a 30 días hábiles.' }
    }

    // Il soggetto delegato non è testo libero: è un'identità giuridica
    // con NIF e codice di accreditamento. Accettarne uno inventato
    // vorrebbe dire stamparlo su un Convenio che poi non vale.
    let proveedor: string | null = null
    if (typeof b.proveedor === 'string' && b.proveedor.trim()) {
        const id = b.proveedor.trim()
        if (!PROVEEDORES.some((p) => p.id === id)) {
            return { error: 'Ese sujeto delegado no está en el catálogo.' }
        }
        proveedor = id
    }

    // Vuoto e zero non sono la stessa cosa: vuoto vuol dire «non lo
    // sappiamo ancora», e il sistema mostra l'età senza dare verdetti.
    let meses: number | null = null
    if (b.meses_presentacion !== null && b.meses_presentacion !== undefined && b.meses_presentacion !== '') {
        const m = Math.round(Number(b.meses_presentacion))
        if (!Number.isFinite(m) || m < 1 || m > 120) {
            return { error: 'El plazo de presentación va de 1 a 120 meses, o se deja vacío.' }
        }
        meses = m
    }

    return {
        margen_pct: margen,
        proveedor,
        dias_revision: dias,
        meses_presentacion: meses,
    }
}

/** Il codice che PostgREST dà quando la tabella non esiste ancora. */
function faltaLaTabla(code?: string, message?: string) {
    return code === '42P01' || /relation .* does not exist/i.test(message ?? '')
}

/* --------------------------------------------------------------- rotte */

export async function GET() {
    // In lettura basta essere entrati: l'installatore ha diritto di
    // vedere in quanti giorni gli avete promesso la revisione.
    const quien = await quienLlama()
    if (!quien) return negado()

    if (!quien.userId) {
        return NextResponse.json({ data: leerDemo(), persistente: true, demo: true })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('ajustes')
        .select(CAMPOS)
        .eq('id', 'agencia')
        .maybeSingle()

    if (error) {
        if (faltaLaTabla(error.code, error.message)) {
            return NextResponse.json({
                data: POR_DEFECTO,
                persistente: false,
                motivo: 'La tabla «ajustes» todavía no existe en la base de datos.',
            })
        }
        return NextResponse.json({ error: error.message }, { status: 502 })
    }

    return NextResponse.json({
        data: { ...POR_DEFECTO, ...(data ?? {}) },
        persistente: true,
    })
}

export async function PUT(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const limpio = sanear(await request.json().catch(() => null))
    if ('error' in limpio) {
        return NextResponse.json({ error: limpio.error }, { status: 400 })
    }

    if (!quien.userId) {
        try {
            writeFileSync(ARCHIVO, JSON.stringify(limpio, null, 2), 'utf8')
        } catch {
            /* sola lettura: la dimostrazione continua senza persistenza */
        }
        return NextResponse.json({ data: limpio, persistente: true, demo: true })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('ajustes')
        .upsert(
            {
                id: 'agencia',
                ...limpio,
                actualizado_en: new Date().toISOString(),
                // Chi ha cambiato lo mette il server, mai il corpo della
                // richiesta: è l'unica firma che vale qualcosa.
                actualizado_por: quien.userId,
            },
            { onConflict: 'id' }
        )
        .select(CAMPOS)
        .single()

    if (error) {
        if (faltaLaTabla(error.code, error.message)) {
            return NextResponse.json(
                {
                    error: 'Todavía no se puede guardar: falta la tabla «ajustes». Está el SQL al final de src/utils/supabase/setup.sql.',
                    persistente: false,
                },
                { status: 503 }
            )
        }
        return NextResponse.json({ error: error.message }, { status: 502 })
    }

    return NextResponse.json({ data, persistente: true })
}
