/**
 * Body Areas Configuration for Smart A4 Division
 *
 * Standard anthropometric measurements for tattoo sizing.
 * Measurements are in centimeters and represent average adult dimensions.
 */

export interface BodyArea {
  label: string;
  width: number | null;  // cm (null for custom)
  height: number | null; // cm (null for custom)
  description: string;
  category: BodyAreaCategory;
  emoji: string;
}

export type BodyAreaCategory = 'bracos' | 'pernas' | 'tronco' | 'outros' | 'personalizado';

export const BODY_AREA_CATEGORIES: Record<BodyAreaCategory, { label: string; emoji: string }> = {
  bracos: { label: 'Braços', emoji: '💪' },
  pernas: { label: 'Pernas', emoji: '🦵' },
  tronco: { label: 'Tronco', emoji: '🫁' },
  outros: { label: 'Outros', emoji: '✋' },
  personalizado: { label: 'Personalizado', emoji: '✏️' },
};

export type BodyAreaKey =
  // Braços
  | 'braco_fechado'
  | 'braco_superior'
  | 'antebraco'
  // Pernas
  | 'perna_completa'
  | 'coxa'
  | 'panturrilha'
  // Tronco
  | 'costas_completas'
  | 'peito'
  | 'costela'
  | 'barriga'
  // Outros
  | 'mao'
  | 'pe'
  | 'pescoco'
  // Personalizado
  | 'personalizado';

export const BODY_AREAS: Record<BodyAreaKey, BodyArea> = {
  // BRAÇOS
  braco_fechado: {
    label: 'Braço Fechado (Sleeve)',
    width: 35,   // circunferência média
    height: 60,  // ombro ao punho
    description: 'Cobre todo o braço, do ombro ao punho',
    category: 'bracos',
    emoji: '💪',
  },
  braco_superior: {
    label: 'Braço Superior',
    width: 32,
    height: 25,
    description: 'Região do bíceps e tríceps',
    category: 'bracos',
    emoji: '💪',
  },
  antebraco: {
    label: 'Antebraço',
    width: 25,
    height: 25,
    description: 'Do cotovelo ao punho',
    category: 'bracos',
    emoji: '💪',
  },

  // PERNAS
  perna_completa: {
    label: 'Perna Completa',
    width: 45,
    height: 100,
    description: 'Da coxa até o tornozelo',
    category: 'pernas',
    emoji: '🦵',
  },
  coxa: {
    label: 'Coxa',
    width: 45,
    height: 45,
    description: 'Região da coxa',
    category: 'pernas',
    emoji: '🦵',
  },
  panturrilha: {
    label: 'Panturrilha',
    width: 35,
    height: 35,
    description: 'Região da batata da perna',
    category: 'pernas',
    emoji: '🦵',
  },

  // TRONCO
  costas_completas: {
    label: 'Costas Completas',
    width: 45,
    height: 60,
    description: 'Toda a região das costas',
    category: 'tronco',
    emoji: '🫁',
  },
  peito: {
    label: 'Peito',
    width: 40,
    height: 30,
    description: 'Região peitoral',
    category: 'tronco',
    emoji: '🫁',
  },
  costela: {
    label: 'Costela/Lateral',
    width: 25,
    height: 35,
    description: 'Lateral do tronco',
    category: 'tronco',
    emoji: '🫁',
  },
  barriga: {
    label: 'Barriga/Abdômen',
    width: 35,
    height: 30,
    description: 'Região abdominal',
    category: 'tronco',
    emoji: '🫁',
  },

  // OUTROS
  mao: {
    label: 'Mão',
    width: 10,
    height: 18,
    description: 'Dorso da mão',
    category: 'outros',
    emoji: '✋',
  },
  pe: {
    label: 'Pé',
    width: 10,
    height: 25,
    description: 'Dorso do pé',
    category: 'outros',
    emoji: '🦶',
  },
  pescoco: {
    label: 'Pescoço',
    width: 35,
    height: 15,
    description: 'Região do pescoço',
    category: 'outros',
    emoji: '🔴',
  },

  // PERSONALIZADO
  personalizado: {
    label: 'Tamanho Personalizado',
    width: null,
    height: null,
    description: 'Defina suas próprias medidas',
    category: 'personalizado',
    emoji: '✏️',
  },
};

/**
 * Get body areas grouped by category for dropdown display
 */
export function getBodyAreasByCategory(): Record<BodyAreaCategory, Array<{ key: BodyAreaKey; area: BodyArea }>> {
  const grouped: Record<BodyAreaCategory, Array<{ key: BodyAreaKey; area: BodyArea }>> = {
    bracos: [],
    pernas: [],
    tronco: [],
    outros: [],
    personalizado: [],
  };

  (Object.entries(BODY_AREAS) as [BodyAreaKey, BodyArea][]).forEach(([key, area]) => {
    grouped[area.category].push({ key, area });
  });

  return grouped;
}

/**
 * Get suggested A4 grid configuration based on body area dimensions
 */
export function getSuggestedGridForArea(
  areaKey: BodyAreaKey,
  paperWidth: number = 21, // A4 default
  paperHeight: number = 29.7
): { cols: number; rows: number; totalPages: number } {
  const area = BODY_AREAS[areaKey];

  if (!area.width || !area.height) {
    return { cols: 1, rows: 1, totalPages: 1 };
  }

  // Calculate how many pages needed
  const cols = Math.ceil(area.width / paperWidth);
  const rows = Math.ceil(area.height / paperHeight);

  return {
    cols,
    rows,
    totalPages: cols * rows,
  };
}

/**
 * Format area dimensions for display
 */
export function formatAreaDimensions(area: BodyArea): string {
  if (!area.width || !area.height) {
    return 'Personalizado';
  }
  return `${area.width} × ${area.height} cm`;
}
