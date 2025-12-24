import { supabaseAdmin } from './supabase';

/**
 * SUPABASE STORAGE HELPER
 * Gerencia upload, download e deleção de imagens no Supabase Storage
 *
 * Bucket: 'project-images'
 * Estrutura: {userId}/{projectId}/{type}.png
 * Exemplo: a1b2c3d4/e5f6g7h8/original.png
 */

const BUCKET_NAME = 'project-images';

export interface UploadImageResult {
  publicUrl: string;
  path: string;
}

/**
 * Converte Base64 para Buffer
 */
function base64ToBuffer(base64: string): Buffer {
  // Remove data URL prefix se existir (data:image/png;base64,...)
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Faz upload de uma imagem para o Supabase Storage
 *
 * @param base64Image - Imagem em Base64
 * @param userId - ID do usuário (para organização)
 * @param projectId - ID do projeto
 * @param type - Tipo da imagem ('original' ou 'stencil')
 * @returns URL pública da imagem
 */
export async function uploadImage(
  base64Image: string,
  userId: string,
  projectId: string,
  type: 'original' | 'stencil'
): Promise<UploadImageResult> {
  try {
    // Converter Base64 para Buffer
    const buffer = base64ToBuffer(base64Image);

    // Definir caminho: userId/projectId/type.png
    const filePath = `${userId}/${projectId}/${type}.png`;

    // Upload para o Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true, // Substitui se já existir
      });

    if (error) {
      console.error('Erro no upload:', error);
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    // Obter URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      publicUrl: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Erro ao fazer upload de imagem:', error);
    throw error;
  }
}

/**
 * Deleta uma imagem do Storage
 *
 * @param filePath - Caminho completo do arquivo
 */
export async function deleteImage(filePath: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Erro ao deletar imagem:', error);
      throw new Error(`Erro ao deletar: ${error.message}`);
    }
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    throw error;
  }
}

/**
 * Deleta todas as imagens de um projeto
 *
 * @param userId - ID do usuário
 * @param projectId - ID do projeto
 */
export async function deleteProjectImages(
  userId: string,
  projectId: string
): Promise<void> {
  try {
    const folderPath = `${userId}/${projectId}`;

    // Listar arquivos na pasta do projeto
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(folderPath);

    if (listError) {
      console.error('Erro ao listar arquivos:', listError);
      throw new Error(`Erro ao listar: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      return; // Nada para deletar
    }

    // Deletar todos os arquivos
    const filePaths = files.map(file => `${folderPath}/${file.name}`);
    const { error: deleteError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) {
      console.error('Erro ao deletar arquivos:', deleteError);
      throw new Error(`Erro ao deletar: ${deleteError.message}`);
    }
  } catch (error) {
    console.error('Erro ao deletar imagens do projeto:', error);
    throw error;
  }
}

/**
 * Migra uma imagem de Base64 para Storage
 * Usado no script de migração
 *
 * @param base64Image - Imagem em Base64
 * @param userId - ID do usuário
 * @param projectId - ID do projeto
 * @param type - Tipo da imagem
 * @returns URL pública da imagem
 */
export async function migrateImageToStorage(
  base64Image: string,
  userId: string,
  projectId: string,
  type: 'original' | 'stencil'
): Promise<string> {
  const result = await uploadImage(base64Image, userId, projectId, type);
  return result.publicUrl;
}

/**
 * Verifica se o bucket existe, cria se necessário
 * IMPORTANTE: Executar isso uma vez no setup inicial
 */
export async function ensureBucketExists(): Promise<void> {
  try {
    // Verificar se bucket existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('Erro ao listar buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      // Criar bucket
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true, // Imagens são públicas
        fileSizeLimit: 10485760, // 10MB por arquivo
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      });

      if (createError) {
        console.error('Erro ao criar bucket:', createError);
        throw createError;
      }

      console.log('✅ Bucket criado com sucesso!');
    } else {
      console.log('✅ Bucket já existe!');
    }
  } catch (error) {
    console.error('Erro ao verificar/criar bucket:', error);
    throw error;
  }
}
