'use client'

import { useState } from 'react'
import { Check, UploadCloud } from 'lucide-react'

interface FileUploadBoxProps {
    id: string
    label: string
    icon: any
    onChange?: (file: File) => void
    onUploadComplete?: (file: File, url: string) => void
    completed?: boolean
    optional?: boolean
    setParentUploading?: (uploading: boolean) => void
}

export function FileUploadBox({ id, label, icon: Icon, onChange, onUploadComplete, completed, optional, setParentUploading }: FileUploadBoxProps) {
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
            if (onChange) onChange(file)
            setPreview(URL.createObjectURL(file))
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
        <div className={`relative border-2 border-dashed rounded-xl p-4 transition-colors ${completed ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-200 hover:border-emerald-500/50 bg-white hover:bg-slate-50'
            }`}>
            <input
                type="file"
                id={id}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept="image/*,.pdf"
                onChange={handleChange}
            />
            <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 transition-colors ${completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                    {uploading ? (
                        <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : completed ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                    <p className={`font-medium ${completed ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {label} {optional && <span className="text-slate-400 text-xs font-normal">(Optional)</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                        {completed ? 'File uploaded' : 'Tap to upload or take photo'}
                    </p>
                </div>
            </div>
        </div>
    )
}
