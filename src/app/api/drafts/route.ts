import { NextResponse } from 'next/server'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/utils/supabase/server'
import { negado, quienLlama } from '@/lib/auth/guard'

/**
 * Le bozze di espediente, sul server.
 *
 * ── PERCHÉ NON BASTAVA IL BROWSER ─────────────────────────────────────
 *
 * Stavano in localStorage. Vuol dire che chi comincia un espediente in
 * ufficio non lo ritrova in cantiere dal telefono, e che svuotare i dati
 * di Chrome si porta via mezza giornata di lavoro. Una bozza è della
 * persona, non del browser che aveva aperto quel giorno.
 *
 * ── COSA FA QUESTA ROTTA ──────────────────────────────────────────────
 *
 *   GET     → le bozze di chi chiede, dalla più recente
 *   POST    → inserisce o aggiorna, per id
 *   DELETE  → ?id=… cancella la propria
 *
 * Con sessione si scrive su Supabase, e le regole di riga fanno il resto:
 * una bozza la vede solo chi l'ha scritta, l'agenzia compresa. Finché non
 * è inviata non è un espediente, è lavoro a metà.
 *
 * Senza sessione, in modalità dimostrativa, si scrive su un file locale.
 * Fuori dalla demo si nega e basta — vedi src/lib/auth/guard.ts.
 *
 * ── IL CLIENTE NON ASPETTA QUESTA ROTTA ───────────────────────────────
 *
 * Il browser tiene comunque la sua copia e la scrive PRIMA di chiamare
 * qui (src/lib/draft.ts). In un seminterrato senza campo il lavoro non si
 * perde: si sincronizza dopo. Quindi un errore di rete qui non è un
 * fallimento, è un ritardo.
 */

export type DraftRow = {
    id: string
    nombre: string
    role: string
    step: number
    files: Record<string, { name: string; size: number; storagePath?: string }[]>
    notas?: string | null
    /** Il cliente scelto all'inizio, quando c'e'. */
    cliente_id?: string | null
    cliente_nombre?: string | null
    updated_at: string
}

/* ------------------------------------------------- archivio dimostrativo */

const ARCHIVO = join(process.cwd(), '.caes-demo.drafts.json')

function leerDemo(): DraftRow[] {
    try {
        if (!existsSync(ARCHIVO)) return []
        const v = JSON.parse(readFileSync(ARCHIVO, 'utf8'))
        return Array.isArray(v) ? (v as DraftRow[]) : []
    } catch {
        return []
    }
}

function escribirDemo(rows: DraftRow[]) {
    try {
        writeFileSync(ARCHIVO, JSON.stringify(rows, null, 2), 'utf8')
    } catch {
        /* sola lettura: la dimostrazione continua senza persistenza */
    }
}

/* --------------------------------------------------------------- forma */

/** Tiene solo quello che ci aspettiamo, e nei limiti che ci aspettiamo. */
function sanear(body: unknown): DraftRow | null {
    if (!body || typeof body !== 'object') return null
    const b = body as Record<string, unknown>
    const id = typeof b.id === 'string' ? b.id.trim() : ''
    // Il formato lo genera il client: "b" più base36. Accettarne altri
    // vorrebbe dire accettare chiavi arbitrarie in una tabella condivisa.
    if (!/^b[a-z0-9]{6,32}$/.test(id)) return null

    const files: DraftRow['files'] = {}
    if (b.files && typeof b.files === 'object') {
        for (const [k, v] of Object.entries(b.files as Record<string, unknown>)) {
            if (!Array.isArray(v)) continue
            files[k] = v
                .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
                .slice(0, 40)
                .map((f) => ({
                    name: String(f.name ?? '').slice(0, 255),
                    size: Number(f.size) || 0,
                    storagePath:
                        typeof f.storagePath === 'string' ? f.storagePath : undefined,
                }))
        }
    }

    return {
        id,
        nombre: typeof b.nombre === 'string' ? b.nombre.trim().slice(0, 120) : '',
        role: b.role === 'client' ? 'client' : 'installer',
        step: Math.min(Math.max(Number(b.step) || 0, 0), 10),
        files,
        notas: typeof b.notas === 'string' ? b.notas.slice(0, 2000) : null,
        cliente_id: typeof b.cliente_id === 'string' ? b.cliente_id.slice(0, 64) : null,
        cliente_nombre:
            typeof b.cliente_nombre === 'string' ? b.cliente_nombre.slice(0, 160) : null,
        updated_at: new Date().toISOString(),
    }
}

/* --------------------------------------------------------------- rotte */

export async function GET() {
    const quien = await quienLlama()
    if (!quien) return negado()

    if (!quien.userId) {
        return NextResponse.json({
            data: leerDemo().sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
            demo: true,
        })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('drafts')
        .select('id, nombre, role, step, files, notas, cliente_id, cliente_nombre, updated_at')
        .order('updated_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const fila = sanear(await request.json().catch(() => null))
    if (!fila) {
        return NextResponse.json({ error: 'Borrador no válido' }, { status: 400 })
    }

    if (!quien.userId) {
        const rows = leerDemo()
        const i = rows.findIndex((r) => r.id === fila.id)
        if (i >= 0) rows[i] = fila
        else rows.push(fila)
        escribirDemo(rows)
        return NextResponse.json({ data: fila, demo: true })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('drafts')
        // `installer_id` lo mettiamo noi dalla sessione, mai dal corpo della
        // richiesta: altrimenti si potrebbe scrivere una bozza a nome di
        // qualcun altro. Le regole di riga lo ribadiscono lato base.
        .upsert(
            { ...fila, installer_id: quien.userId, updated_at: undefined },
            { onConflict: 'id' }
        )
        .select('id, nombre, role, step, files, notas, cliente_id, cliente_nombre, updated_at')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const id = new URL(request.url).searchParams.get('id') ?? ''
    if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

    if (!quien.userId) {
        escribirDemo(leerDemo().filter((r) => r.id !== id))
        return NextResponse.json({ ok: true, demo: true })
    }

    const supabase = await createClient()
    const { error } = await supabase.from('drafts').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ ok: true })
}
