'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Vecchio indirizzo dell'utenza: rimanda a quello dentro la propria area.
 *
 * La pagina adesso vive in `/installer/cuenta` e `/admin/cuenta`, così
 * eredita la barra di navigazione dell'area da cui si arriva. Qui non
 * c'è più niente, ma l'indirizzo resta: link vecchi, segnalibri, e la
 * scheda che qualcuno aveva aperta.
 */
export default function CuentaRedirige() {
    const router = useRouter()

    useEffect(() => {
        let vivo = true
        fetch('/api/cuenta')
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!vivo) return
                router.replace(
                    j?.data?.role === 'admin' ? '/admin/cuenta' : '/installer/cuenta'
                )
            })
            // Senza risposta si va dalla parte dell'installatore, che è
            // la più probabile: sono molti e l'agenzia è una.
            .catch(() => vivo && router.replace('/installer/cuenta'))
        return () => {
            vivo = false
        }
    }, [router])

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--caes-paper)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--caes-faint)]" />
        </div>
    )
}
