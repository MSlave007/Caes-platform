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
        // Ripiego sull'archivio in memoria: accetta qualsiasi campo, non solo
        // lo stato, perché in approvazione si fissano anche risparmio e margine.
        const updated = mockDb.updateProject(id, body)
        if (updated) return NextResponse.json({ data: updated })
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
}
