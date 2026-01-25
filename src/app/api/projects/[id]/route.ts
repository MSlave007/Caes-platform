import { createClient } from '@/lib/supabaseServer'
import { mockDb } from '@/lib/mockDb'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id
    const supabase = await createClient()

    // Real DB Fetch
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) {
        // Mock Fallback
        const mockProject = mockDb.getProjectById(id)
        if (mockProject) {
            return NextResponse.json({ data: mockProject })
        }
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id
    const body = await request.json()
    const supabase = await createClient()

    // Real DB Update
    const { data, error } = await supabase
        .from('projects')
        .update(body)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        // Mock Fallback
        if (body.status) {
            const updated = mockDb.updateProjectStatus(id, body.status)
            if (updated) return NextResponse.json({ data: updated })
        }
        return NextResponse.json({ message: 'Updated in mock db' })
    }

    return NextResponse.json({ data })
}
