import { createClient } from '@/utils/supabase/server'
import { mockDb } from '@/lib/mockDb'
import { quienLlama, negado } from '@/lib/auth/guard'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()
    const url = new URL(request.url)
    const role = url.searchParams.get('role')

    // Senza sessione si passa solo in modalità dimostrativa: prima questa
    // rotta rispondeva a chiunque, anche online.
    const quien = await quienLlama()
    if (!quien) return negado()

    if (quien.demo) {
        // MOCK MODE FETCH
        const projects = mockDb.getProjects()
        return NextResponse.json({ data: projects })
    }

    // REAL SUPABASE FETCH (Future proofing)
    const { data, error } = await supabase
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

        // 1. Validate (Basic)
        // Il nome serve solo per creare: un aggiornamento porta l'id e
        // magari cambia un campo solo, tipo lo stato.
        if (!body.id && !body.client_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get User for installer_id
        const { data: { user } } = await supabase.auth.getUser()

        let dbData, dbError

        if (user) {
            const payload = {
                ...body,
                installer_id: user.id
            }

            // 2. Insert or Update
            let query = supabase.from('projects')

            if (body.id) {
                // Update existing
                const { data, error } = await query
                    .update(payload)
                    .eq('id', body.id)
                    .select()
                    .single()
                dbData = data
                dbError = error
            } else {
                // Insert new
                const { data, error } = await query
                    .insert(payload)
                    .select()
                    .single()
                dbData = data
                dbError = error
            }


        } else {
            // MODALITÀ DIMOSTRATIVA — senza sessione si scrive in memoria.
            //
            // Prima qui c'era un 401: la lettura ripiegava su mockDb ma la
            // scrittura no, quindi una pratica inviata non poteva comparire
            // nella coda admin in nessun modo. Le due metà non si toccavano.
            // Ora la scrittura segue la stessa strada della lettura.
            if (body.id) {
                const updated = mockDb.updateProject(String(body.id), body)
                if (!updated) {
                    return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })
                }
                return NextResponse.json({ data: updated })
            }

            const created = mockDb.createProject({
                source: body.source ?? 'installer',
                client_name: body.client_name,
                installer_name: body.installer_name ?? null,
                // La coda admin filtra su questo: un invio entra come "submitted".
                status: body.status ?? 'submitted',
                savings_eur: Number(body.savings_eur) || 0,
                installer_pct: Number(body.installer_pct) || 0,
                agency_pct: body.agency_pct ?? null,
                savings_pct: Number(body.savings_pct) || 0,
                address: body.address ?? '',
                make: body.make ?? '',
                model: body.model ?? '',
                power_kw: Number(body.power_kw) || 0,
                docs: Array.isArray(body.docs) ? body.docs : [],
                files: Array.isArray(body.files) ? body.files : [],
            })
            return NextResponse.json({ data: created })
        }

        const { data, error } = { data: dbData, error: dbError }

        if (error) {
            console.error('Supabase ERROR:', error)
            return NextResponse.json({ error: error.message, details: error }, { status: 500 })
        }

        return NextResponse.json({ data })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
