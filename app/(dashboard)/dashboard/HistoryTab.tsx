'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Clock, Search, Filter, Loader2, Pencil, Download, Trash2, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';

interface AIGenImage {
  id: string;
  created_at: string;
  metadata: {
    prompt?: string;
    size?: string;
    generated_image?: string;
  };
}

interface IAGenGalleryProps {
  images: AIGenImage[];
  userId: string;
}

export default function IAGenGallery({ images, userId }: IAGenGalleryProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<AIGenImage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [inlineEditPrompt, setInlineEditPrompt] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const IMAGES_PER_PAGE = 12; // 4 colunas x 3 linhas (ou 2x6 no mobile)

  // Filtrar imagens baseado na busca e filtro
  const filteredImages = images.filter(img => {
    if (!img.metadata.generated_image) return false;
    const prompt = img.metadata.prompt || '';
    const matchesSearch = prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSize === 'all' || img.metadata.size === filterSize;
    return matchesSearch && matchesFilter;
  });

  // Resetar página ao filtrar
  const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);
  const paginatedImages = filteredImages.slice(
    currentPage * IMAGES_PER_PAGE,
    (currentPage + 1) * IMAGES_PER_PAGE
  );

  // Resetar para página 1 quando filtro/busca muda
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterSize]);

  // Tamanhos únicos para filtro
  const uniqueSizes = [...new Set(images.map(img => img.metadata.size).filter(Boolean))];

  const handleQuickDownload = async (image: AIGenImage, e: React.MouseEvent) => {
    e.stopPropagation();
    const imageUrl = image.metadata.generated_image;
    if (!imageUrl) return;

    const fileName = `ia-gen-${image.id}.png`;
    
    try {
      // Converter base64/URL para blob para forçar download
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback para método antigo
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      link.click();
    }
  };

  const handleDelete = async (imageId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
    
    setIsDeleting(imageId);
    try {
      // Aqui você pode adicionar uma API para deletar se necessário
      router.refresh();
      setSelectedImage(null);
    } catch (error) {
      alert('Erro ao excluir');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div>
      {/* Header da Galeria com Busca e Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-zinc-300 font-semibold flex items-center gap-2 text-sm">
          <Clock size={16} /> Galeria IA Gen
          {filteredImages.length !== images.length && (
            <span className="text-zinc-500 font-normal">
              ({filteredImages.length} de {images.length})
            </span>
          )}
        </h2>
        
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Busca */}
          <div className="relative flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          
          {/* Filtro por Tamanho */}
          {uniqueSizes.length > 0 && (
            <div className="relative">
              <select
                value={filterSize}
                onChange={(e) => setFilterSize(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos</option>
                {uniqueSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          )}
        </div>
      </div>
      
      {filteredImages && filteredImages.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
            {paginatedImages.map((image) => (
              <div 
                key={image.id} 
                onClick={() => setSelectedImage(image)}
                className="group bg-white rounded-xl overflow-hidden cursor-pointer relative hover:ring-2 hover:ring-emerald-500 transition-all shadow-lg"
              >
                <div className="aspect-square bg-white p-3 lg:p-4 flex items-center justify-center relative">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="relative w-full h-full z-10 group-hover:scale-105 transition-transform duration-300">
                    <Image 
                      src={image.metadata.generated_image!} 
                      alt={image.metadata.prompt || 'IA Gen'} 
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1200px) 22vw, 18vw"
                      loading="lazy"
                      unoptimized
                      onError={(e) => {
                        console.warn('[Image] Falha ao carregar IA Gen:', image.id);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Overlay com Quick Actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors z-20 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {/* Quick Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleQuickDownload(image, e)}
                        className="p-2.5 bg-white/90 hover:bg-white rounded-full text-zinc-800 hover:text-emerald-600 transition shadow-lg"
                        title="Baixar"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(image.id, e)}
                        disabled={isDeleting === image.id}
                        className="p-2.5 bg-white/90 hover:bg-red-500 rounded-full text-zinc-800 hover:text-white transition shadow-lg disabled:opacity-50"
                        title="Excluir"
                      >
                        {isDeleting === image.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                    <span className="text-white text-xs font-medium drop-shadow-lg mt-1">Clique para ampliar</span>
                  </div>
                </div>
                
                <div className="bg-zinc-900 p-2 lg:p-3 border-t border-zinc-800">
                  {editingImageId === image.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={inlineEditPrompt}
                        onChange={(e) => setInlineEditPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setEditingImageId(null);
                          }
                          if (e.key === 'Escape') setEditingImageId(null);
                        }}
                        onBlur={() => setEditingImageId(null)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none min-w-0"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group/name">
                      <h3 className="text-zinc-200 font-medium text-xs lg:text-sm truncate flex-1">{image.metadata.prompt || 'Sem descrição'}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInlineEditPrompt(image.metadata.prompt || '');
                          setEditingImageId(image.id);
                        }}
                        className="p-0.5 text-zinc-600 hover:text-emerald-400 opacity-0 group-hover/name:opacity-100 transition shrink-0"
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-zinc-500 text-[10px] lg:text-xs">
                      {new Date(image.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    {image.metadata.size && (
                      <span className="text-zinc-600 text-[10px] lg:text-xs">{image.metadata.size}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
              >
                <ChevronLeft size={16} /> Anterior
              </button>

              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentPage ? 'bg-emerald-500 w-4' : 'bg-zinc-700 hover:bg-zinc-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-zinc-500">
                  {currentPage * IMAGES_PER_PAGE + 1}-{Math.min((currentPage + 1) * IMAGES_PER_PAGE, filteredImages.length)} de {filteredImages.length}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm"
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : images.length > 0 ? (
        // Nenhum resultado da busca
        <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <Search size={32} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-400 font-medium">Nenhuma imagem encontrada</p>
          <p className="text-zinc-600 text-sm mt-1">Tente outra busca ou limpe os filtros</p>
          <button 
            onClick={() => { setSearchQuery(''); setFilterSize('all'); }}
            className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="text-center py-12 lg:py-20 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-zinc-800 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Sparkles size={28} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium text-sm lg:text-base">Nenhuma imagem gerada ainda</p>
          <p className="text-zinc-600 text-xs lg:text-sm mt-1">Use o IA Gen para criar suas primeiras artes!</p>
          <Link href="/generator" className="inline-block mt-4">
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Ir para IA Gen
            </button>
          </Link>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && selectedImage.metadata.generated_image && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-zinc-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{selectedImage.metadata.prompt || 'Imagem IA Gen'}</h3>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {new Date(selectedImage.created_at).toLocaleDateString('pt-BR')} 
                  {selectedImage.metadata.size && ` • ${selectedImage.metadata.size}`}
                </p>
              </div>
              <button onClick={() => setSelectedImage(null)} className="text-zinc-400 hover:text-white p-2 shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Image */}
            <div className="p-4 lg:p-6 bg-white">
              <div className="relative w-full h-[45vh] lg:h-[50vh]">
                <Image
                  src={selectedImage.metadata.generated_image}
                  alt={selectedImage.metadata.prompt || 'IA Gen'}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  className="object-contain"
                  unoptimized
                  priority
                  onError={(e) => {
                    console.warn('[Image] Falha ao carregar IA Gen modal');
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 border-t border-zinc-800">
              <button
                onClick={() => handleQuickDownload(selectedImage, {} as React.MouseEvent)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} /> Baixar
              </button>
              <button
                onClick={() => handleDelete(selectedImage.id)}
                className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white py-2.5 px-4 rounded-lg transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
