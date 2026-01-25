import { createClient } from '@/utils/supabase/server'
import { SettingsDashboard } from '@/components/admin/SettingsDashboard'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch Profile
    let profile = null
    if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        profile = data
    }

    return (
        <div className="space-y-2">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-slate-400 mt-1 mb-6">Manage your account, team, and platform preferences.</p>
            </div>

            <SettingsDashboard user={user} profile={profile} />
        </div>
    )
}
