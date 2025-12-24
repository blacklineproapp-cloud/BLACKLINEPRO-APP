/**
 * TESTE DE PROMPTS - PERFECT LINES
 * 
 * Copie e cole uma das versões abaixo no arquivo lib/gemini.ts
 * na linha 80 (substituindo PERFECT_LINES_INSTRUCTION atual)
 */

// ============================================
// VERSÃO 2: Mapa de Zonas Tonais
// Foco: Delimitar fronteiras entre tons
// ============================================
export const PERFECT_LINES_V2 = `ATUE COMO: Especialista em Mapeamento Tonal para Tatuagem Profissional.

OBJETIVO:
Criar um mapa de FRONTEIRAS TONAIS que delimite as diferentes zonas de luz e sombra da imagem.

CONCEITO - MAPA DE DIVISÕES TONAIS:
Trate a imagem como um território dividido em regiões de luminosidade diferente.
Trace linhas APENAS nas FRONTEIRAS onde uma zona encontra outra.

REGRAS ESTRITAS:

1. IDENTIFICAR ZONAS DE LUMINOSIDADE:
   - Analise a imagem e identifique 4-6 níveis de luminosidade:
     * Luz intensa (áreas muito claras)
     * Luz média (tons claros)
     * Tom médio (neutro)
     * Sombra média (tons escuros)
     * Sombra profunda (áreas muito escuras)
   - Cada zona deve ter área significativa (ignorar detalhes pequenos)

2. TRAÇAR APENAS FRONTEIRAS:
   - Trace UMA linha fina onde duas zonas se encontram
   - A linha deve seguir o CONTORNO da transição tonal
   - NÃO preencher áreas
   - NÃO usar hachuras
   - NÃO adicionar linhas dentro de uma mesma zona
   - Apenas DELIMITAR as fronteiras

3. LINHAS LIMPAS E PRECISAS:
   - Linhas finas e uniformes
   - Curvas suaves (sem serrilhado)
   - Continuidade nas bordas
   - Fechamento correto dos contornos

4. RESULTADO VISUAL:
   - Como dividir um território em regiões num mapa
   - Como separar peças de um quebra-cabeça
   - Funciona como guia para o tatuador saber onde começar e terminar cada tom
   - O tatuador vai preencher cada "área fechada" com a intensidade apropriada

5. ZERO PREENCHIMENTO:
   - Não use preto sólido
   - Não use gradientes
   - Apenas linhas de contorno delimitando zonas

PÚBLICO-ALVO:
Tatuadores profissionais que precisam de um guia claro de ONDE cada tom começa e termina.

SAÍDA:
Gere APENAS a imagem com linhas finas delimitando as zonas tonais. Sem texto.`;

// ============================================
// VERSÃO 3: Linhas Estruturais Limpas
// Foco: Contornos + transições importantes
// ============================================
export const PERFECT_LINES_V3 = `ATUE COMO: Especialista em Vetorização e Linework Profissional para Tatuagem.

OBJETIVO:
Criar um conjunto de LINHAS ESTRUTURAIS que capturem a essência da forma e suas principais transições tonais.

CONCEITO - ARQUITETURA DE LINHAS:
Identifique e preserve apenas as linhas ESSENCIAIS que definem a forma e suas mudanças tonais importantes.

REGRAS ESTRITAS:

1. CONTORNOS PRINCIPAIS (Prioridade 1):
   - Trace a silhueta/contorno externo da forma principal
   - Trace contornos de elementos importantes (olhos, nariz, boca, membros)
   - Use linhas LIMPAS e CONTÍNUAS
   - Esta é a "estrutura óssea" do desenho

2. TRANSIÇÕES TONAIS IMPORTANTES (Prioridade 2):
   - Identifique GRANDES mudanças de luz para sombra
   - Trace UMA linha onde há transição significativa de tom
   - Ignore transições sutis ou gradientes suaves
   - Foco em mudanças ABRUPTAS de luminosidade

3. DENSIDADE CONTROLADA:
   - Use MENOS linhas, não MAIS
   - Cada linha deve ter propósito estrutural
   - Menos é mais: preserve apenas o essencial
   - Evite poluição visual com excesso de linhas

4. QUALIDADE DAS LINHAS:
   - Linhas finas e uniformes (espessura consistente)
   - Curvas suaves e naturais
   - Sem serrilhado ou pixels visíveis
   - Conexões limpas entre linhas

5. LIMPEZA TOTAL:
   - ZERO preenchimento preto
   - ZERO hachuras ou pontilhismo
   - ZERO degradês ou sombreamento
   - Apenas linhas vetoriais limpas

6. PRESERVAR RECONHECIBILIDADE:
   - O desenho deve ser reconhecível mesmo sem preenchimento
   - Mantenha proporções e formas corretas
   - Não simplifique ao ponto de perder identidade
   - Balance simplicidade com clareza

RESULTADO ESPERADO:
Um "esqueleto" de linhas que mostra:
- ONDE está cada forma (contornos)
- ONDE mudam os tons (transições)
- Densidade baixa mas informação alta

PÚBLICO-ALVO:
Tatuadores que precisam de linhas limpas como base para trabalhar, independente do estilo final.

SAÍDA:
Gere APENAS a imagem com linhas estruturais limpas. Sem texto.`;
