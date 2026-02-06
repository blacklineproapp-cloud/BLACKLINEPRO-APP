import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // Todos os locales suportados
  locales: ['pt', 'en', 'es', 'fr', 'it', 'ja'],

  // Locale padrão
  defaultLocale: 'pt',

  // Estratégia de prefixo: 'as-needed' = PT sem prefixo, outros com prefixo
  localePrefix: 'as-needed',

  // Detecção automática de locale baseada em Accept-Language
  localeDetection: true,
});

// Criar helpers de navegação tipados
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
