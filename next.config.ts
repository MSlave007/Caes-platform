import type { NextConfig } from "next";

/**
 * turbopack.root va fissato a mano.
 *
 * In C:\Users\marco esistono un package.json e un package-lock.json residui
 * (596 byte, di un `npm install` finito nella home per sbaglio). Next li trova
 * risalendo le cartelle e elegge la home a radice del workspace: da lì Tailwind
 * cerca i sorgenti nel posto sbagliato, non trova nessuna classe e serve un CSS
 * quasi vuoto. I token --caes-* spariscono e la landing perde i colori —
 * pannelli trasparenti e testo chiaro su fondo chiaro.
 *
 * process.cwd() è la cartella da cui parte `npm run dev`, cioè questa.
 * Da non sostituire con __dirname: in un config TypeScript punta alla
 * cartella padre e Turbopack non risolve più nemmeno 'tailwindcss'.
 */
const nextConfig: NextConfig = {
    turbopack: {
        root: process.cwd(),
    },
};

export default nextConfig;
