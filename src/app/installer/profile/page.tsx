'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function InstallerProfilePage() {
    return (
        <div className="space-y-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight">Installer Profile</h1>

            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle>Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input defaultValue="Solar & Heat S.L." className="bg-slate-800 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>NIF / CIF</Label>
                        <Input defaultValue="B12345678" className="bg-slate-800 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input defaultValue="marco@installer.com" disabled className="bg-slate-800 border-slate-700 opacity-50" />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input defaultValue="+34 600 000 000" className="bg-slate-800 border-slate-700" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle>Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="font-medium text-emerald-400">RITE Certified</div>
                        <div className="text-xs text-emerald-500">Valid until 2028</div>
                    </div>
                </CardContent>
            </Card>

            <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                Save Changes
            </Button>
        </div>
    )
}
