-- ============================================
-- Migration: Create admin_users table
-- Purpose: Substituir emails hardcoded por sistema de roles
-- Date: 2025-12-28
-- ============================================

-- Criar tabela de usuários admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'superadmin')),
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Criar índices para performance
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_expires_at ON admin_users(expires_at) WHERE expires_at IS NOT NULL;

-- Habilitar Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas admins podem ver a tabela de admins
CREATE POLICY "Admins can view admin_users"
  ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND (au.expires_at IS NULL OR au.expires_at > NOW())
    )
  );

-- Policy: Apenas superadmins podem inserir/atualizar/deletar
CREATE POLICY "Superadmins can manage admin_users"
  ON admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'superadmin'
      AND (au.expires_at IS NULL OR au.expires_at > NOW())
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER trigger_update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_users_updated_at();

-- ============================================
-- SEED: Adicionar admins iniciais
-- ============================================

-- Primeiro, precisamos encontrar os user_ids dos emails hardcoded
-- NOTA: Execute estes INSERTs manualmente após verificar os user_ids corretos

-- Exemplo (ajustar user_id conforme necessário):
-- INSERT INTO admin_users (user_id, role, notes)
-- VALUES
--   ((SELECT id FROM users WHERE email = 'erickrussomat@gmail.com' LIMIT 1), 'superadmin', 'Admin original - migrado de hardcode'),
--   ((SELECT id FROM users WHERE email = 'yurilojavirtual@gmail.com' LIMIT 1), 'superadmin', 'Admin original - migrado de hardcode')
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- Comentários
-- ============================================

COMMENT ON TABLE admin_users IS 'Tabela de usuários administradores com sistema de roles';
COMMENT ON COLUMN admin_users.role IS 'Tipo de admin: admin (acesso limitado) ou superadmin (acesso total)';
COMMENT ON COLUMN admin_users.granted_by IS 'ID do superadmin que concedeu a permissão';
COMMENT ON COLUMN admin_users.expires_at IS 'Data de expiração do acesso admin (NULL = permanente)';
COMMENT ON COLUMN admin_users.notes IS 'Notas sobre este admin (motivo, responsabilidades, etc)';
