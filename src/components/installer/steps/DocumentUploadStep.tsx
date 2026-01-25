'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UploadCloud, Camera, Check, FileText } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface DocumentUploadStepProps {
    onNext: (data: any) => void
    initialData: any
}

export function DocumentUploadStep({ onNext, initialData }: DocumentUploadStepProps) {
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        invoice: null,
        oldHeater: null,
        specs: null,
    })
    const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({})
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Used purely for UI "completed" state check (legacy)
    const handleFileChange = (key: string, file: File) => {
        setFiles((prev) => ({ ...prev, [key]: file }))
    }

    const handleUploadComplete = (key: string, url: string) => {
        setFileUrls((prev) => ({ ...prev, [key]: url }))
    }

    const handleNext = () => {
        setIsAnalyzing(true)
        // Simulate Claude extraction delay
        setTimeout(() => {
            setIsAnalyzing(false)
            onNext({
                files, // Keep for legacy if needed
                fileUrls, // Pass the real Supabase URLs
                extracted: {
                    make: 'Ariston',
                    model: 'Genus One 24',
                    power: 24,
                    serial: 'SN987654321',
                    type: 'aerothermal',
                }
            })
        }, 2000)
    }

    const isFormValid = files.invoice && files.oldHeater

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Upload Documents</h2>
                <p className="text-sm text-slate-400">
                    We need photos of the invoice and the old equipment to verify eligibility.
                </p>
            </div>

            <div className="grid gap-4">
                <FileUploadBox
                    id="invoice"
                    label="Invoice (New Heater)"
                    icon={FileText}
                    onChange={(f: File) => handleFileChange('invoice', f)}
                    onUploadComplete={(file: File, url: string) => handleUploadComplete('invoice', url)}
                    completed={!!files.invoice}
                />
                <FileUploadBox
                    id="oldHeater"
                    label="Photo of Old Heater"
                    icon={Camera}
                    onChange={(f: File) => handleFileChange('oldHeater', f)}
                    onUploadComplete={(file: File, url: string) => handleUploadComplete('oldHeater', url)}
                    completed={!!files.oldHeater}
                />
                <FileUploadBox
                    id="specs"
                    label="Technical Specs (Optional)"
                    icon={FileText}
                    onChange={(f: File) => handleFileChange('specs', f)}
                    onUploadComplete={(file: File, url: string) => handleUploadComplete('specs', url)}
                    completed={!!files.specs}
                    optional
                />
            </div>

            <Button
                onClick={handleNext}
                disabled={!isFormValid || isAnalyzing}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 text-lg"
            >
                {isAnalyzing ? 'Analyzing with AI...' : 'Analyze Documents'}
            </Button>
        </div>
    )
}

function FileUploadBox({ id, label, icon: Icon, onChange, onUploadComplete, completed, optional, setParentUploading }: any) {
    const [preview, setPreview] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)

    const handleUpload = async (file: File) => {
        setUploading(true)
        if (setParentUploading) setParentUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            if (onUploadComplete) onUploadComplete(file, data.url)
            if (onChange) onChange(file) // Call parent onChange to update 'completed' state
            setPreview(URL.createObjectURL(file)) // Set preview after successful upload
        } catch (error) {
            console.error('Upload failed:', error)
            alert('Upload failed. Please try again.')
        } finally {
            setUploading(false)
            if (setParentUploading) setParentUploading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleUpload(file)
        }
    }

    return (
        <div className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${completed ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border hover:border-primary/50 bg-card hover:bg-accent'
            }`}>
            <input
                type="file"
                id={id}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept="image/*,.pdf"
                onChange={handleChange}
            />
            <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 transition-colors ${completed ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                    {uploading ? (
                        <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : completed ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                    <p className={`font-medium ${completed ? 'text-primary' : 'text-foreground'}`}>
                        {label} {optional && <span className="text-muted-foreground text-xs font-normal">(Optional)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {completed ? 'File uploaded' : 'Tap to upload or take photo'}
                    </p>
                </div>
            </div>
        </div>
    )
}
