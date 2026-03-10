'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Max width class (default: max-w-lg) */
  maxWidth?: string;
  /** Prevent closing on ESC / backdrop click (e.g. during async ops) */
  preventClose?: boolean;
  /** z-index class (default: z-50) */
  zIndex?: string;
  /** Custom aria-labelledby id */
  labelledBy?: string;
}

/**
 * Base modal wrapper with consistent behavior:
 * - Backdrop blur + click-outside-to-close
 * - ESC key to close
 * - Body scroll lock
 * - Focus trap (auto-focus first focusable element)
 * - ARIA dialog attributes
 * - Entrance animation
 */
export default function ModalWrapper({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  preventClose = false,
  zIndex = 'z-50',
  labelledBy = 'modal-title',
}: ModalWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus first focusable element on open
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;
    const focusable = contentRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClose) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, preventClose, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventClose) onClose();
  };

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        ref={contentRef}
        className={`relative w-full ${maxWidth} bg-zinc-900 border border-zinc-800 rounded-2xl shadow-modal animate-zoom-in overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
