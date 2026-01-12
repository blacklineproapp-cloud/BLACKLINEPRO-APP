-- Criar tabela tattoo_inks no Supabase
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS tattoo_inks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  hex VARCHAR(7) NOT NULL CHECK (hex ~ '^#[0-9A-Fa-f]{6}$'),
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint única para evitar duplicatas
  UNIQUE(brand, name)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_tattoo_inks_brand ON tattoo_inks(brand);
CREATE INDEX IF NOT EXISTS idx_tattoo_inks_category ON tattoo_inks(category);
CREATE INDEX IF NOT EXISTS idx_tattoo_inks_hex ON tattoo_inks(hex);

-- Comentários
COMMENT ON TABLE tattoo_inks IS 'Catálogo de cores de tintas de tatuagem';
COMMENT ON COLUMN tattoo_inks.brand IS 'Marca da tinta';
COMMENT ON COLUMN tattoo_inks.name IS 'Nome da cor';
COMMENT ON COLUMN tattoo_inks.hex IS 'Código hexadecimal (#RRGGBB)';
COMMENT ON COLUMN tattoo_inks.category IS 'Categoria da cor';
