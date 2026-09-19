import { NextResponse } from 'next/server'
import { quienLlama, negado } from '@/lib/auth/guard'
import { createClient } from '@/utils/supabase/server'
import { mockLeads } from '@/lib/mockLeads'

/** Assegnazione del lead a un installatore, o cambio di stato. */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()

    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('leads')
            .update(body)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return NextResponse.json({ data })
    } catch {
        const updated = mockLeads.update(id, body)
        if (!updated) return NextResponse.json({ error: 'No existe' }, { status: 404 })
        return NextResponse.json({ data: updated, stored: 'memory' })
    }
}
