import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Check if keys are missing OR if they are the default placeholders
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('YOUR_SUPABASE')) {
        console.warn('Supabase credentials missing or invalid. Using mock client for UI preview.')
        // Return a dummy object that mimics the Supabase client structure required for rendering
        // This allows the UI to load, but auth calls will fail gracefully or log errors
        return {
            auth: {
                getSession: async () => ({ data: { session: null }, error: null }),
                signInWithPassword: async () => ({ error: { message: 'Supabase credentials missing in .env.local' } }),
                signUp: async () => ({ error: { message: 'Supabase credentials missing in .env.local' } }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
    }

    return createBrowserClient(supabaseUrl, supabaseKey)
}
