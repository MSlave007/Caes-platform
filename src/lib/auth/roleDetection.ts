import { createClient } from './supabaseClient'

export async function getUserRole() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    return profile?.role as 'installer' | 'admin' | null
}
