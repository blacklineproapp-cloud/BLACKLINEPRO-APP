'use client';

import { Project } from '@/lib/supabase';
import { Trash2, Download } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function ProjectCard({ project }: { project: Project }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Tem certeza que deseja deletar este projeto?')) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert('Erro ao deletar projeto');
      }
    } catch (error) {
      alert('Erro ao deletar projeto');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const link = document.createElement('a');
    link.href = project.stencil_image;
    link.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}-stencil.png`;
    link.click();
  };

  return (
    <Link 
      href={`/editor?id=${project.id}`}
      className="group bg-white rounded-xl overflow-hidden cursor-pointer relative hover:ring-2 hover:ring-emerald-500 transition-all shadow-lg block"
    >
      {/* Preview */}
      <div className="aspect-square bg-white p-4 flex items-center justify-center relative">
        {/* Checkerboard pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <img 
          src={project.stencil_image || project.original_image} 
          alt={project.name} 
          className="max-w-full max-h-full object-contain relative z-10 drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
        />

        {/* Overlay com ações */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 z-20">
          <button
            onClick={handleDownload}
            className="bg-white text-black p-3 rounded-lg hover:bg-zinc-200 transition shadow-lg"
            title="Baixar"
          >
            <Download size={20} />
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition disabled:opacity-50 shadow-lg"
            title="Deletar"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-zinc-900 p-3 border-t border-zinc-800">
        <h3 className="text-zinc-200 font-medium text-sm truncate">{project.name}</h3>
        <div className="flex justify-between items-center mt-1">
          <p className="text-zinc-500 text-[10px] truncate">
            {new Date(project.created_at).toLocaleDateString('pt-BR')}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[10px]">
              {project.style === 'standard' ? 'Topo' : 'Linhas'}
            </span>
            {project.width_cm && (
              <span className="text-zinc-600 text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded">
                {project.width_cm}cm
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
