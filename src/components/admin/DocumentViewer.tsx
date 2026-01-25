'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCw, Download, FileText, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentViewerProps {
    documents?: Record<string, any>
    generatedDocs?: any[] // Allow passing generated docs to view in same gallery
}

export function DocumentViewer({ documents = {}, generatedDocs = [] }: DocumentViewerProps) {
    // Merge all docs into a single list for the gallery
    // 1. Uploaded Docs
    const uploaded = Object.keys(documents).map(key => ({
        id: key,
        label: key.replace('_', ' '),
        type: 'uploaded',
        url: documents[key]
    }))

    // 2. Generated Docs
    const generated = generatedDocs.map((doc, i) => ({
        id: `gen_${i}`,
        label: doc.name,
        type: 'generated',
        url: 'mock_pdf_url'
    }))

    // Combine
    const allDocs = [...uploaded, ...generated]

    // Default to first doc or placeholder
    const [activeDocId, setActiveDocId] = useState<string | null>(allDocs.length > 0 ? allDocs[0].id : null)
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)

    const activeDoc = allDocs.find(d => d.id === activeDocId)

    return (
        <div className="h-full flex flex-col gap-4">

            {/* MAIN PREVIEW AREA */}
            <div className="flex-1 relative bg-slate-900/5 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="absolute top-4 right-4 z-10 flex gap-2 bg-white/90 backdrop-blur p-1 rounded-lg border border-slate-200 shadow-sm">
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 hover:bg-slate-100">
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="h-8 w-8 hover:bg-slate-100">
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setRotation(r => r + 90)} className="h-8 w-8 hover:bg-slate-100">
                        <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 text-emerald-600">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-8">
                    <div
                        className="transition-transform duration-200 ease-out origin-center"
                        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                    >
                        {activeDoc ? (
                            <div className="w-[500px] h-[700px] bg-white shadow-2xl rounded-sm flex flex-col items-center justify-center border border-slate-100">
                                {activeDoc.type === 'generated' ? (
                                    <div className="text-center p-8 space-y-4">
                                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                                            <FileCheck className="h-10 w-10 text-emerald-500" />
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-xl">{activeDoc.label}</h3>
                                        <p className="text-slate-400 text-sm max-w-xs mx-auto">This is a preview of the generated document. In production, the PDF would render here.</p>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 space-y-4">
                                        <FileText className="h-16 w-16 text-slate-300 mx-auto" />
                                        <h3 className="font-semibold text-slate-700 capitalize">{activeDoc.label}</h3>
                                        <p className="text-slate-400 text-xs">Original Upload</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400">
                                <p>No document selected</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* THUMBNAIL STRIP */}
            <div className="h-32 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Files & Drafts</h4>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">

                    {/* Uploaded Docs */}
                    {uploaded.map(doc => (
                        <button
                            key={doc.id}
                            onClick={() => setActiveDocId(doc.id)}
                            className={cn(
                                "flex-shrink-0 w-24 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all",
                                activeDocId === doc.id ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <FileText className={cn("h-6 w-6", activeDocId === doc.id ? "text-emerald-500" : "text-slate-400")} />
                            <span className="text-[10px] font-medium text-slate-600 truncate w-full text-center px-1 capitalize">
                                {doc.label}
                            </span>
                        </button>
                    ))}

                    {/* Divider if both exist */}
                    {uploaded.length > 0 && generated.length > 0 && (
                        <div className="w-px bg-slate-200 h-16 self-center" />
                    )}

                    {/* Generated Docs */}
                    {generated.map(doc => (
                        <button
                            key={doc.id}
                            onClick={() => setActiveDocId(doc.id)}
                            className={cn(
                                "flex-shrink-0 w-24 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all",
                                activeDocId === doc.id ? "border-blue-500 bg-blue-50/50" : "border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <FileCheck className={cn("h-6 w-6", activeDocId === doc.id ? "text-blue-500" : "text-blue-300")} />
                            <span className="text-[10px] font-medium text-slate-600 truncate w-full text-center px-1">
                                {doc.label}
                            </span>
                        </button>
                    ))}

                    {allDocs.length === 0 && (
                        <div className="text-xs text-slate-400 flex items-center h-full pl-2">No files available</div>
                    )}
                </div>
            </div>
        </div>
    )
}
