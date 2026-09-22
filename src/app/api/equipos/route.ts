import { NextResponse } from 'next/server'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/utils/supabase/server'
import { negado, quienLlama } from '@/lib/auth/guard'
import { normalizar } from '@/lib/caes/aprendizaje'

/**
 * Il catalogo delle macchine: cosa sappiamo già di questo modello.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * La ficha RES060 vuole SCOP, SCOP in ACS e potenza. Oggi si leggono
 * dalla scheda tecnica in ogni fascicolo, uno per uno — anche quando è
 * la ottava Daikin Altherma 3 del mese.
 *
 * Ogni fascicolo approvato lascia quei valori in `equipos`. Da lì in
 * poi, per quel modello, non c'è niente da leggere: c'è da guardare.
 *
 * ── PERCHÉ NON RIEMPIE DA SOLO ────────────────────────────────────────
 *
 * Restituisce una proposta, non un fatto. Il catalogo è costruito da
 * revisioni umane, ma resta una media di quello che qualcun altro ha
 * confermato su un'altra macchina con lo stesso nome: due unità dello
 * stesso modello possono avere SCOP diversi per taglia. Chi rivede
 * decide, e quando accetta il valore resta `corregido` — cioè a suo
 * nome, non a nome di una tabella.
 *
 * `veces` serve a questo: un modello visto otto volte si propone con
 * più ragione di uno visto una.
 */

const ARCHIVO = join(process.cwd(), '.caes-demo.equipos.json')

type Equipo = {
    marca: string
    modelo: string
    scop: number | null
    scop_acs: number | null
    potencia_kw: number | null
    veces: number
}

function leerDemo(): Equipo[] {
    try {
        if (!existsSync(ARCHIVO)) return []
        const v = JSON.parse(readFileSync(ARCHIVO, 'utf8'))
        return Array.isArray(v) ? (v as Equipo[]) : []
    } catch {
        return []
    }
}

export async function GET(request: Request) {
    // Basta essere entrati: non è il dato di nessuno, è una scheda di
    // prodotto. L'installatore ne trae lo stesso beneficio.
    const quien = await quienLlama()
    if (!quien) return negado()

    const url = new URL(request.url)
    const marca = normalizar(url.searchParams.get('marca'))
    const modelo = normalizar(url.searchParams.get('modelo'))
    if (!marca || !modelo) {
        return NextResponse.json({ error: 'Faltan marca y modelo' }, { status: 400 })
    }

    if (!quien.userId) {
        const encontrado = leerDemo().find(
            (e) => normalizar(e.marca) === marca && normalizar(e.modelo) === modelo
        )
        return NextResponse.json({ data: encontrado ?? null, demo: true })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('equipos')
        .select('marca, modelo, scop, scop_acs, potencia_kw, veces')
        .eq('marca', marca)
        .eq('modelo', modelo)
        .maybeSingle()

    if (error) {
        // Tabella non ancora creata: non è un errore da mostrare, è una
        // funzione che non c'è ancora. La revisione continua come prima.
        return NextResponse.json({ data: null, disponible: false })
    }

    return NextResponse.json({ data: data ?? null })
}
