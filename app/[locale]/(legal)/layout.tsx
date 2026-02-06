import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/20">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-emerald-400 transition"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Voltar para StencilFlow</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8 lg:p-12">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/privacidade" className="text-zinc-400 hover:text-emerald-400 transition">
              Privacidade
            </Link>
            <Link href="/termos" className="text-zinc-400 hover:text-emerald-400 transition">
              Termos de Uso
            </Link>
            <Link href="/cookies" className="text-zinc-400 hover:text-emerald-400 transition">
              Cookies
            </Link>
            <Link href="/reembolso" className="text-zinc-400 hover:text-emerald-400 transition">
              Reembolso
            </Link>
          </div>
          <p className="text-center text-zinc-600 text-xs mt-4">
            © {new Date().getFullYear()} StencilFlow. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
