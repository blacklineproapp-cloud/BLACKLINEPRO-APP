'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Grid Principal */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo e Descrição */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image
                src="/icon-192x192.png"
                alt="StencilFlow"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-2xl font-bold text-white">StencilFlow</span>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
              Transforme qualquer imagem em stencil profissional para tatuagem com Stencil Flow. 
              A ferramenta definitiva para tatuadores profissionais.
            </p>
            
            {/* Redes Sociais */}
            <div className="flex gap-4 mt-6">
              <a
                href="https://instagram.com/stencilflowapp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-emerald-400 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com/@stencilflowapp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-emerald-400 transition-colors"
                aria-label="YouTube"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h3 className="text-white font-semibold mb-4">Produto</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/pricing" className="text-zinc-400 hover:text-emerald-400 transition-colors text-sm">
                  Preços
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-zinc-400 hover:text-emerald-400 transition-colors text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/suporte" className="text-zinc-400 hover:text-emerald-400 transition-colors text-sm">
                  Suporte
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/termos" className="text-zinc-400 hover:text-emerald-400 transition-colors text-sm">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-zinc-400 hover:text-emerald-400 transition-colors text-sm">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <a href="mailto:contato@stencilflow.com.br" className="text-zinc-400 hover:text-emerald-400 transition-colors text-sm">
                  Contato
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <p className="text-zinc-500 text-sm">
              © {currentYear} StencilFlow. Todos os direitos reservados.
            </p>
            
            {/* Badge de Segurança */}
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Pagamento seguro via Stripe</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
