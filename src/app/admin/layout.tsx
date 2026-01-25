import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background text-foreground flex">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-8 min-h-screen bg-background">
                {children}
            </main>
        </div>
    )
}
