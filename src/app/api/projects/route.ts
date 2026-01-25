import { createClient } from '@/utils/supabase/server'
import { mockDb } from '@/lib/mockDb'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()
    const url = new URL(request.url)
    const role = url.searchParams.get('role')

    // Check if we are in mock mode (using the client structure hack or checking env)
    // Safe access to session
    const authResult = await supabase.auth.getSession()
    const session = authResult?.data?.session

    // If no real session and we want to allow demo access, fetch from mockDb
    if (!session || !session.user) {
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
        const body = await request.json()
        const supabase = await createClient()

        // 1. Validate (Basic)
        if (!body.client_name) {
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
            return NextResponse.json({ error: 'Not authenticated. Please log in.' }, { status: 401 })
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
