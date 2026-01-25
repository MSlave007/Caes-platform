import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE')) {
        console.warn('Supabase credentials missing. Returning mock server client.')
        // Return a mock object that satisfies the basic structure needed for the APIs
        return {
            from: (table: string) => ({
                select: () => ({
                    eq: () => ({
                        single: () => ({ data: null, error: null }),
                        order: () => ({ data: [], error: null })
                    }),
                    order: () => ({ data: [], error: null }), // Add direct order support
                    width: () => ({ eq: () => ({ data: [], error: null }) })
                }),
                insert: (data: any) => ({
                    select: () => ({
                        single: () => ({ data: { ...data, id: Math.random().toString() }, error: null })
                    })
                }),
                update: (data: any) => ({
                    eq: () => ({ select: () => ({ single: () => ({ data: { ...data }, error: null }) }) })
                }),
                upload: () => ({ data: { path: 'mock_path' }, error: null }),
                getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock.url/${path}` } })
            }),
            storage: {
                from: (bucket: string) => ({
                    upload: () => ({ data: { path: 'mock_upload_path' }, error: null }),
                    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.com/mock-storage/${bucket}/${path}` } })
                })
            },
            auth: {
                getUser: () => ({ data: { user: { id: 'mock_user_id', email: 'mock@example.com' } }, error: null }),
                getSession: () => ({ data: { session: { user: { id: 'mock_user_id', email: 'mock@example.com' } } }, error: null })
            }
        } as any
    }

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
