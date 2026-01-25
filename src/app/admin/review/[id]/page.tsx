import { DocumentViewer } from '@/components/admin/DocumentViewer'
import { ProjectReviewForm } from '@/components/admin/ProjectReviewForm'
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (!project) {
        notFound()
    }

    // Mock Generated Docs for the UI
    const generatedDocs = [
        { name: 'Agreement.pdf', type: 'contract' },
        { name: 'CAES_Cert.pdf', type: 'certificate' }
    ]

    return (
        <div className="h-[calc(100vh-6rem)] grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 p-2">
            {/* Left Column: Documents (Gallery) */}
            <div className="h-full min-h-[500px]">
                <DocumentViewer
                    documents={project.documents}
                    generatedDocs={generatedDocs}
                />
            </div>

            {/* Right Column: Data & Actions (Form) */}
            <div className="h-full overflow-hidden bg-white rounded-2xl border border-slate-100 p-8 shadow-xl flex flex-col">
                <div className="mb-0 pb-6 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 leading-tight">Review Project</h1>
                        <p className="text-sm text-slate-400 font-mono mt-1">ID: #{id.slice(0, 8)}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">submitted by</div>
                        <div className="font-medium text-slate-700">{project.installer_name || 'Unknown'}</div>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden pt-6">
                    <ProjectReviewForm project={project} />
                </div>
            </div>
        </div>
    )
}
