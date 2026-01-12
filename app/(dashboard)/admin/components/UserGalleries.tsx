'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, RefreshCw, X, ZoomIn } from 'lucide-react';
import Image from 'next/image';

interface UserGalleriesProps {
  userId: string;
  userEmail: string;
}

interface GalleryImage {
  id: string;
  image_url: string;
  full_image_url?: string;
  is_thumbnail?: boolean;
  created_at: string;
  metadata?: any;
}

export default function UserGalleries({ userId, userEmail }: UserGalleriesProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'ia-gen'>('editor');
  const [editorImages, setEditorImages] = useState<GalleryImage[]>([]);
  const [iaGenImages, setIaGenImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showStencil, setShowStencil] = useState(true);

  // Fetch editor gallery
  const fetchEditorGallery = async () => {
    try {
      setLoading(true);
      console.log('[UserGalleries] Fetching editor for userId:', userId);
      const res = await fetch(`/api/admin/user-gallery?userId=${userId}&type=editor`);
      const data = await res.json();
      console.log('[UserGalleries] Editor response:', data);
      setEditorImages(data.images || []);
    } catch (error) {
      console.error('[UserGalleries] Error fetching editor gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch IA Gen gallery
  const fetchIAGenGallery = async () => {
    try {
      setLoading(true);
      console.log('[UserGalleries] Fetching IA Gen for userId:', userId);
      const res = await fetch(`/api/admin/user-gallery?userId=${userId}&type=ia-gen`);
      const data = await res.json();
      console.log('[UserGalleries] IA Gen response:', data);
      setIaGenImages(data.images || []);
    } catch (error) {
      console.error('[UserGalleries] Error fetching IA Gen gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load galleries on mount
  useEffect(() => {
    fetchEditorGallery();
    fetchIAGenGallery();
  }, [userId]);

  const currentImages = activeTab === 'editor' ? editorImages : iaGenImages;

  return (
    <div className="mt-6 border-t border-zinc-800 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <ImageIcon size={16} className="text-purple-400" />
          Galerias de Imagens - {userEmail}
        </h3>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'editor'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ImageIcon size={14} />
              Editor ({editorImages.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ia-gen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'ia-gen'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} />
              IA Gen ({iaGenImages.length})
            </span>
          </button>
        </div>
      </div>

      {/* Gallery Content */}
      <div className="bg-zinc-900/50 rounded-lg p-4 min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin text-purple-400" size={24} />
            <span className="ml-2 text-sm text-zinc-400">Carregando galeria...</span>
          </div>
        ) : currentImages.length > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {currentImages.slice(0, 12).map((img) => (
              <div
                key={img.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 cursor-pointer group"
                onClick={() => {
                  setSelectedImage(img);
                  setShowStencil(true); // Sempre começa mostrando stencil
                }}
              >
                <Image
                  src={img.image_url}
                  alt="Gallery image"
                  fill
                  className="object-cover transition-transform group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized={!img.is_thumbnail} // Não otimizar base64
                  priority={false}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={24} />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-[10px] text-zinc-300 truncate">
                    {new Date(img.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-500 text-sm">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nenhuma imagem encontrada</p>
          </div>
        )}

        {currentImages.length > 12 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-zinc-500">
              Mostrando 12 de {currentImages.length} imagens
            </p>
          </div>
        )}
      </div>

      {/* Modal Dashboard-Style */}
      {selectedImage && (
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
                <h3 className="text-white font-semibold truncate">
                  {selectedImage.metadata?.name || 'Imagem'}
                </h3>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {new Date(selectedImage.created_at).toLocaleDateString('pt-BR')}
                  {selectedImage.metadata?.width && ` • ${selectedImage.metadata.width}x${selectedImage.metadata.height}cm`}
                </p>
              </div>
              <button 
                onClick={() => setSelectedImage(null)} 
                className="text-zinc-400 hover:text-white p-2 shrink-0"
              >
                <X size={20} />
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
                  src={showStencil ? (selectedImage.full_image_url || selectedImage.image_url) : (selectedImage.metadata?.original_image || selectedImage.image_url)}
                  alt="Project image"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
