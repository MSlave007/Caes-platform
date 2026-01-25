'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, Save, ArrowLeft } from 'lucide-react'
import { FileUploadBox } from '../FileUploadBox'

interface DocumentationStepProps {
    onNext: (data: any) => void
    onBack: () => void
    onSaveDraft: (data: any) => void
    initialData: any
}

export function DocumentationStep({ onNext, onBack, onSaveDraft, initialData }: DocumentationStepProps) {
    const [docs, setDocs] = useState({
        cert_before: initialData.documents?.cert_before || '',
        cert_after: initialData.documents?.cert_after || '',
        tech_sheet: initialData.documents?.tech_sheet || '',
        rite_doc: initialData.documents?.rite_doc || '',
    })

    const handleUpload = (key: string, url: string) => {
        setDocs(prev => ({ ...prev, [key]: url }))
    }

    const isValid = docs.cert_before && docs.cert_after && docs.tech_sheet && docs.rite_doc

    const getPayload = () => ({
        documents: {
            ...initialData.documents,
            ...docs
        }
    })

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-xl font-semibold text-slate-900">Technical Documentation</h2>
                <p className="text-sm text-slate-500">Upload the required certificates and technical sheets.</p>
            </div>

            <div className="grid gap-4">
                <FileUploadBox
                    id="cert_before"
                    label="Energy Certificate (Before)"
                    icon={FileText}
                    onUploadComplete={(_, url) => handleUpload('cert_before', url)}
                    completed={!!docs.cert_before}
                />
                <FileUploadBox
                    id="cert_after"
                    label="Energy Certificate (After)"
                    icon={FileText}
                    onUploadComplete={(_, url) => handleUpload('cert_after', url)}
                    completed={!!docs.cert_after}
                />
                <FileUploadBox
                    id="tech_sheet"
                    label="New Heat Pump Tech Sheet"
                    icon={FileText}
                    onUploadComplete={(_, url) => handleUpload('tech_sheet', url)}
                    completed={!!docs.tech_sheet}
                />
                <FileUploadBox
                    id="rite_doc"
                    label="RITE Document"
                    icon={FileText}
                    onUploadComplete={(_, url) => handleUpload('rite_doc', url)}
                    completed={!!docs.rite_doc}
                />
            </div>

            <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={onBack} className="text-slate-400">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Button
                    variant="outline"
                    onClick={() => onSaveDraft(getPayload())}
                    className="flex-1 text-slate-600 gap-2"
                >
                    <Save className="h-4 w-4" />
                    Save Draft
                </Button>
                <Button
                    onClick={() => onNext(getPayload())}
                    disabled={!isValid}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                    Next Step
                </Button>
            </div>
        </div>
    )
}
