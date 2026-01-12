-- Tabela para armazenar cores de tintas de tatuagem
CREATE TABLE IF NOT EXISTS tattoo_inks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  hex VARCHAR(7) NOT NULL CHECK (hex ~ '^#[0-9A-Fa-f]{6}$'),
  category VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraint única para evitar duplicatas
  UNIQUE(brand, name)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_tattoo_inks_brand ON tattoo_inks(brand);
CREATE INDEX IF NOT EXISTS idx_tattoo_inks_category ON tattoo_inks(category);
CREATE INDEX IF NOT EXISTS idx_tattoo_inks_hex ON tattoo_inks(hex);
CREATE INDEX IF NOT EXISTS idx_tattoo_inks_name ON tattoo_inks USING gin(to_tsvector('portuguese', name));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_tattoo_inks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tattoo_inks_updated_at
  BEFORE UPDATE ON tattoo_inks
  FOR EACH ROW
  EXECUTE FUNCTION update_tattoo_inks_updated_at();

-- Comentários
COMMENT ON TABLE tattoo_inks IS 'Catálogo de cores de tintas de tatuagem de diversas marcas';
COMMENT ON COLUMN tattoo_inks.brand IS 'Marca da tinta (Intenze, Eternal Ink, etc)';
COMMENT ON COLUMN tattoo_inks.name IS 'Nome da cor';
COMMENT ON COLUMN tattoo_inks.hex IS 'Código hexadecimal da cor (#RRGGBB)';
COMMENT ON COLUMN tattoo_inks.category IS 'Categoria da cor (preto, vermelho, azul, etc)';
