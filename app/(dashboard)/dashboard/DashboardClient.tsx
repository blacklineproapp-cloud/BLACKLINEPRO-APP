'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Clock, Upload, Zap, Printer, Crown, X, Download, Edit2, Trash2, Maximize2, Activity, TrendingUp, Infinity as InfinityIcon, Search, Filter, Loader2, Pencil, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { storage } from '@/lib/client-storage';

interface Project {
  id: string;
  name: string;
  original_image: string;
  stencil_image: string;
  thumbnail_url?: string; // 🆕 Thumbnail 300x300 para carregamento rápido
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [inlineEditName, setInlineEditName] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const PROJECTS_PER_PAGE = 12; // 4 colunas x 3 linhas (ou 2x6 no mobile)

  // Filtrar projetos baseado na busca e filtro
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStyle === 'all' || project.style === filterStyle;
    return matchesSearch && matchesFilter;
  });

  // Resetar página ao filtrar
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    currentPage * PROJECTS_PER_PAGE,
    (currentPage + 1) * PROJECTS_PER_PAGE
  );

  // Resetar para página 1 quando filtro/busca muda
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStyle]);

  // Estilos únicos para filtro
  const uniqueStyles = [...new Set(projects.map(p => p.style).filter(Boolean))];

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

  const handleEdit = async (project: Project) => {
    // Limpar cache do Generator para evitar conflito
    await storage.remove('generated_image');
    // Salvar projeto no storage (IndexedDB) e abrir editor
    await storage.set('edit_project', project);
    router.push(`/editor?edit=${project.id}`);
  };

  const handleDelete = async (projectId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    
    setIsDeleting(projectId);
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
    } finally {
      setIsDeleting(null);
    }
  };

  const handleQuickDownload = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    await handleDownload(project);
  };

  const handleQuickEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    handleEdit(project);
  };

  const startEditing = () => {
    if (selectedProject) {
      setEditName(selectedProject.name);
      setIsEditing(true);
    }
  };

  const handleRename = async () => {
    if (!selectedProject || !editName.trim()) return;
    if (editName.trim() === selectedProject.name) {
      setIsEditing(false);
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (res.ok) {
        // Atualizar o projeto selecionado localmente
        setSelectedProject({ ...selectedProject, name: editName.trim() });
        router.refresh();
      } else {
        alert('Erro ao renomear projeto');
      }
    } catch (error) {
      alert('Erro ao renomear projeto');
    } finally {
      setIsSavingName(false);
      setIsEditing(false);
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
            <span className="sm:hidden">Novo</span>
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
        {/* Header da Galeria com Busca e Filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h2 className="text-zinc-300 font-semibold flex items-center gap-2 text-sm">
            <Clock size={16} /> Galeria Recente
            {filteredProjects.length !== projects.length && (
              <span className="text-zinc-500 font-normal">
                ({filteredProjects.length} de {projects.length})
              </span>
            )}
          </h2>
          
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Busca */}
            <div className="relative flex-1 sm:flex-initial">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar projeto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            
            {/* Filtro por Estilo */}
            {uniqueStyles.length > 0 && (
              <div className="relative">
                <select
                  value={filterStyle}
                  onChange={(e) => setFilterStyle(e.target.value)}
                  className="appearance-none bg-zinc-900 border border-zinc-800 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos</option>
                  {uniqueStyles.map(style => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
                <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
        
        {filteredProjects && filteredProjects.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-6">
              {paginatedProjects.map((project) => (
                <div 
                  key={project.id} 
                  onClick={() => setSelectedProject(project)}
                  className="group bg-white rounded-xl overflow-hidden cursor-pointer relative hover:ring-2 hover:ring-emerald-500 transition-all shadow-lg"
                >
                  <div className="aspect-square bg-white p-3 lg:p-4 flex items-center justify-center relative">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div className="relative w-full h-full z-10 group-hover:scale-105 transition-transform duration-300">
                      <Image 
                        src={project.thumbnail_url || project.stencil_image || project.original_image} 
                        alt={project.name} 
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1200px) 22vw, 18vw"
                        loading="lazy"
                        unoptimized
                      />
                    </div>
                    
                    {/* Overlay com Quick Actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors z-20 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {/* Quick Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleQuickDownload(project, e)}
                          className="p-2.5 bg-white/90 hover:bg-white rounded-full text-zinc-800 hover:text-emerald-600 transition shadow-lg"
                          title="Baixar"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={(e) => handleQuickEdit(project, e)}
                          className="p-2.5 bg-white/90 hover:bg-white rounded-full text-zinc-800 hover:text-emerald-600 transition shadow-lg"
                          title="Editar no Editor"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(project.id, e)}
                          disabled={isDeleting === project.id}
                          className="p-2.5 bg-white/90 hover:bg-red-500 rounded-full text-zinc-800 hover:text-white transition shadow-lg disabled:opacity-50"
                          title="Excluir"
                        >
                          {isDeleting === project.id ? (
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
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={inlineEditName}
                          onChange={(e) => setInlineEditName(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (inlineEditName.trim() && inlineEditName !== project.name) {
                                try {
                                  const res = await fetch(`/api/projects/${project.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: inlineEditName.trim() }),
                                  });
                                  if (res.ok) router.refresh();
                                } catch {}
                              }
                              setEditingProjectId(null);
                            }
                            if (e.key === 'Escape') setEditingProjectId(null);
                          }}
                          onBlur={() => setEditingProjectId(null)}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none min-w-0"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 group/name">
                        <h3 className="text-zinc-200 font-medium text-xs lg:text-sm truncate flex-1">{project.name}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInlineEditName(project.name);
                            setEditingProjectId(project.id);
                          }}
                          className="p-0.5 text-zinc-600 hover:text-emerald-400 opacity-0 group-hover/name:opacity-100 transition shrink-0"
                          title="Renomear"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}
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
                    {currentPage * PROJECTS_PER_PAGE + 1}-{Math.min((currentPage + 1) * PROJECTS_PER_PAGE, filteredProjects.length)} de {filteredProjects.length}
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
        ) : projects.length > 0 ? (
          // Nenhum resultado da busca
          <div className="text-center py-12 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <Search size={32} className="mx-auto mb-3 text-zinc-600" />
            <p className="text-zinc-400 font-medium">Nenhum projeto encontrado</p>
            <p className="text-zinc-600 text-sm mt-1">Tente outra busca ou limpe os filtros</p>
            <button 
              onClick={() => { setSearchQuery(''); setFilterStyle('all'); }}
              className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
            >
              Limpar filtros
            </button>
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
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') setIsEditing(false);
                      }}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:border-emerald-500 focus:outline-none flex-1 min-w-0"
                      autoFocus
                      disabled={isSavingName}
                    />
                    <button
                      onClick={handleRename}
                      disabled={isSavingName}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white disabled:opacity-50"
                      title="Salvar"
                    >
                      {isSavingName ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSavingName}
                      className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white disabled:opacity-50"
                      title="Cancelar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold truncate">{selectedProject.name}</h3>
                    <button
                      onClick={startEditing}
                      className="p-1 text-zinc-500 hover:text-emerald-400 transition shrink-0"
                      title="Renomear projeto"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <p className="text-zinc-500 text-xs mt-0.5">
                  {new Date(selectedProject.created_at).toLocaleDateString('pt-BR')} 
                  {selectedProject.width_cm && ` • ${selectedProject.width_cm}x${selectedProject.height_cm}cm`}
                </p>
              </div>
              <button onClick={() => { setSelectedProject(null); setIsEditing(false); }} className="text-zinc-400 hover:text-white p-2 shrink-0">
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
                  src={showStencil ? selectedProject.stencil_image : selectedProject.original_image}
                  alt={selectedProject.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                  className="object-contain"
                  unoptimized
                  priority
                />
              </div>
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
