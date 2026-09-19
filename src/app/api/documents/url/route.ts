import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { quienLlama, negado } from '@/lib/auth/guard'

/**
 * Indirizzo firmato e a scadenza per guardare un documento.
 *
 * I documenti di un fascicolo CAES sono carte d'identita, fatture e foto
 * di casa d'altri. Non devono avere un indirizzo permanente: quello finisce
 * nelle email, nella cronologia del browser, nei log dei proxy, e da li non
 * si toglie piu.
 *
 * Qui si verifica prima chi sta chiedendo, poi si firma un indirizzo che
 * vale pochi minuti.
 *
 * NOTA: perche serva davvero, il bucket `documents` deve essere PRIVATO.
 * Al 19 settembre 2026 e pubblico — un file si scarica senza nessuna
 * chiave. Vedi docs/SICUREZZA.md, primo punto.
 */

/** Quanto vale l'indirizzo firmato. Il tempo di aprirlo, non di girarlo. */
const VALIDEZ_SEGUNDOS = 300

export async function GET(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const path = new URL(request.url).searchParams.get('path')
    if (!path) {
        return NextResponse.json({ error: 'Falta el path' }, { status: 400 })
    }

    // Il percorso arriva dal client: niente risalite di cartella.
    if (path.includes('..') || path.startsWith('/')) {
        return NextResponse.json({ error: 'Path no válido' }, { status: 400 })
    }

    try {
        const supabase = await createClient()
        const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(path, VALIDEZ_SEGUNDOS)

        if (error || !data?.signedUrl) {
            return NextResponse.json(
                { error: error?.message ?? 'No se ha podido firmar el enlace' },
                { status: 404 }
            )
        }

        return NextResponse.json({ url: data.signedUrl, expiresIn: VALIDEZ_SEGUNDOS })
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Error' },
            { status: 500 }
        )
    }
}
