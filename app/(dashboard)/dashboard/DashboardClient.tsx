'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Clock, Upload, Zap, Printer, Crown, X, Download, Edit2, Trash2, Maximize2, Activity, TrendingUp, Infinity as InfinityIcon } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  original_image: string;
  stencil_image: string;
  style: string;
  width_cm: number;
  height_cm: number;
  created_at: string;
}

interface DashboardClientProps {
  projects: Project[];
  isSubscribed: boolean;
  currentUsage: number;
  monthlyLimit: number | null;
  userPlan: string;
}

export default function DashboardClient({ projects, isSubscribed, currentUsage, monthlyLimit, userPlan }: DashboardClientProps) {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showStencil, setShowStencil] = useState(true);

  const handleDownload = async (project: Project) => {
    const imageToDownload = showStencil ? project.stencil_image : project.original_image;
    const fileName = `${project.name}-${showStencil ? 'stencil' : 'original'}.png`;
    
    try {
      // Converter base64/URL para blob para forçar download
      const response = await fetch(imageToDownload);
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
      link.href = imageToDownload;
      link.download = fileName;
      link.click();
    }
  };

  const handleEdit = (project: Project) => {
    // Salvar no sessionStorage e abrir editor
    sessionStorage.setItem('stencilflow_edit_project', JSON.stringify(project));
    router.push(`/editor?edit=${project.id}`);
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
        setSelectedProject(null);
      } else {
        alert('Erro ao excluir');
      }
    } catch (error) {
      alert('Erro ao excluir');
    }
  };

  // Calcular porcentagem de uso
  const usagePercentage = monthlyLimit ? Math.min((currentUsage / monthlyLimit) * 100, 100) : 0;
  const isUnlimited = monthlyLimit === null;

  // Determinar estilo baseado no uso
  const isLowUsage = usagePercentage < 50;
  const isMediumUsage = usagePercentage >= 50 && usagePercentage < 80;
  const isHighUsage = usagePercentage >= 80;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Contador de Uso */}
      <div className="mb-6 lg:mb-8 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4 lg:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center shrink-0 ${
              isUnlimited || isLowUsage
                ? 'bg-emerald-600/10 border border-emerald-600/20'
                : isMediumUsage
                ? 'bg-yellow-600/10 border border-yellow-600/20'
                : 'bg-red-600/10 border border-red-600/20'
            }`}>
              {isUnlimited ? (
                <InfinityIcon size={20} className="text-emerald-500" />
              ) : (
                <Activity size={20} className={
                  isLowUsage ? 'text-emerald-500' : isMediumUsage ? 'text-yellow-500' : 'text-red-500'
                } />
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm lg:text-base">Uso Mensal</h3>
              <p className="text-zinc-400 text-xs lg:text-sm">
                {isUnlimited ? (
                  <>
                    <span className="text-emerald-400 font-bold">{currentUsage} gerações</span> este mês (Ilimitado)
                  </>
                ) : (
                  <>
                    <span className={`font-bold ${
                      isLowUsage ? 'text-emerald-400' : isMediumUsage ? 'text-yellow-400' : 'text-red-400'
                    }`}>{currentUsage}</span> de{' '}
                    <span className="text-white font-bold">{monthlyLimit}</span> gerações usadas
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Plano</div>
            <div className="text-sm font-bold text-white capitalize">{userPlan}</div>
          </div>
        </div>

        {/* Barra de Progresso */}
        {!isUnlimited && (
          <div className="space-y-2">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isLowUsage
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                    : isMediumUsage
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-500'
                    : 'bg-gradient-to-r from-red-600 to-red-500'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
              <span className="text-zinc-500">
                Reseta em {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
              </span>
              {isHighUsage && (
                <a href="/pricing" className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
                  <TrendingUp size={12} /> Fazer Upgrade
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Banner de Assinatura */}
      {!isSubscribed && (
        <div className="mb-6 lg:mb-8 bg-gradient-to-r from-emerald-900/30 to-purple-900/30 border border-emerald-500/30 rounded-xl p-4 lg:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <Crown size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm lg:text-base">Desbloqueie Todo Potencial</h3>
              <p className="text-zinc-400 text-xs lg:text-sm">Gere estênceis ilimitados por R$ 50/mês</p>
            </div>
          </div>
          <a href="/pricing" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 lg:px-6 py-2 rounded-lg font-medium text-sm transition shrink-0">
            Ver Planos
          </a>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 lg:mb-10">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">Meus Projetos</h1>
          <p className="text-zinc-400 text-sm lg:text-base">Gerencie seus decalques</p>
        </div>
        <Link href="/editor">
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 lg:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm lg:text-base">
            <Plus size={18} />
            <span className="hidden sm:inline">Novo Decalque</span>
          </button>
        </Link>
      </div>

      {/* Workflow Section */}
      <div className="mb-8 lg:mb-12">
        <h2 className="text-zinc-300 font-semibold mb-4 lg:mb-6 text-xs lg:text-sm uppercase tracking-wider">Fluxo de Trabalho</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-4 lg:p-6 rounded-xl flex flex-col gap-3 lg:gap-4 hover:border-zinc-700 transition-colors">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-zinc-200 font-medium mb-1 text-sm lg:text-base">1. Carregue a Imagem</h3>
              <p className="text-zinc-500 text-xs lg:text-sm">Upload de foto, desenho ou referência.</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 lg:p-6 rounded-xl flex flex-col gap-3 lg:gap-4 hover:border-emerald-500/30 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Zap size={48} />
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-900/20 rounded-lg flex items-center justify-center text-emerald-500">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-white font-medium mb-1 text-sm lg:text-base">2. IA Alta Fidelidade</h3>
              <p className="text-zinc-500 text-xs lg:text-sm">Nossa IA captura 100% dos detalhes.</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 lg:p-6 rounded-xl flex flex-col gap-3 lg:gap-4 hover:border-zinc-700 transition-colors">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="text-zinc-200 font-medium mb-1 text-sm lg:text-base">3. Baixe e Imprima</h3>
              <p className="text-zinc-500 text-xs lg:text-sm">Pronto para impressão térmica.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Galeria */}
      <div>
        <h2 className="text-zinc-300 font-semibold mb-4 flex items-center gap-2 text-sm">
          <Clock size={16} /> Galeria Recente
        </h2>
        
        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
            {projects.map((project) => (
              <div 
                key={project.id} 
                onClick={() => setSelectedProject(project)}
                className="group bg-white rounded-xl overflow-hidden cursor-pointer relative hover:ring-2 hover:ring-emerald-500 transition-all shadow-lg"
              >
                <div className="aspect-square bg-white p-3 lg:p-4 flex items-center justify-center relative">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="relative w-full h-full z-10 group-hover:scale-105 transition-transform duration-300">
                    <Image 
                      src={project.stencil_image || project.original_image} 
                      alt={project.name} 
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors z-20 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Maximize2 size={24} className="text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="bg-zinc-900 p-2 lg:p-3 border-t border-zinc-800">
                  <h3 className="text-zinc-200 font-medium text-xs lg:text-sm truncate">{project.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-zinc-500 text-[10px] lg:text-xs">
                      {new Date(project.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    {project.width_cm && (
                      <span className="text-zinc-600 text-[10px] lg:text-xs">{project.width_cm}x{project.height_cm}cm</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 lg:py-20 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-zinc-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Clock size={28} className="text-zinc-600" />
            </div>
            <p className="text-zinc-400 font-medium text-sm lg:text-base">Nenhum projeto ainda</p>
            <p className="text-zinc-600 text-xs lg:text-sm mt-1">Crie seu primeiro estêncil!</p>
            <Link href="/editor" className="inline-block mt-4">
              <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                Criar Agora
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedProject && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProject(null)}
        >
          <div 
            className="bg-zinc-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div>
                <h3 className="text-white font-semibold">{selectedProject.name}</h3>
                <p className="text-zinc-500 text-xs">
                  {new Date(selectedProject.created_at).toLocaleDateString('pt-BR')} 
                  {selectedProject.width_cm && ` • ${selectedProject.width_cm}x${selectedProject.height_cm}cm`}
                </p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-zinc-400 hover:text-white p-2">
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
            <div className="p-4 lg:p-6 flex items-center justify-center bg-white min-h-[300px] max-h-[50vh]">
              <img 
                src={showStencil ? selectedProject.stencil_image : selectedProject.original_image} 
                alt={selectedProject.name}
                className="max-w-full max-h-[45vh] object-contain"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 border-t border-zinc-800">
              <button
                onClick={() => handleDownload(selectedProject)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} /> Baixar
              </button>
              <button
                onClick={() => handleEdit(selectedProject)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 text-sm"
              >
                <Edit2 size={16} /> Editar
              </button>
              <button
                onClick={() => handleDelete(selectedProject.id)}
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
