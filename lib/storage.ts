import { supabaseAdmin } from './supabase';
import { logger } from './logger';
import sharp from 'sharp';

/**
 * SUPABASE STORAGE HELPER
 * Gerencia upload, download e deleção de imagens no Supabase Storage
 *
 * Bucket: 'project-images'
 * Estrutura: {userId}/{projectId}/{type}.png
 * Exemplo: a1b2c3d4/e5f6g7h8/original.png
 */

const BUCKET_NAME = 'project-images';
const THUMBNAIL_SIZE = 300; // 300x300px para thumbnails

export interface UploadImageResult {
  publicUrl: string;
  path: string;
}

export interface UploadImageWithThumbResult extends UploadImageResult {
  thumbnailUrl: string;
  thumbnailPath: string;
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

    // 🔥 VALIDAÇÃO: Garantir que o buffer não está vazio
    if (!buffer || buffer.length === 0) {
      throw new Error('Imagem vazia ou inválida após conversão base64');
    }

    // 🔥 VALIDAÇÃO: Garantir que é uma imagem válida usando Sharp
    let processedBuffer: Buffer;
    try {
      // Processar com Sharp para garantir que é PNG válido
      processedBuffer = await sharp(buffer)
        .png()
        .toBuffer();
      
      if (processedBuffer.length === 0) {
        throw new Error('Buffer processado está vazio');
      }
    } catch (sharpError: any) {
      logger.error('[Storage] Erro ao processar imagem com Sharp', sharpError);
      throw new Error(`Imagem inválida ou corrompida: ${sharpError.message}`);
    }

    // Definir caminho: userId/projectId/type.png
    const filePath = `${userId}/${projectId}/${type}.png`;

    // Upload para o Storage com buffer processado
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, processedBuffer, {
        contentType: 'image/png',
        upsert: true, // Substitui se já existir
      });

    if (error) {
      logger.error('[Storage] Erro no upload', error);
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    // Obter URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    logger.info('[Storage] Upload sucesso', { type, sizeBytes: processedBuffer.length });

    return {
      publicUrl: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    logger.error('[Storage] Erro ao fazer upload de imagem', error);
    throw error;
  }
}

/**
 * Faz upload de uma imagem + gera thumbnail 300x300 WebP
 * Ideal para o Dashboard (carregamento rápido no mobile)
 *
 * @param base64Image - Imagem em Base64
 * @param userId - ID do usuário
 * @param projectId - ID do projeto
 * @param type - Tipo da imagem ('original' ou 'stencil')
 * @returns URL pública da imagem + URL do thumbnail
 */
export async function uploadImageWithThumbnail(
  base64Image: string,
  userId: string,
  projectId: string,
  type: 'original' | 'stencil'
): Promise<UploadImageWithThumbResult> {
  try {
    // Converter Base64 para Buffer
    const buffer = base64ToBuffer(base64Image);

    // 🔥 VALIDAÇÃO: Garantir que o buffer não está vazio
    if (!buffer || buffer.length === 0) {
      throw new Error('Imagem vazia ou inválida após conversão base64');
    }

    // 🔥 PROCESSAR: Garantir que é PNG válido
    let fullBuffer: Buffer;
    let thumbnailBuffer: Buffer;
    
    try {
      // Processar imagem full em PNG
      fullBuffer = await sharp(buffer)
        .png()
        .toBuffer();

      if (fullBuffer.length === 0) {
        throw new Error('Buffer full processado está vazio');
      }

      // Gerar thumbnail 300x300 em WebP (muito menor que PNG)
      thumbnailBuffer = await sharp(buffer)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .webp({ quality: 80 })
        .toBuffer();

      if (thumbnailBuffer.length === 0) {
        throw new Error('Buffer thumbnail está vazio');
      }
    } catch (sharpError: any) {
      logger.error('[Storage] Erro ao processar imagem com Sharp', sharpError);
      throw new Error(`Imagem inválida ou corrompida: ${sharpError.message}`);
    }

    // Caminhos
    const filePath = `${userId}/${projectId}/${type}.png`;
    const thumbPath = `${userId}/${projectId}/${type}_thumb.webp`;

    // Upload da imagem full
    const { error: fullError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, fullBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (fullError) {
      logger.error('[Storage] Erro no upload full', fullError);
      throw new Error(`Erro ao fazer upload: ${fullError.message}`);
    }

    // Upload do thumbnail
    const { error: thumbError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(thumbPath, thumbnailBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (thumbError) {
      logger.error('[Storage] Erro no upload thumbnail', thumbError);
      // Não falha se thumbnail der erro, continua
    }

    // Obter URLs públicas
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const { data: thumbUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(thumbPath);

    logger.info('[Storage] Upload com thumb', { type, fullSizeBytes: fullBuffer.length, thumbSizeBytes: thumbnailBuffer.length });

    return {
      publicUrl: publicUrlData.publicUrl,
      path: filePath,
      thumbnailUrl: thumbUrlData.publicUrl,
      thumbnailPath: thumbPath,
    };
  } catch (error) {
    logger.error('[Storage] Erro ao fazer upload com thumbnail', error);
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
      logger.error('[Storage] Erro ao deletar imagem', error);
      throw new Error(`Erro ao deletar: ${error.message}`);
    }
  } catch (error) {
    logger.error('[Storage] Erro ao deletar imagem', error);
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
      logger.error('[Storage] Erro ao listar arquivos', listError);
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
      logger.error('[Storage] Erro ao deletar arquivos', deleteError);
      throw new Error(`Erro ao deletar: ${deleteError.message}`);
    }
  } catch (error) {
    logger.error('[Storage] Erro ao deletar imagens do projeto', error);
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
      logger.error('[Storage] Erro ao listar buckets', listError);
      throw listError;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    const bucketOptions = {
      public: true, // Imagens são públicas
      fileSizeLimit: 52428800, // 50MB por arquivo (aumentado para suportar imagens refinadas)
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    };

    if (!bucketExists) {
      // Criar bucket
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, bucketOptions);

      if (createError) {
        logger.error('[Storage] Erro ao criar bucket', createError);
        throw createError;
      }

      logger.info('[Storage] Bucket criado com sucesso');
    } else {
      // Atualizar bucket existente para garantir que o limite de tamanho está correto
      const { error: updateError } = await supabaseAdmin.storage.updateBucket(BUCKET_NAME, bucketOptions);
      
      if (updateError) {
        logger.warn('[Storage] Aviso ao atualizar bucket (pode ser ignorado se não for crítico)', { error: updateError });
      } else {
        logger.info('[Storage] Configuração do bucket atualizada (limite 50MB)');
      }
      
      logger.info('[Storage] Bucket já existe');
    }
  } catch (error) {
    logger.error('[Storage] Erro ao verificar/criar bucket', error);
    throw error;
  }
}
