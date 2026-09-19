'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, AlertTriangle, Check } from 'lucide-react'
import { clearDraft } from '@/lib/draft'
import {
    estimate,
    eur,
    DEMANDA_CALEFACCION_POR_ZONA,
    COMISION_MAXIMA_PCT,
} from '@/lib/caes/estimate'

/**
 * Ultima tappa del modulo installatore: i dati minimi e l'invio.
 *
 * Prima qui c'era uno StepPlaceholder, cioè solo testo descrittivo: il
 * modulo non inviava niente a nessuno e una pratica compilata non poteva
 * comparire nella coda di revisione. Questo chiude il giro.
 *
 * NON è la versione definitiva. Nel prodotto vero marca, modello, potenza
 * e superficie escono dall'estrazione dei documenti (tappa 2) e qui si
 * confermano soltanto; il risparmio lo calcola il motore sui dati veri.
 * Qui si chiedono a mano perché la tappa 2 è ancora un segnaposto, e
 * perché senza un invio funzionante non si possono fare dimostrazioni.
 */

const ZONAS = Object.keys(DEMANDA_CALEFACCION_POR_ZONA)
const ZONA_CIUDAD: Record<string, string> = {
    A3: 'Cádiz',
    B3: 'Valencia',
    C1: 'Bilbao',
    C3: 'Madrid',
    D2: 'Zaragoza',
    D3: 'Valladolid',
    E1: 'Burgos',
}
const SUPERFICIES = [70, 90, 110, 130, 150, 180, 220, 280, 350, 500]
const SUSTITUIDOS: { id: string; label: string }[] = [
    { id: 'caldera_gas', label: 'Caldera de gas' },
    { id: 'caldera_gasoleo', label: 'Caldera de gasóleo' },
    { id: 'termo_electrico', label: 'Termo eléctrico' },
]

type Doc = { id: string; name: string; verified: boolean; path?: string }

const label = 'block font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]'
const field =
    'mt-1.5 w-full rounded-[6px] border border-[var(--caes-line)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--caes-ink)] outline-none transition-colors focus:border-[var(--caes-green)]'

