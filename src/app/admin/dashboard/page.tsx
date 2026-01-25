'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, FileCheck, Euro, Users, AlertCircle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge' // Assuming Badge is needed for the new Recent Projects section

// Initial state empty, will fetch
const INITIAL_PROJECTS: any[] = []

export default function AdminDashboard() {
    const [projects, setProjects] = useState<any[]>([])

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch('/api/projects')
                const { data } = await res.json()
                if (data) setProjects(data)
            } catch (e) {
                console.error("Failed to fetch projects", e)
            }
        }
        fetchProjects()

        // Poll for updates every 10s so we see new submissions live
        const interval = setInterval(fetchProjects, 10000)
        return () => clearInterval(interval)
    }, [])

    const kpis = [
        { title: 'Total Revenue', value: '€24,500', change: '+12% from last month', icon: DollarSign, color: 'text-emerald-500' },
        { title: 'Approved Projects', value: String(projects.filter(p => p.status === 'approved').length), change: '+5 this week', icon: FileCheck, color: 'text-blue-500' },
        { title: 'Pending Review', value: String(projects.filter(p => p.status === 'submitted').length), change: 'Requires attention', icon: AlertCircle, color: 'text-orange-500' },
        {
            title: 'Active Installers',
            value: '18',
            change: '2 new joined',
            icon: Users,
            color: 'text-purple-500',
        },
    ]

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-slate-400 mt-1">Overview of your CAES platform performance.</p>
                </div>
                <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Link href="/admin/review">
                        Process Queue
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon
                    return (
                        <Card key={kpi.title} className="bg-card border-border shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {kpi.title}
                                </CardTitle>
                                <Icon className={`h-4 w-4 ${kpi.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
                                <p className="text-xs text-muted-foreground">{kpi.change}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Recent Activity (Real) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {projects.slice(0, 5).map((project) => (
                                <div key={project.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-foreground">{project.client_name}</p>
                                        <p className="text-xs text-muted-foreground">{project.model}</p>
                                    </div>
                                    <Badge variant={(project.status === 'approved') ? 'default' : 'secondary'}>
                                        {project.status === 'submitted' ? 'Pending' : project.status}
                                    </Badge>
                                </div>
                            ))}
                            {projects.length === 0 && <p className="text-center text-muted-foreground py-4">No projects yet.</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { user: 'Juan Perez', action: 'submitted new project', time: '5 mins ago' },
                                { user: 'Admin System', action: 'generated monthly report', time: '2 hours ago' },
                                { user: 'Maria Lopez', action: 'joined as installer', time: '5 hours ago' },
                                { user: 'Carlos Ruiz', action: 'project approved', time: 'Yesterday' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 text-sm">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <div className="flex-1">
                                        <span className="font-medium text-foreground">{item.user}</span>{' '}
                                        <span className="text-muted-foreground">{item.action}</span>
                                    </div>
                                    <div className="text-muted-foreground text-xs">{item.time}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
