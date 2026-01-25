'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRight, Clock, Loader2 } from 'lucide-react'

export default function ReviewQueuePage() {
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch('/api/projects')
                const { data } = await res.json()
                if (data) {
                    setProjects(data.filter((p: any) => p.status === 'submitted'))
                }
            } catch (error) {
                console.error("Failed to fetch", error)
            } finally {
                setLoading(false)
            }
        }
        fetchProjects()
    }, [])

    const createDemoProject = async () => {
        setLoading(true)
        try {
            await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_name: 'Demo Hotel Central',
                    client_email: 'hotel@demo.com',
                    installer_name: 'Demo Installer',
                    address: 'Gran Via 45, Madrid',
                    status: 'submitted',
                    savings_eur: 4500,
                    make: 'Daikin',
                    model: 'Altherma 3 H HT',
                    documents: { invoice: 'mock', technical_sheet: 'mock' },
                    is_eligible: true
                })
            })
            window.location.reload()
        } catch (e) {
            console.error(e)
            alert('Failed to create demo project')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
                    <p className="text-slate-400 mt-1">Projects waiting for validation and approval.</p>
                </div>
                <Button variant="outline" onClick={createDemoProject}>
                    + Test Data
                </Button>
            </div>

            <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle>Pending Submissions</CardTitle>
                    <CardDescription>{projects.length} projects currently in queue</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-4">
                            <p>No pending projects found.</p>
                            <Button onClick={createDemoProject} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                Generate Demo Project
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-muted/50">
                                    <TableHead className="text-muted-foreground">Date</TableHead>
                                    <TableHead className="text-muted-foreground">Client</TableHead>
                                    <TableHead className="text-muted-foreground">Installer</TableHead>
                                    <TableHead className="text-muted-foreground">Est. Savings</TableHead>
                                    <TableHead className="text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map((project) => (
                                    <TableRow key={project.id} className="border-border hover:bg-muted/50">
                                        <TableCell className="font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                {new Date(project.created_at).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-foreground">{project.client_name}</TableCell>
                                        <TableCell className="text-muted-foreground">{project.installer_name || 'Unknown'}</TableCell>
                                        <TableCell className="text-foreground font-semibold">€{project.savings_eur || 0}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                Submitted
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                                <Link href={`/admin/review/${project.id}`}>
                                                    Review
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
