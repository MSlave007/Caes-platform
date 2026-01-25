'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Eye, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

// Types
type Project = {
    id: string
    created_at: string
    client_name: string
    installer_name: string
    savings_eur: number
    status: string
    make: string
    model: string
}

export default function ProjectsDatabasePage() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const res = await fetch('/api/projects')
                const { data } = await res.json()
                if (data) setProjects(data)
            } catch (error) {
                console.error("Failed to fetch projects", error)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    // Filter Logic
    const filteredProjects = projects.filter(project => {
        const matchesSearch =
            project.client_name?.toLowerCase().includes(search.toLowerCase()) ||
            project.installer_name?.toLowerCase().includes(search.toLowerCase()) ||
            project.id.toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === 'all' || project.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            case 'submitted': return 'bg-blue-500/10 text-blue-600 border-blue-200'
            case 'draft': return 'bg-slate-100 text-slate-500 border-slate-200'
            case 'rejected': return 'bg-red-500/10 text-red-600 border-red-200'
            default: return 'bg-slate-100 text-slate-500 border-slate-200'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Project Database</h1>
                <p className="text-slate-400">Master database of all system projects (Drafts, Active, and Archived).</p>
            </div>

            <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search client, installer, or ID..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="mr-2 h-4 w-4 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <div className="rounded-md border border-slate-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[100px]">Project ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Installer</TableHead>
                                        <TableHead>System</TableHead>
                                        <TableHead className="text-right">Savings</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProjects.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                                                No projects match your filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProjects.map((project) => (
                                            <TableRow key={project.id} className="hover:bg-slate-50/50">
                                                <TableCell className="font-mono text-xs text-slate-500">
                                                    #{project.id.slice(0, 6)}
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {new Date(project.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-900">
                                                    {project.client_name || '—'}
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {project.installer_name || 'Unknown'}
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm">
                                                    {project.make} {project.model}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-slate-900">
                                                    €{(project.savings_eur || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={getStatusColor(project.status)}>
                                                        {project.status || 'draft'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                            <Link href={`/admin/review/${project.id}`}>
                                                                <Eye className="h-4 w-4 text-slate-400 hover:text-emerald-600" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
