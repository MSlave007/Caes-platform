import { NextResponse } from 'next/server'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@/utils/supabase/server'
import { quienLlama, negado } from '@/lib/auth/guard'
import { sinCabecera, trazoValido } from '@/lib/caes/firma'

/**
 * La mia firma, quella che non voglio rifare ogni volta.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * Il cliente firma una volta nella vita. Chi rivede firma come
 * Cesionario su ogni singolo espediente: dieci a settimana, e ogni
 * volta ridisegna la stessa firma con il mouse, e ogni volta gli esce
 * un po' diversa.
 *
 * Dieci firme diverse della stessa persona sullo stesso tipo di
 * contratto sono esattamente quello che non si vuole avere in un
 * fascicolo.
 *
 * ── PERCHÉ NON PRENDE UN «DI CHI» ─────────────────────────────────────
 *
 * Come `/api/cuenta`: lavora sempre sull'utente della sessione. Una
 * rotta che accetta l'id di qualcun altro è una rotta da proteggere, e
 * questa scrive la firma di una persona — cioè la cosa che più di ogni
 * altra non deve poter scrivere nessun altro.
 */

/** Il file della dimostrazione, accanto agli altri. */
const ARCHIVO = join(process.cwd(), '.caes-demo.firma.json')

function leerDemo(): string | null {
    try {
        if (!existsSync(ARCHIVO)) return null
        return (JSON.parse(readFileSync(ARCHIVO, 'utf8')) as { png?: string }).png ?? null
    } catch {
        return null
    }
}

function escribirDemo(png: string | null) {
    try {
        writeFileSync(ARCHIVO, JSON.stringify({ png }), 'utf8')
    } catch {
        /* sola lettura: la dimostrazione continua, senza ricordarsela */
    }
}

export async function GET() {
    const quien = await quienLlama()
    if (!quien) return negado()

    if (!quien.userId) return NextResponse.json({ data: { png: leerDemo() }, demo: true })

    const supabase = await createClient()
    /**
     * Se la colonna non c'è ancora, non c'è nessuna firma salvata.
     *
     * `firma_png` è nuova: finché non si lancia setup.sql, chiederla fa
     * fallire tutta la query. Stessa ragione e stesso ripiego di
     * `/api/cuenta` — una funzione nuova non può rompere la schermata di
     * chi non l'ha ancora migrata.
     */
    const { data, error } = await supabase
        .from('profiles')
        .select('firma_png')
        .eq('id', quien.userId)
        .maybeSingle()

    if (error) return NextResponse.json({ data: { png: null } })
    return NextResponse.json({ data: { png: data?.firma_png ?? null } })
}

export async function PUT(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const body = (await request.json().catch(() => null)) as { png?: string } | null
    const png = String(body?.png ?? '')

    if (!trazoValido(png)) {
        return NextResponse.json({ error: 'La firma no ha llegado bien' }, { status: 400 })
    }
    const limpio = sinCabecera(png)

    if (!quien.userId) {
        escribirDemo(limpio)
        return NextResponse.json({ data: { png: limpio }, demo: true })
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('profiles')
        .update({ firma_png: limpio })
        .eq('id', quien.userId)

    if (error) {
        console.error('PUT /api/mi-firma:', error)
        return NextResponse.json(
            { error: 'No se ha podido guardar la firma.' },
            { status: 502 }
        )
    }
    return NextResponse.json({ data: { png: limpio } })
}

export async function DELETE() {
    const quien = await quienLlama()
    if (!quien) return negado()

    if (!quien.userId) {
        escribirDemo(null)
        return NextResponse.json({ ok: true, demo: true })
    }

    const supabase = await createClient()
    await supabase.from('profiles').update({ firma_png: null }).eq('id', quien.userId)
    return NextResponse.json({ ok: true })
}
