import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Mail, MapPin, Building, TrendingUp } from 'lucide-react'

export default async function InstallersPage() {
    const supabase = await createClient()

    // 1. Fetch Installers (Profiles)
    const { data: installers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'installer')

    // 2. Fetch Projects Summary to calculate stats
    // Ideally we would do this with an aggregation query or view, 
    // but for now fetch all projects and aggregate in JS
    const { data: projects } = await supabase
        .from('projects')
        .select('id, installer_id, status, savings_eur, created_at')

    // 3. Aggregate Stats
    const stats = (installerId: string) => {
        // If it's a mock user, return hardcoded realistic stats
        if (installerId.startsWith('mock_')) {
            // Deterministic random based on string length to keep UI stable
            const seed = installerId.length
            return {
                totalProjects: 12 + (seed % 10),
                totalRevenue: 5000 + (seed * 1500),
                active: seed % 2 !== 0
            }
        }

        const theirProjects = projects?.filter(p => p.installer_id === installerId) || []
        const totalProjects = theirProjects.length
        const totalRevenue = theirProjects.reduce((sum, p) => sum + (p.savings_eur || 0), 0)

        // Check activity (last 30 days)
        const last30Days = new Date()
        last30Days.setDate(last30Days.getDate() - 30)
        const active = theirProjects.some(p => new Date(p.created_at) > last30Days)

        return { totalProjects, totalRevenue, active }
    }

    // MOCK DATA for Visualisation
    const MOCK_INSTALLERS = [
        { id: 'mock_1', full_name: 'Solar Tech S.L.', email: 'contacto@solartech.es', role: 'installer', company_name: 'Solar Tech' },
        { id: 'mock_2', full_name: 'Instalaciones Perez', email: 'juan@perezinstalaciones.com', role: 'installer', company_name: 'Perez Inst' },
        { id: 'mock_3', full_name: 'EcoEnergy Madrid', email: 'info@ecoenergy.net', role: 'installer', company_name: 'EcoEnergy' },
        { id: 'mock_4', full_name: 'Clima Confort', email: 'tecnicos@climaconfort.es', role: 'installer', company_name: 'Clima Confort' },
    ]

    const allInstallers = [...(installers || []), ...MOCK_INSTALLERS]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Installers Directory</h1>
                    <p className="text-slate-400 mt-1">Manage network of certified installers.</p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                    Invite New Installer
                </Button>
            </div>

            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle>Registered Partners</CardTitle>
                    <CardDescription>{allInstallers.length} installers currently on the platform</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border hover:bg-muted/50">
                                <TableHead className="w-[300px] text-muted-foreground">Installer</TableHead>
                                <TableHead className="text-muted-foreground">Location</TableHead>
                                <TableHead className="text-muted-foreground">Status</TableHead>
                                <TableHead className="text-muted-foreground text-right">Projects</TableHead>
                                <TableHead className="text-muted-foreground text-right">Total Generated</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allInstallers.map((installer) => {
                                const { totalProjects, totalRevenue, active } = stats(installer.id)
                                return (
                                    <TableRow key={installer.id} className="border-border hover:bg-muted/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 bg-slate-100 border border-slate-200">
                                                    <AvatarFallback className="text-emerald-700 bg-emerald-50">
                                                        {installer.full_name?.slice(0, 2).toUpperCase() || 'IN'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-foreground">
                                                        {installer.full_name || installer.company_name || 'Unnamed Installer'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {installer.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                Madrid, SP
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={active
                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                                                : "bg-slate-100 text-slate-500 border-slate-200"
                                            }>
                                                {active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {totalProjects}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 font-mono text-emerald-600">
                                                €{totalRevenue.toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {!allInstallers.length && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                                        No installers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
