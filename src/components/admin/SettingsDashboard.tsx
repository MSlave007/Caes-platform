'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Bell, Shield, Lock, CreditCard, Users, LogOut, Moon, Sun, Laptop } from 'lucide-react'
import { createClient } from '@/lib/auth/supabaseClient'
import { useRouter } from 'next/navigation'

interface SettingsDashboardProps {
    user: any
    profile: any
}

export function SettingsDashboard({ user, profile }: SettingsDashboardProps) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <Tabs defaultValue="profile" className="space-y-6">
            <div className="flex items-center justify-between">
                <TabsList className="bg-muted p-1 rounded-lg">
                    <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
                    <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
                    <TabsTrigger value="billing" className="gap-2"><CreditCard className="h-4 w-4" /> Billing</TabsTrigger>
                </TabsList>
                <Button variant="ghost" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </div>

            {/* PROFILE TAB */}
            <TabsContent value="profile" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Public Profile</CardTitle>
                            <CardDescription>This is how others will see you on the platform.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-8 items-start">
                            <div className="flex flex-col items-center gap-3">
                                <Avatar className="h-24 w-24 border-2 border-border">
                                    <AvatarFallback className="text-3xl bg-slate-100 font-medium text-slate-600">
                                        {profile?.full_name?.slice(0, 2).toUpperCase() || 'AD'}
                                    </AvatarFallback>
                                </Avatar>
                                <Button variant="outline" size="sm">Change Avatar</Button>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="grid gap-2">
                                    <Label>Full Name</Label>
                                    <Input defaultValue={profile?.full_name || ''} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Email Address</Label>
                                    <Input defaultValue={user?.email} disabled className="bg-muted" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Bio</Label>
                                    <Input placeholder="Senior Admin at CAES..." />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end">
                            <Button>Save Profile</Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription>Customize the interface look and feel.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded-md"><Sun className="h-4 w-4 text-orange-500" /></div>
                                    <span className="font-medium">Light Mode</span>
                                </div>
                                <div className="h-4 w-4 rounded-full border border-primary bg-primary" />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer opacity-60">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-md"><Moon className="h-4 w-4 text-slate-300" /></div>
                                    <span className="font-medium">Dark Mode</span>
                                </div>
                                <div className="h-4 w-4 rounded-full border border-slate-300" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Manage password and 2FA.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium">Two-Factor Authentication</div>
                                    <div className="text-xs text-muted-foreground">Add an extra layer of security.</div>
                                </div>
                                <Switch />
                            </div>
                            <Separator />
                            <Button variant="outline" className="w-full">Change Password</Button>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* NOTIFICATIONS TAB */}
            <TabsContent value="notifications" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Email Notifications</CardTitle>
                        <CardDescription>Configure when you receive emails.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">New Project Submission</Label>
                                <p className="text-sm text-muted-foreground">Receive an email when an installer submits a new project.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Weekly Report</Label>
                                <p className="text-sm text-muted-foreground">Get a summary of platform activity every Monday.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Installer Signups</Label>
                                <p className="text-sm text-muted-foreground">Notify me when a new installer registers.</p>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 px-6 py-4 flex justify-end">
                        <Button>Save Preferences</Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            {/* TEAM TAB */}
            <TabsContent value="team" className="space-y-4">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Team Members</CardTitle>
                                <CardDescription>Manage who has access to the admin dashboard.</CardDescription>
                            </div>
                            <Button className="bg-emerald-600 hover:bg-emerald-700">Invite Member</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {[
                                { name: profile?.full_name || 'You', email: user?.email, role: 'Owner', date: 'Joined today', avatar: profile?.full_name?.[0] || 'Y' },
                                { name: 'Sarah Connor', email: 'sarah@caes.com', role: 'Admin', date: 'Joined 2 days ago', avatar: 'S' },
                                { name: 'Mike Ross', email: 'mike@caes.com', role: 'Viewer', date: 'Joined 1 week ago', avatar: 'M' }
                            ].map((member, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback>{member.avatar}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium leading-none">{member.name} {i === 0 && '(You)'}</p>
                                            <p className="text-sm text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge variant={member.role === 'Owner' ? 'default' : 'secondary'}>{member.role}</Badge>
                                        {i !== 0 && (
                                            <Button variant="ghost" size="sm" className="text-red-500 h-8 px-2">Remove</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* BILLING TAB */}
            <TabsContent value="billing" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">Enterprise</div>
                            <p className="text-xs text-muted-foreground mt-1">Unlimited Projects</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Projects this month</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">142</div>
                            <p className="text-xs text-emerald-500 mt-1">+12% from last month</p>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Invoices</CardTitle>
                        <CardDescription>View your platform subscription history.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-slate-500 text-center py-8">
                            Everything is paid up! Next invoice due Feb 25, 2026.
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

        </Tabs>
    )
}
