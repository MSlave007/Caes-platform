'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, FileText, TrendingUp, AlertCircle, Loader2, Calendar, MapPin, User, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'

type Project = {
    id: string
    client_name: string
    address?: string
    status: string
    savings_eur?: number
    created_at: string
    project_date: string
}

export default function InstallerDashboard() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const firebase = createClient()

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data, error } = await firebase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) throw error
                setProjects(data || [])
            } catch (error) {
                console.error('Error fetching projects:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProjects()
    }, [firebase])

    const filteredProjects = projects.filter(p =>
        p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.status?.toLowerCase().includes(search.toLowerCase())
    )

    // Calculate Stats
    const totalSavings = projects.reduce((acc, curr) => acc + (curr.savings_eur || 0), 0)
    const activeProjects = projects.filter(p => p.status === 'draft' || p.status === 'submitted').length

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Header Section */}
            <div className="bg-[#022c22] pt-12 pb-24 px-6 md:px-12 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Projects</h1>
                            <p className="text-emerald-100/70">Manage your installations and track compliance.</p>
                        </div>
                        <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-full px-6 h-12 shadow-lg shadow-emerald-900/20 text-base font-semibold transition-all hover:scale-105 active:scale-95">
                            <Link href="/installer/project/new">
                                <Plus className="h-5 w-5 mr-2" />
                                New Project
                            </Link>
                        </Button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatsCard
                            label="Total Projects"
                            value={projects.length.toString()}
                            icon={<FileText className="h-5 w-5 text-emerald-400" />}
                        />
                        <StatsCard
                            label="Est. Annual Savings"
                            value={`€${totalSavings.toLocaleString()}`}
                            icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
                        />
                        <StatsCard
                            label="Active"
                            value={activeProjects.toString()}
                            icon={<AlertCircle className="h-5 w-5 text-amber-400" />}
                        />
                        {/* Placeholder for future stat */}
                        <div className="hidden md:block bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                            <div className="text-white/40 text-sm">Next Step</div>
                            <div className="text-white font-medium mt-1">Complete Profile</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content (Overlapping) */}
            <div className="max-w-7xl mx-auto px-4 md:px-12 -mt-12 relative z-20">
                {/* Search Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2 mb-8 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                            placeholder="Search client, address..."
                            className="pl-10 border-0 bg-transparent focus-visible:ring-0 text-base"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-8 w-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No projects found</h3>
                        <p className="text-slate-500 mb-6">Get started by creating your first installation project.</p>
                        <Button asChild variant="outline" className="rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                            <Link href="/installer/project/new">Create Project</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map((project, i) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Link href={`/installer/project/${project.id}`}>
                                    <div className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 cursor-pointer h-full flex flex-col">

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                                                    {project.client_name?.charAt(0) || 'C'}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">{project.client_name}</h3>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(project.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={getStatusStyle(project.status)}>
                                                {formatStatus(project.status)}
                                            </Badge>
                                        </div>

                                        {/* Progress Bar for Drafts */}
                                        {project.status === 'draft' && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-[10px] text-slate-400 mb-1 uppercase font-bold tracking-wider">
                                                    <span>Completion</span>
                                                    <span>{getCompletion(project)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${getCompletion(project)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3 mb-6">
                                            {project.address && (
                                                <div className="flex items-start gap-2 text-sm text-slate-600">
                                                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                                                    <span className="line-clamp-2">{project.address}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Savings</div>
                                                <div className="font-bold text-emerald-600">
                                                    {project.savings_eur ? `€${project.savings_eur}/yr` : '-'}
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function StatsCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-100/70 text-xs font-semibold uppercase tracking-wider">{label}</span>
                {icon}
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
        </div>
    )
}

function getStatusStyle(status: string) {
    switch (status) {
        case 'submitted': return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100'
        case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
        case 'rejected': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
        default: return 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100'
    }
}

function getCompletion(project: Project) {
    if (project.status === 'submitted' || project.status === 'approved') return 100
    // Rough estimation for demo
    let score = 0
    if (project.client_name) score += 20
    if (project.address) score += 20
    // We would need to check documents count in a real app, assuming 10% per doc group
    if (project.status === 'draft') return 45 // Static for demo drafts
    return 0
}

function formatStatus(status: string) {
    if (!status) return 'Draft'
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}
