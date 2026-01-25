'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Save, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { FileUploadBox } from '../FileUploadBox'

interface PhotosStepProps {
    onNext: (data: any) => void
    onBack: () => void
    onSaveDraft: (data: any) => void
    initialData: any
}

export function PhotosStep({ onNext, onBack, onSaveDraft, initialData }: PhotosStepProps) {
    const [photos, setPhotos] = useState({
        photo_before_serial: initialData.documents?.photo_before_serial || '',
        photo_before_water: initialData.documents?.photo_before_water || '',
        photo_before_whole: initialData.documents?.photo_before_whole || '',
        photo_after_serial: initialData.documents?.photo_after_serial || '',
        photo_after_water: initialData.documents?.photo_after_water || '',
        photo_after_whole: initialData.documents?.photo_after_whole || '',
    })

    const handleUpload = (key: string, url: string) => {
        setPhotos(prev => ({ ...prev, [key]: url }))
    }

    const isValid = Object.values(photos).every(url => url !== '')

    const getPayload = () => ({
        documents: {
            ...initialData.documents,
            ...photos
        }
    })

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
                <h2 className="text-xl font-semibold text-slate-900">Photographic Evidence</h2>
                <p className="text-sm text-slate-500">Capture the installation before and after works.</p>
            </div>

            {/* Before Section */}
            <div className="space-y-3">
                <h3 className="font-medium text-slate-900 border-b pb-2">Before Substitution</h3>
                <div className="grid gap-3">
                    <FileUploadBox id="pbs" label="Serial Number (Old)" icon={Camera}
                        onUploadComplete={(_, url) => handleUpload('photo_before_serial', url)}
                        completed={!!photos.photo_before_serial}
                    />
                    <FileUploadBox id="pbw" label="Water Deposit / Connections" icon={Camera}
                        onUploadComplete={(_, url) => handleUpload('photo_before_water', url)}
                        completed={!!photos.photo_before_water}
                    />
                    <FileUploadBox id="pbwh" label="Whole Unit (Context)" icon={Camera}
                        onUploadComplete={(_, url) => handleUpload('photo_before_whole', url)}
                        completed={!!photos.photo_before_whole}
                    />
                </div>
            </div>

            {/* After Section */}
            <div className="space-y-3">
                <h3 className="font-medium text-slate-900 border-b pb-2">After Substitution (New)</h3>
                <div className="grid gap-3">
                    <FileUploadBox id="pas" label="Serial Number (New)" icon={Camera}
                        onUploadComplete={(_, url) => handleUpload('photo_after_serial', url)}
                        completed={!!photos.photo_after_serial}
                    />
                    <FileUploadBox id="paw" label="Water Deposit / Connections" icon={Camera}
                        onUploadComplete={(_, url) => handleUpload('photo_after_water', url)}
                        completed={!!photos.photo_after_water}
                    />
                    <FileUploadBox id="pawh" label="Whole Heat Pump" icon={Camera}
                        onUploadComplete={(_, url) => handleUpload('photo_after_whole', url)}
                        completed={!!photos.photo_after_whole}
                    />
                </div>
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
                    disabled={isValid === false} // Optional: Enable/Disable strict validation
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                    Review Project
                </Button>
            </div>
        </div>
    )
}
