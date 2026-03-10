'use client';

import { ReactNode, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  searchValue?: string;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  searchPlaceholder,
  onSearch,
  searchValue,
  pagination,
  loading,
  emptyMessage = 'Nenhum resultado encontrado',
  emptyIcon,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');
  const search = searchValue ?? internalSearch;

  const handleSearch = (val: string) => {
    if (onSearch) {
      onSearch(val);
    } else {
      setInternalSearch(val);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Search bar */}
      {(searchPlaceholder || onSearch) && (
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg">
            <Search size={16} className="text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder={searchPlaceholder || 'Buscar...'}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm w-full text-zinc-300 placeholder:text-zinc-400"
            />
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16">
          {emptyIcon && <div className="mb-4 flex justify-center text-zinc-700">{emptyIcon}</div>}
          <p className="text-zinc-500 text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`p-4 font-medium whitespace-nowrap ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-zinc-800/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`p-4 ${col.className || ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm disabled:opacity-40 hover:bg-zinc-800 transition"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="text-xs text-zinc-500">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
            disabled={pagination.page === pagination.totalPages}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm disabled:opacity-40 hover:bg-zinc-800 transition"
          >
            Próxima <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
