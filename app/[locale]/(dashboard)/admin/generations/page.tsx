'use client';

import { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, Search, RefreshCw, ZoomIn, 
  EyeOff, User, Calendar 
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Image from 'next/image';

interface Project {
  id: string;
  name: string;
  original_image: string;
  stencil_image: string;
  style: string;
  created_at: string;
  thumbnail_url?: string;
  user: {
    email: string;
    name: string | null;
  };
}

export default function GenerationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedImage, setSelectedImage] = useState<Project | null>(null);
  const [showStencil, setShowStencil] = useState(true);

  const loadProjects = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/generations?page=${page}&limit=24`;
      if (search) url += `&userEmail=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao carregar projetos');
      
      const data = await res.json();
      setProjects(data.projects || []);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar gerações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
        loadProjects();
    }, 500);
    return () => clearTimeout(timeout);
  }, [page, search]);

  return (
    <div className="min-h-screen bg-black text-white p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-900/20 border border-indigo-800/30 rounded-xl">
              <ImageIcon size={24} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Galeria Global</h1>
              <p className="text-zinc-400 text-sm">Monitoramento de gerações em tempo real</p>
            </div>
          </div>
          <button
            onClick={() => loadProjects()}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition"
          >
            <RefreshCw size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Busca */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg">
            <Search size={16} className="text-zinc-500" />
            <input
              type="text"
              placeholder="Filtrar por email do usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm w-full text-zinc-300 placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Grid de Imagens */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Carregando galeria..." />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
            <ImageIcon size={48} className="mx-auto text-zinc-700 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400">Nenhuma imagem encontrada</h3>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
               {projects.map((project) => (
                 <div 
                    key={project.id} 
                    className="group relative aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 cursor-pointer hover:border-indigo-500/50 transition-all"
                    onClick={() => setSelectedImage(project)}
                 >
                    <Image
                      src={project.thumbnail_url || project.stencil_image || project.original_image}
                      alt={project.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-110"
                      unoptimized
                    />
                    
                    {/* Overlay Info */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                       <p className="text-[10px] text-zinc-300 truncate">{project.user?.email}</p>
                       <p className="text-[9px] text-zinc-500">{new Date(project.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                 </div>
               ))}
            </div>

            {/* Paginação */}
            <div className="mt-8 p-4 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-800 transition"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-500">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-800 transition"
              >
                Próxima
              </button>
            </div>
          </>
        )}

        {/* Modal de Detalhes com Toggle Original/Estêncil */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
            <div 
              className="bg-zinc-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{selectedImage.name}</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {selectedImage.user?.email} • {new Date(selectedImage.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedImage(null)} 
                  className="text-zinc-400 hover:text-white p-2 shrink-0"
                >
                  <EyeOff size={20} />
                </button>
              </div>

              {/* Toggle Original/Stencil */}
              <div className="flex justify-center gap-2 p-3 bg-zinc-950">
                <button
                  onClick={() => setShowStencil(false)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                    !showStencil ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setShowStencil(true)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                    showStencil ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  Estêncil
                </button>
              </div>

              {/* Image */}
              <div className="p-4 lg:p-6 bg-white">
                <div className="relative w-full h-[45vh] lg:h-[50vh]">
                  <Image
                    src={showStencil ? selectedImage.stencil_image : selectedImage.original_image}
                    alt={selectedImage.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                    className="object-contain"
                    unoptimized
                    priority
                  />
                </div>
              </div>

              {/* Info Footer */}
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-zinc-500" />
                    <span className="text-xs text-zinc-400">{selectedImage.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-900/30 text-indigo-400 text-xs rounded border border-indigo-800/50 capitalize">
                      {selectedImage.style || 'Standard'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
