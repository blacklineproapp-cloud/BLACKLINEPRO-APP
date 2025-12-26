import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

/**
 * Helpers para download de tiles (ZIP e PDF)
 * Client-side processing para não sobrecarregar API
 */

export interface TileData {
  image: string;        // Base64
  pageNumber: number;   // 1, 2, 3...
  row: number;          // 0, 1, 2...
  col: number;          // 0, 1, 2...
}

/**
 * Gera ZIP com todos os tiles
 *
 * @param tiles - Array de tiles com imagens base64
 * @param filename - Nome base do arquivo (sem extensão)
 * @returns Blob do ZIP
 */
export async function generateZipFromTiles(
  tiles: TileData[],
  filename: string = 'stencil-a4'
): Promise<Blob> {
  const zip = new JSZip();

  // Adicionar cada tile ao ZIP
  for (const tile of tiles) {
    // Nome do arquivo: stencil-a4-page-01.png
    const tileName = `${filename}-page-${String(tile.pageNumber).padStart(2, '0')}.png`;

    // Remover prefixo data:image/png;base64,
    const base64Data = tile.image.replace(/^data:image\/\w+;base64,/, '');

    // Adicionar ao ZIP
    zip.file(tileName, base64Data, { base64: true });
  }

  // Adicionar README.txt com instruções
  const readme = `
StencilFlow - Divisão em A4
============================

Este arquivo contém ${tiles.length} página(s) A4 para montagem.

INSTRUÇÕES DE MONTAGEM:
1. Imprima todas as páginas em papel A4
2. Corte as margens seguindo as linhas de corte
3. Monte as páginas na ordem numérica
4. Cole as sobreposições para alinhamento perfeito

Gerado em: ${new Date().toLocaleString('pt-BR')}
www.stencilflow.com.br
  `.trim();

  zip.file('LEIA-ME.txt', readme);

  // Gerar ZIP
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return zipBlob;
}

/**
 * Baixa ZIP com todos os tiles
 *
 * @param tiles - Array de tiles
 * @param filename - Nome do arquivo
 */
export async function downloadZip(
  tiles: TileData[],
  filename: string = 'stencil-a4'
): Promise<void> {
  try {
    const zipBlob = await generateZipFromTiles(tiles, filename);

    // Criar URL e fazer download
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar ZIP:', error);
    throw new Error('Erro ao gerar arquivo ZIP');
  }
}

/**
 * Gera PDF multi-página com todos os tiles
 *
 * @param tiles - Array de tiles
 * @param filename - Nome do arquivo
 * @param paperFormat - Formato do papel ('a4', 'a3', 'letter')
 * @param orientation - Orientação ('portrait' ou 'landscape')
 */
export async function generatePdfFromTiles(
  tiles: TileData[],
  filename: string = 'stencil-a4',
  paperFormat: 'a4' | 'a3' | 'letter' = 'a4',
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<Blob> {
  // Criar PDF
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: paperFormat
  });

  // Dimensões do papel em mm
  const paperSizes = {
    a4: { width: 210, height: 297 },
    a3: { width: 297, height: 420 },
    letter: { width: 215.9, height: 279.4 }
  };

  let pageWidth = paperSizes[paperFormat].width;
  let pageHeight = paperSizes[paperFormat].height;

  // Inverter se landscape
  if (orientation === 'landscape') {
    [pageWidth, pageHeight] = [pageHeight, pageWidth];
  }

  // Margem de 5mm
  const margin = 5;
  const imageWidth = pageWidth - (margin * 2);
  const imageHeight = pageHeight - (margin * 2);

  // Adicionar cada tile como uma página
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];

    // Adicionar nova página (exceto primeira)
    if (i > 0) {
      pdf.addPage();
    }

    // Adicionar imagem centralizada
    pdf.addImage(
      tile.image,
      'PNG',
      margin,
      margin,
      imageWidth,
      imageHeight,
      undefined,
      'FAST' // Compressão rápida
    );

    // Adicionar número da página (canto superior direito)
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Página ${tile.pageNumber} de ${tiles.length}`,
      pageWidth - margin - 40,
      margin + 5
    );

    // Adicionar marcas de corte (cantos)
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);

    const markLength = 3; // 3mm

    // Canto superior esquerdo
    pdf.line(margin - markLength, margin, margin + markLength, margin);
    pdf.line(margin, margin - markLength, margin, margin + markLength);

    // Canto superior direito
    pdf.line(pageWidth - margin - markLength, margin, pageWidth - margin + markLength, margin);
    pdf.line(pageWidth - margin, margin - markLength, pageWidth - margin, margin + markLength);

    // Canto inferior esquerdo
    pdf.line(margin - markLength, pageHeight - margin, margin + markLength, pageHeight - margin);
    pdf.line(margin, pageHeight - margin - markLength, margin, pageHeight - margin + markLength);

    // Canto inferior direito
    pdf.line(pageWidth - margin - markLength, pageHeight - margin, pageWidth - margin + markLength, pageHeight - margin);
    pdf.line(pageWidth - margin, pageHeight - margin - markLength, pageWidth - margin, pageHeight - margin + markLength);
  }

  // Adicionar metadados
  pdf.setProperties({
    title: `${filename} - StencilFlow`,
    subject: 'Divisão em A4 para tatuagem',
    author: 'StencilFlow',
    keywords: 'stencil, tattoo, a4',
    creator: 'www.stencilflow.com.br'
  });

  // Retornar como Blob
  const pdfBlob = pdf.output('blob');
  return pdfBlob;
}

/**
 * Baixa PDF com todos os tiles
 *
 * @param tiles - Array de tiles
 * @param filename - Nome do arquivo
 * @param paperFormat - Formato do papel
 * @param orientation - Orientação
 */
export async function downloadPdf(
  tiles: TileData[],
  filename: string = 'stencil-a4',
  paperFormat: 'a4' | 'a3' | 'letter' = 'a4',
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  try {
    const pdfBlob = await generatePdfFromTiles(tiles, filename, paperFormat, orientation);

    // Criar URL e fazer download
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Erro ao gerar arquivo PDF');
  }
}

/**
 * Baixa tile individual
 *
 * @param tile - Tile para download
 * @param filename - Nome do arquivo
 */
export function downloadSingleTile(
  tile: TileData,
  filename: string = 'stencil-a4'
): void {
  const tileName = `${filename}-page-${String(tile.pageNumber).padStart(2, '0')}.png`;

  try {
    const link = document.createElement('a');
    link.href = tile.image;
    link.download = tileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Erro ao baixar tile:', error);
    throw new Error('Erro ao baixar página');
  }
}