export default function SubmitStep({ docs }: { docs: Doc[] }) {
    const router = useRouter()

    const [cliente, setCliente] = useState('')
    const [direccion, setDireccion] = useState('')
    const [empresa, setEmpresa] = useState('')
    const [superficie, setSuperficie] = useState(220)
    const [zona, setZona] = useState('D3')
    const [sustituido, setSustituido] = useState('caldera_gas')
    const [marca, setMarca] = useState('')
    const [modelo, setModelo] = useState('')
    const [comision, setComision] = useState(25)

    const [enviando, setEnviando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const r = useMemo(
        () =>
            estimate({
                superficieM2: superficie,
                zona,
                sustituido,
                comisionInstaladorPct: comision,
            }),
        [superficie, zona, sustituido, comision]
    )

    const puedeEnviar = cliente.trim().length > 1 && !enviando

    async function enviar() {
        setEnviando(true)
        setError(null)
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'installer',
                    status: 'submitted',
                    client_name: cliente.trim(),
                    installer_name: empresa.trim() || 'Sin nombre',
                    address: direccion.trim(),
                    savings_eur: r.valorTotal,
                    savings_pct: r.ahorroPct,
                    installer_pct: comision,
                    make: marca.trim(),
                    model: modelo.trim(),
                    power_kw: 0,
                    docs,
                }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error ?? 'No se ha podido enviar')
            // Senza questo la bozza resta e alla riapertura il modulo
            // ripropone una pratica già inviata.
            clearDraft()
            router.push('/installer/dashboard')
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se ha podido enviar')
            setEnviando(false)
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-[clamp(22px,2.8vw,30px)] font-semibold tracking-[-0.03em] text-[var(--caes-ink)]">
                    Tu comisión y el envío
                </h2>
                <p className="mt-2.5 max-w-[62ch] text-[15.5px] leading-[1.6] text-[var(--caes-mut)]">
                    Eliges cuánto te quedas, hasta el 30 % que marca la norma. Al enviar queda
                    bloqueado y el expediente entra en la cola de revisión de la agencia.
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <label className={label} htmlFor="sb-cliente">
                        Cliente
                    </label>
                    <input
                        id="sb-cliente"
                        className={field}
                        value={cliente}
                        onChange={(e) => setCliente(e.target.value)}
                        placeholder="Nombre y apellidos"
                    />
                </div>
                <div>
                    <label className={label} htmlFor="sb-empresa">
                        Tu empresa
                    </label>
                    <input
                        id="sb-empresa"
                        className={field}
                        value={empresa}
                        onChange={(e) => setEmpresa(e.target.value)}
                        placeholder="Clima Levante S.L."
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className={label} htmlFor="sb-direccion">
                        Dirección de la instalación
                    </label>
                    <input
                        id="sb-direccion"
                        className={field}
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        placeholder="Calle, número, población"
                    />
                </div>
                <div>
                    <label className={label} htmlFor="sb-marca">
                        Marca
                    </label>
                    <input
                        id="sb-marca"
                        className={field}
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        placeholder="Daikin"
                    />
                </div>
                <div>
                    <label className={label} htmlFor="sb-modelo">
                        Modelo
                    </label>
                    <input
                        id="sb-modelo"
                        className={field}
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        placeholder="Altherma 3"
                    />
                </div>
            </div>

            <div className="grid gap-5 border-t border-[var(--caes-line-2)] pt-7 sm:grid-cols-3">
                <div>
                    <label className={label} htmlFor="sb-sup">
                        Superficie útil
                    </label>
                    <select
                        id="sb-sup"
                        className={field}
                        value={superficie}
                        onChange={(e) => setSuperficie(Number(e.target.value))}
                    >
                        {SUPERFICIES.map((m) => (
                            <option key={m} value={m}>
                                {m} m²
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={label} htmlFor="sb-zona">
                        Zona climática
                    </label>
                    <select
                        id="sb-zona"
                        className={field}
                        value={zona}
                        onChange={(e) => setZona(e.target.value)}
                    >
                        {ZONAS.map((z) => (
                            <option key={z} value={z}>
                                {z} · {ZONA_CIUDAD[z] ?? z}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={label} htmlFor="sb-sust">
                        Equipo sustituido
                    </label>
                    <select
                        id="sb-sust"
                        className={field}
                        value={sustituido}
                        onChange={(e) => setSustituido(e.target.value)}
                    >
                        {SUSTITUIDOS.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* comisión + resultado */}
            <div className="grid gap-7 rounded-[10px] border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-7">
                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-4">
                        <span className={label}>Tu comisión</span>
                        <span className="font-mono tabular text-[19px] font-medium tracking-[-0.025em] text-[var(--caes-ink)]">
                            {comision} %
                        </span>
                    </div>
                    <input
                        type="range"
                        id="sb-comision"
                        min={0}
                        max={COMISION_MAXIMA_PCT}
                        step={1}
                        value={comision}
                        onChange={(e) => setComision(Number(e.target.value))}
                        className="earn-range w-full cursor-pointer"
                    />
                    <p className="text-[12.5px] leading-[1.45] text-[var(--caes-faint)]">
                        El tope legal es el 30 % del valor del certificado.
                    </p>
                </div>

                <div className="flex flex-col gap-3 border-t border-[var(--caes-line-2)] pt-5 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0">
                    <div className="flex items-baseline justify-between gap-4">
                        <span className="text-[14px] text-[var(--caes-mut)]">Valor del certificado</span>
                        <span className="font-mono tabular text-[17px] font-medium text-[var(--caes-ink)]">
                            {eur(r.valorTotal)}
                        </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                        <span className="text-[14px] text-[var(--caes-mut)]">Tu parte</span>
                        <span className="font-mono tabular text-[22px] font-medium tracking-[-0.025em] text-[var(--caes-green)]">
                            {eur(r.parteInstalador)}
                        </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                        <span className="text-[14px] text-[var(--caes-mut)]">Para tu cliente</span>
                        <span className="font-mono tabular text-[17px] font-medium text-[var(--caes-ink)]">
                            {eur(r.parteCliente)}
                        </span>
                    </div>

                    {r.cumpleMinimo ? (
                        <p className="mt-1 inline-flex items-center gap-2 text-[13px] text-[var(--caes-green)]">
                            <Check className="h-3.5 w-3.5" />
                            Supera el 20 % mínimo ({r.ahorroPct.toFixed(1)} %)
                        </p>
                    ) : (
                        <p className="mt-1 inline-flex items-start gap-2 text-[13px] leading-[1.45] text-[#9A6B1E]">
                            <AlertTriangle className="mt-[2px] h-3.5 w-3.5 shrink-0" />
                            No llega al 20 % mínimo del BOE ({r.ahorroPct.toFixed(1)} %)
                        </p>
                    )}
                </div>
            </div>

            {error ? (
                <p className="rounded-[6px] border border-[#D8A0A0] bg-[#FBF0F0] px-4 py-3 text-[14px] text-[#8A3129]">
                    {error}
                </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-[13px] text-[var(--caes-faint)]">
                    {docs.length > 0
                        ? `${docs.length} documento${docs.length === 1 ? '' : 's'} adjunto${docs.length === 1 ? '' : 's'}`
                        : 'Sin documentos adjuntos'}
                </p>
                <button
                    type="button"
                    disabled={!puedeEnviar}
                    onClick={enviar}
                    className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-green)] px-7 py-3.5 text-[15px] font-medium text-white transition-all duration-300 hover:bg-[var(--caes-green-hi)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                    {enviando ? 'Enviando…' : 'Enviar expediente'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
            </div>
        </div>
    )
}
