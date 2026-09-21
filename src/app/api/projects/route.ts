import { createClient } from '@/utils/supabase/server'
import { mockDb } from '@/lib/mockDb'
import { quienLlama, negado } from '@/lib/auth/guard'
import { COMISION_MAXIMA_PCT } from '@/lib/caes/estimate'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()
    // Senza sessione si passa solo in modalità dimostrativa: prima questa
    // rotta rispondeva a chiunque, anche online.
    const quien = await quienLlama()
    if (!quien) return negado()

    if (quien.demo) {
        // MOCK MODE FETCH
        const projects = mockDb.getProjects()
        return NextResponse.json({ data: projects })
    }

    // Chi vede cosa.
    //
    // L'installatore passa dal cliente con la sua sessione, e le regole di
    // riga gli danno i propri espedienti e basta. L'agenzia ha bisogno di
    // vederli tutti — e` il suo lavoro — e per farlo serve la chiave di
    // servizio, che salta le regole di riga. E` legittimo solo perche' il
    // ruolo e` gia stato verificato una riga sopra: il controllo lo fa il
    // nostro codice, non il database.
    const lector = quien.rol === 'admin' ? createAdminClient() ?? supabase : supabase

    const { data, error } = await lector
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        // If table doesn't exist yet, fall back to mock
        console.warn('DB fetch failed, using mock data:', error.message)
        const projects = mockDb.getProjects()
        return NextResponse.json({ data: projects })
    }

    return NextResponse.json({ data })
}

export async function POST(request: Request) {
    try {
        const quien = await quienLlama()
        if (!quien) return negado()

        const body = await request.json()
        const supabase = await createClient()

        // ── SOLO CREAZIONE ────────────────────────────────────────────
        //
        // Questa rotta accettava un `id` e in quel caso faceva un
        // AGGIORNAMENTO — scavalcando il controllo «solo agenzia» messo
        // sulla PATCH. Un installatore poteva mandare
        // `{ id, status: 'approved', agency_pct: 0 }` e approvarsi la
        // pratica da solo azzerando la quota dell'agenzia.
        //
        // Due strade per fare la stessa cosa sono due posti dove mettere
        // il controllo, e uno dei due resta sempre indietro. Qui si crea
        // e basta; per modificare c'e' la PATCH, e li' il controllo c'e'.
        if (body.id) {
            return NextResponse.json(
                { error: 'Para modificar un expediente usa PATCH /api/projects/[id].' },
                { status: 405 }
            )
        }

        if (!body.client_name) {
            return NextResponse.json({ error: 'Falta el nombre del cliente' }, { status: 400 })
        }

        /**
         * Quello che chi crea puo' scrivere. Lista BIANCA.
         *
         * Fuori restano `status`, `agency_pct`, `admin_notes`,
         * `admin_id`, `approved_at`: sono decisioni dell'agenzia, e
         * lasciarli passare vorrebbe dire far nascere una pratica gia'
         * approvata. `installer_pct` invece entra: la sua quota se la
         * fissa lui all'invio, ed e' il patto che poi non cambia.
         */
        const texto = (v: unknown, max = 200) =>
            typeof v === 'string' ? v.trim().slice(0, max) : ''
        const numero = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

        const nuevo = {
            source: (body.source === 'client' ? 'client' : 'installer') as 'client' | 'installer',
            client_name: texto(body.client_name, 160),
            installer_name: texto(body.installer_name, 160) || null,
            address: texto(body.address, 240),
            make: texto(body.make, 80),
            model: texto(body.model, 80),
            power_kw: numero(body.power_kw),
            savings_eur: numero(body.savings_eur),
            savings_pct: numero(body.savings_pct),
            // La quota dell'installatore ha un tetto di legge: sopra
            // quello l'accordo CAES non vale, quindi non si accetta
            // nemmeno di scriverlo.
            installer_pct: Math.min(Math.max(numero(body.installer_pct), 0), COMISION_MAXIMA_PCT),
            notas: texto(body.notas, 2000) || undefined,
            nombre: texto(body.nombre, 120) || undefined,
            docs: Array.isArray(body.docs) ? body.docs.slice(0, 80) : [],
            // La scheda del cliente. Le regole di riga su `clientes`
            // impediscono di agganciarsi a quella di un altro.
            cliente_id: texto(body.cliente_id, 40) || undefined,
            // Lo stato iniziale lo decide il server, sempre.
            status: 'submitted' as const,
            // La quota dell'agenzia la fissa l'agenzia in revisione: qui
            // nasce vuota, non a zero — zero sarebbe una decisione.
            agency_pct: null,
            files: [],
        }

        // Get User for installer_id
        const { data: { user } } = await supabase.auth.getUser()

        let dbData, dbError

        if (user) {
            const { data, error } = await supabase
                .from('projects')
                .insert({ ...nuevo, installer_id: user.id })
                .select()
                .single()
            dbData = data
            dbError = error

        } else {
            // MODALITÀ DIMOSTRATIVA — senza sessione si scrive in memoria.
            //
            // Prima qui c'era un 401: la lettura ripiegava su mockDb ma la
            // scrittura no, quindi una pratica inviata non poteva comparire
            // nella coda admin in nessun modo. Le due metà non si toccavano.
            // Ora la scrittura segue la stessa strada della lettura.
            const created = mockDb.createProject(nuevo)
            return NextResponse.json({ data: created })
        }

        const { data, error } = { data: dbData, error: dbError }

        if (error) {
            console.error('Supabase ERROR:', error)
            return NextResponse.json({ error: error.message, details: error }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (e: unknown) {
        // Il messaggio grezzo puo contenere frammenti della query: si
        // registra dalla nostra parte e fuori esce una riga sola.
        console.error('POST /api/projects:', e)
        return NextResponse.json(
            { error: 'No se ha podido guardar el expediente' },
            { status: 500 }
        )
    }
}
