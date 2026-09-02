import { redirect } from 'next/navigation'

/**
 * Il vecchio simulatore calcolava moltiplicando il costo del progetto per
 * 0,35 / 0,22 / 0,13 — numeri inventati, senza rapporto con la tariffa CAES.
 * È sostituito dal calcolatore della landing, che usa il motore vero.
 */
export default function SimulatorPage() {
    redirect('/es#calculadora')
}
