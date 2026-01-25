'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Calendar, MapPin, Save } from 'lucide-react'
import { FileUploadBox } from '../FileUploadBox'

interface BasicInfoStepProps {
    onNext: (data: any) => void
    onSaveDraft: (data: any) => void
    initialData: any
}

export function BasicInfoStep({ onNext, onSaveDraft, initialData }: BasicInfoStepProps) {
    const [data, setData] = useState({
        client_name: initialData.client_name || '',
        project_date: initialData.project_date || new Date().toISOString().split('T')[0],
        address: initialData.address || '',
    })

    // Track file URLs separately
    const [idCardUrl, setIdCardUrl] = useState<string>(initialData.documents?.id_card || '')

    const handleChange = (key: string, value: string) => {
        setData(prev => ({ ...prev, [key]: value }))
    }

    const handleUploadIdCard = (file: File, url: string) => {
        setIdCardUrl(url)
    }

    const isValid = data.client_name && data.project_date && idCardUrl

    const handleSubmit = () => {
        onNext({
            ...data,
            documents: {
                ...initialData.documents, // Preserve other docs if any
                id_card: idCardUrl
            }
        })
    }

    const handleSave = () => {
        onSaveDraft({
            ...data,
            documents: {
                ...initialData.documents,
                id_card: idCardUrl
            }
        })
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-xl font-semibold text-slate-900">Project Basics</h2>
                <p className="text-sm text-slate-500">Start by identifying the client and the installation date.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Client Name *</Label>
                    <Input
                        placeholder="e.g. Juan Garcia"
                        value={data.client_name}
                        onChange={(e) => handleChange('client_name', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Installation Address</Label>
                    <Input
                        placeholder="e.g. Calle Mayor 12, Madrid"
                        value={data.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Project Date *</Label>
                    <Input
                        type="date"
                        value={data.project_date}
                        onChange={(e) => handleChange('project_date', e.target.value)}
                    />
                </div>

                <div className="space-y-2 pt-2">
                    <Label>Client Identity Card *</Label>
                    <FileUploadBox
                        id="id_card"
                        label="Upload ID Card (DNI/NIE)"
                        icon={User}
                        onUploadComplete={handleUploadIdCard}
                        completed={!!idCardUrl}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <Button
                    variant="outline"
                    onClick={handleSave}
                    className="flex-1 text-slate-600 gap-2"
                >
                    <Save className="h-4 w-4" />
                    Save Draft
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!isValid}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                    Next Step
                </Button>
            </div>
        </div>
    )
}
