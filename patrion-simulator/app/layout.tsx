import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patrion Simulator",
  description: "Simulacao comercial e estudo Multi-Cotas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="border-b bg-white">
          <div className="shell flex items-center justify-between py-4">
            <Link className="text-lg font-semibold text-emerald-950" href="/">
              Patrion Simulator
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/simulacao-comercial">Simulacao Comercial</Link>
              <Link href="/multi-cotas">Multi-Cotas</Link>
            </nav>
          </div>
        </header>
        <main className="shell py-8">{children}</main>
      </body>
    </html>
  );
}
