import { redirect } from 'next/navigation'

/**
 * La creazione dell'espediente vive ora in /installer/documentos, dove il
 * percorso ha i passi navigabili e il salvataggio della bozza. Questa rotta
 * resta solo per non rompere i link già in giro.
 */
export default function NewProjectPage() {
    redirect('/installer/documentos')
}
