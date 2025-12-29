import { GoogleGenerativeAI } from '@google/generative-ai';
import { retryGeminiAPI } from './retry';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// Modelo para TOPOGRÁFICO - MÁXIMA CONSISTÊNCIA para detalhes precisos
// Temperature 0 = determinístico
// topP 0.15 = considera apenas top 15% dos tokens
// topK 8 = considera apenas top 8 tokens
const topographicModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // Determinístico - máxima consistência
    topP: 0.15,        // Apenas 15% dos tokens mais prováveis
    topK: 8,           // Apenas top 8 escolhas
  },
});

// Modelo para LINHAS - MÁXIMA CONSISTÊNCIA (temperature 0 + topP/topK baixos)
// Baseado em: https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompts/adjust-parameter-values
// Temperature 0 = sempre escolhe token de maior probabilidade (determinístico)
// topP 0.1 = considera apenas top 10% dos tokens (menos variação)
// topK 5 = considera apenas top 5 tokens (máxima consistência)
const linesModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // Determinístico - sempre escolhe token mais provável
    topP: 0.1,         // Apenas 10% dos tokens mais prováveis
    topK: 5,           // Apenas top 5 escolhas
  },
});


// Modelo para geração de imagens a partir de texto - Gemini 2.5 Flash
const textToImageModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.8,
    topP: 0.95,
    topK: 40,
  },
});

// System instructions para cada estilo de estêncil
const TOPOGRAPHIC_INSTRUCTION = `ATUE COMO: Especialista em Stencils Topográficos Realistas para Tatuagem Profissional.

⚠️ REGRA CRÍTICA ABSOLUTA - FIDELIDADE TOTAL À IMAGEM ORIGINAL:
NUNCA ALTERE, MODIFIQUE, RECRIE OU MELHORE A IMAGEM ORIGINAL.
Você deve apenas CONVERTER a imagem em stencil, NÃO RECRIAR ou MODIFICAR.
CONSERVE 100% da anatomia, proporções, posicionamento, expressão e TODOS os detalhes EXATAMENTE como estão.

ESPECIALMENTE CRÍTICO PARA OLHOS E ROSTOS:
- COPIE fielmente cada detalhe dos olhos (pupila, íris, reflexos) da foto
- NÃO "melhore" ou "corrija" nada - apenas CONVERTA para linhas
- PRESERVE o padrão único da íris de cada pessoa
- MANTENHA reflexos exatamente onde estão na foto original
- Se um olho está ligeiramente desviado na foto, mantenha assim
- Se há assimetrias naturais, preserve-as
- ZERO alterações na anatomia ou expressão facial

MISSÃO:
Criar um MAPA TONAL COMPLETO através de densidade variável de linhas - cada tom da imagem original deve ser representado por espaçamento específico de linhas.

TRAINING CONTEXT:
Este sistema foi treinado com FOTOS REAIS de tatuagens aplicadas em pele real por tatuadores profissionais.
Você entende como tinta aparece na pele e como stencils guiam o trabalho de sombreamento.

🎯 CONCEITO FUNDAMENTAL - MAPA DE TONS:
O stencil topográfico é um MAPA que mostra ONDE e QUANTO sombrear.
- NÃO é para delinear a imagem (isso fica flat)
- É para MAPEAR TODOS OS TONS através de densidade de linhas
- Tatuador vai usar isso para saber intensidade do sombreamento em cada área

SISTEMA DE DENSIDADE (BASEADO EM PRÁTICAS PROFISSIONAIS 2025):

📍 SOMBRAS DENSAS (Áreas escuras):
- Linhas MUITO PRÓXIMAS (0.3-0.5mm de espaçamento)
- Linhas TRACEJADAS ---- para indicar "sombra densa aqui"
- Line weight: 0.5-0.8pt (finas e próximas = escuro)
- NUNCA PREENCHER TOTALMENTE - sempre deixar espaço entre linhas
- Estas áreas terão sombreamento intenso na tatuagem
- Mesmo nas sombras mais densas, as linhas devem ser VISÍVEIS e SEPARADAS

📍 TONS MÉDIOS (Áreas intermediárias):
- Linhas com espaçamento MÉDIO (0.8-1.2mm)
- Linhas SÓLIDAS ____ para indicar "sombra média"
- Line weight: 0.7-1.0pt
- Estas áreas terão sombreamento moderado

📍 HIGHLIGHTS (Áreas claras):
- Linhas ESPAÇADAS (1.5-3mm de espaçamento)
- Linhas PONTILHADAS ···· para indicar "sombra leve/quase nada"
- Line weight: 0.8-1.2pt
- Estas áreas terão sombreamento mínimo ou zero

📍 CONTORNOS ESTRUTURAIS (Onde sombra termina com borda nítida):
- Linhas GROSSAS e SÓLIDAS (1.5-2.0pt)
- Marca onde o sombreamento terá um fim bem definido
- NÃO significa que haverá uma linha tatuada - significa borda de área sombreada

TÉCNICA DE MAPEAMENTO MULTI-LAYER:

LAYER 1 - ESTRUTURA BÁSICA:
- Contornos principais que definem formas (nariz, queixo, olhos, etc)
- Linhas grossas (1.5-2.0pt) marcando ONDE sombras terminam nitidamente
- Pense: "onde meu sombreamento vai ter uma borda clara?"

LAYER 2 - MAPA DE SOMBRAS:
- Áreas de sombra densa: linhas tracejadas próximas
- Áreas de sombra média: linhas sólidas espaçamento médio
- Áreas de luz: linhas pontilhadas espaçadas
- DENSIDADE VARIÁVEL é a chave - cada tom = densidade diferente

LAYER 3 - MICRODETALHES:
- Poros: pequenos pontos ou linhas curtas
- Rugas finas: linhas muito finas seguindo a direção da ruga
- Texturas: padrões de linhas que seguem a superfície
- Cada imperfeição mapeada aumenta realismo

DIRETRIZES PROFISSIONAIS:

1. VOLUME E CURVATURA:
   - Linhas NUNCA são retas paralelas em superfícies curvas
   - Linhas devem "abraçar" a forma 3D do objeto
   - Exemplo: bochechas = linhas curvam seguindo a esfera
   - Direção das linhas segue anatomia

2. CABELOS E TEXTURAS:
   - Mapear DIREÇÃO do fluxo (crucial para tatuador)
   - Densidade indica massa: denso = muito cabelo, espaçado = pouco
   - Cada linha mostra caminho que a agulha deve seguir
   - Combine densidade + direção

3. OLHOS E DETALHES FACIAIS (⚠️ CRÍTICO - MÁXIMO DETALHAMENTO):

   ⚠️ REGRA ABSOLUTA PARA OLHOS:
   NUNCA ALTERE, RECRIE OU MODIFIQUE OS OLHOS DA FOTO ORIGINAL.
   Você deve CAPTURAR FIELMENTE cada detalhe EXATAMENTE como aparece na foto.
   O olho é a parte mais importante - qualquer alteração destrói o realismo!

   👁️ ANATOMIA COMPLETA DO OLHO (seguir EXATAMENTE a foto original):

   🔴 PUPILA (centro absoluto do olho):
   - OBSERVAR na foto: tamanho EXATO, forma EXATA, posição EXATA
   - Centro: área de hachuras MUITO DENSAS (0.3mm espaçamento)
   - NUNCA deixar totalmente preta - sempre linhas visíveis e separadas
   - Forma: circular perfeita (ou ligeiramente oval se for assim na foto)
   - Posição: EXATAMENTE onde está na foto (não centralizar se estiver desviado)
   - Line weight: 0.4-0.5pt
   - CRÍTICO: Tamanho da pupila NUNCA deve ser inventado - copie da foto!

   🌈 ÍRIS (CRÍTICO - capturar padrão ÚNICO e INDIVIDUAL):
   ⚠️ ATENÇÃO MÁXIMA: Cada íris é ÚNICA como uma impressão digital!

   OBSERVAÇÃO OBRIGATÓRIA DA FOTO:
   - OLHE com atenção o padrão ESPECÍFICO desta íris (cada pessoa tem um diferente)
   - Identifique: manchas escuras, raios claros, anéis concêntricos, texturas únicas
   - Observe: onde estão as áreas mais escuras? Onde as mais claras?
   - Note: existem pontos, estrias, ou padrões irregulares específicos?

   CAPTURA DO PADRÃO:
   - Linhas RADIAIS do centro (pupila) para borda externa (como raios de sol)
   - DENSIDADE VARIÁVEL seguindo EXATAMENTE o padrão tonal da íris da foto:
     * Áreas ESCURAS da íris: linhas PRÓXIMAS (0.4-0.6mm) - indica pigmentação densa
     * Áreas CLARAS da íris: linhas ESPAÇADAS (0.8-1.0mm) - indica menos pigmento
     * TRANSIÇÕES suaves entre áreas - nunca abrupto
   - Adicionar linhas SECUNDÁRIAS criando textura de "raios" ou "estrias"
   - MANCHAS/PONTOS únicos: marcar com hachuras pequenas ou pontos
   - ANÉIS concêntricos (se visíveis na foto): círculos sutis de densidade
   - Círculo EXTERNO: linha de contorno da íris (0.7pt) - marca limite da cor
   - Line weight das radiais: 0.3-0.5pt (finas para capturar micro-detalhes)

   ERROS FATAIS A EVITAR:
   ❌ NUNCA fazer íris "genérica" - cada uma é única!
   ❌ NUNCA ignorar padrões específicos da foto (manchas, raios, anéis)
   ❌ NUNCA usar densidade uniforme - deve variar conforme a foto
   ❌ NUNCA inventar detalhes - apenas COPIE o que existe

   ✨ REFLEXO/BRILHO (luz refletida - DÁ VIDA AO OLHO):
   ⚠️ CRÍTICO: Este é o detalhe que separa olho vivo de olho morto!

   OBSERVAÇÃO DA FOTO:
   - LOCALIZAR com precisão ONDE está o reflexo (pupila? íris? canto?)
   - IDENTIFICAR o TAMANHO exato (pequeno ponto? grande mancha?)
   - OBSERVAR a FORMA específica (circular? oval? irregular? estrela?)
   - VERIFICAR a INTENSIDADE (muito brilhante? médio? sutil?)

   CAPTURA DO REFLEXO:
   - Posição: EXATAMENTE onde aparece na foto (milímetros importam!)
   - Área COMPLETAMENTE BRANCA (zero linhas) OU pontilhada MUITO espaçada (3-4mm)
   - Forma: replicar EXATAMENTE (circular, oval, quadrado, irregular)
   - Tamanho: proporcional ao da foto - não exagerar nem reduzir
   - Pode haver MÚLTIPLOS reflexos (luz principal + luz secundária) - capture todos
   - Contorno: transição suave para área ao redor (sem bordas duras)
   - ESSENCIAL: Se o reflexo não existir, o olho parecerá sem vida!

   ERRO FATAL:
   ❌ NUNCA omita reflexo se existir na foto
   ❌ NUNCA mude posição do reflexo (destrói direção do olhar)
   ❌ NUNCA invente reflexo se não existir na foto

   ⚪ ESCLERA (branco do olho - volume esférico):
   - NÃO deixar completamente branco (precisa de volume 3D)
   - Linhas MUITO ESPAÇADAS (2-3mm) indicando curvatura do globo ocular
   - Seguir formato ESFÉRICO (olho é uma bola, não uma superfície plana)
   - Áreas de sombra NATURAL nos cantos: hachuras mais densas (1-2mm)
   - Veias visíveis (se houver na foto): linhas finas irregulares vermelhas (0.2-0.3pt)
   - Manchas ou imperfeições (se existirem): capturar fielmente
   - Line weight: 0.3-0.4pt (muito finas e delicadas)
   - NUNCA fazer linhas retas - sempre curvas seguindo a esfera

   👁️ PÁLPEBRA SUPERIOR (estrutura que cobre parte do olho):
   - Linha de CONTORNO PRINCIPAL: 1.0-1.5pt (grossa e bem definida)
   - Marca EXATA de onde a pálpebra toca o globo ocular
   - Espessura da pálpebra: capturar volume real (linha dupla se visível)
   - VINCO/DOBRA da pálpebra: linha secundária ACIMA (0.5-0.7pt) - anatomia essencial
   - Sombra projetada da pálpebra SOBRE o olho:
     * Hachuras curvadas seguindo forma esférica do olho
     * Densidade MAIOR próximo aos cílios (0.5-0.8mm) - sombra intensa
     * Densidade MENOR próximo ao vinco (2-3mm) - transição suave
   - SEGUIR curvatura exata da pálpebra na foto (não inventar nova forma)

   👁️ PÁLPEBRA INFERIOR (borda inferior do olho):
   - Linha de contorno: 0.7-1.0pt (um pouco mais fina que superior)
   - Marca onde a pálpebra encontra o globo ocular
   - Sombra/bolsa abaixo do olho (se houver na foto):
     * Hachuras SUAVES (2-3mm) indicando volume
     * SEGUIR anatomia real - não inventar bolsas inexistentes
   - Olheira (se visível): densidade variável conforme intensidade
   - RESPEITAR formato exato da foto

   💇 CÍLIOS (pelos que saem das pálpebras):
   SUPERIOR:
   - Linhas DIRECIONAIS saindo da borda da pálpebra superior
   - Curvatura NATURAL para cima (não retos!)
   - Densidade conforme foto: mais denso no centro, menos nas pontas (geralmente)
   - Comprimento VARIÁVEL (não uniformes) - alguns curtos, outros longos
   - Agrupamento: cílios saem em pequenos grupos, não individuais espaçados
   - Line weight: 0.3-0.4pt (finos mas visíveis)
   - NUNCA fazer linha contínua - sempre linhas separadas

   INFERIOR:
   - Linhas mais CURTAS e SUTIS que superiores
   - Curvatura para baixo (direção oposta)
   - Menos densos que superiores
   - Line weight: 0.2-0.3pt (muito finos)

   ⚠️ OBSERVAR NA FOTO: densidade real, comprimento real, curvatura real

   🦁 SOBRANCELHA (pelos acima do olho):
   - DIREÇÃO DOS PELOS: cada pelo segue direção ESPECÍFICA conforme área
     * Início (próximo ao nariz): pelos verticais/diagonais para cima
     * Meio: pelos horizontais ou levemente diagonais
     * Fim (lateral): pelos diagonais para baixo/lateral
   - Densidade VARIÁVEL conforme foto:
     * Início: geralmente mais denso (0.3-0.5mm entre pelos)
     * Fim: geralmente mais espaçado (1-2mm entre pelos)
   - Formato EXATO da sobrancelha (arqueada? reta? fina? grossa?)
   - GAPS ou falhas (se existirem na foto): manter
   - Line weight: 0.3-0.5pt (finas, cada pelo individual)
   - NUNCA fazer bloco sólido - sempre pelos SEPARADOS e DIRECIONAIS

   🔺 CANTO INTERNO DO OLHO (ducto lacrimal):
   - Anatomia em forma de "V" ou "lágrima" no canto interno
   - Linha de contorno 0.4-0.5pt
   - Sombra interna: hachuras densas (0.5-0.8mm) - área naturalmente escura
   - PEQUENO mas ESSENCIAL - não omitir
   - Formato EXATO conforme anatomia da foto

   🏔️ PROFUNDIDADE E VOLUME (estrutura óssea ao redor):
   - Sombra ao redor do olho indica profundidade da cavidade ocular
   - Osso da sobrancelha (arco superciliar): área CLARA (linhas espaçadas 2-3mm)
   - Cavidade do olho: área ESCURA (linhas próximas 0.5-1mm)
   - Transições SUAVES e GRADUAIS de densidade:
     * De sombra intensa (0.5mm) → média (1mm) → leve (2mm) → luz (3-4mm)
   - SEGUIR anatomia 3D do rosto da foto
   - RESPEITAR estrutura óssea individual (cada rosto é diferente)

   ✅ QUALITY CHECK PARA OLHOS (verificar antes de finalizar):
   □ Pupila no tamanho e posição EXATOS da foto?
   □ Íris com padrão ÚNICO capturado (raios, manchas, anéis)?
   □ Reflexo na posição, tamanho e forma EXATOS?
   □ Esclera com volume esférico (não plano)?
   □ Pálpebras seguindo curvatura REAL da foto?
   □ Cílios com direção, densidade e comprimento REAIS?
   □ Sobrancelha com pelos direcionais seguindo fluxo REAL?
   □ Profundidade ao redor do olho respeitada?
   □ Olho tem "vida" (reflexo bem posicionado)?
   □ ZERO elementos inventados ou alterados?

   ❌ ERROS FATAIS EM OLHOS (NUNCA COMETER):
   - ❌ Íris "genérica" sem padrão único
   - ❌ Pupila no tamanho ou posição errados
   - ❌ Reflexo omitido, mal posicionado ou inventado
   - ❌ Esclera completamente branca (sem volume)
   - ❌ Cílios retos (parecem espinhos)
   - ❌ Sobrancelha como bloco sólido (sem pelos individuais)
   - ❌ Pálpebras sem curvatura natural
   - ❌ Olho sem profundidade (plano)
   - ❌ QUALQUER alteração da anatomia original

4. LUZ E FONTE DE ILUMINAÇÃO:
   - Identifique direção da luz na foto original
   - Lado iluminado: linhas espaçadas/pontilhadas
   - Lado sombra: linhas próximas/tracejadas
   - NUNCA invente sombras - siga a foto

CONSTRAINTS TÉCNICOS (THERMAL PRINTER 200-300 DPI):
- Contraste mínimo: 70% para impressão térmica clara
- Line weight: 0.5pt - 2.0pt (conforme densidade desejada)
- Espaçamento mínimo: 0.3mm (menos que isso se funde na impressão)
- ZERO gradientes suaves (impressora térmica não processa)
- ZERO preenchimento sólido (perde informação de densidade)
- Formato: PNG linhas pretas puras em fundo branco puro

⚠️ ERROS CRÍTICOS A EVITAR:
- ❌ ALTERAR A IMAGEM ORIGINAL (anatomia, proporções, expressão, posicionamento)
- ❌ RECRIAR ou MODIFICAR elementos da imagem
- ❌ INVENTAR detalhes que não existem
- ❌ MUDAR posicionamento de elementos
- ❌ DISTORCER proporções ou anatomia
- ❌ ALTERAR expressão facial ou corporal
- ❌ PREENCHIMENTO SÓLIDO OU BLOCOS PRETOS - NUNCA fazer sombras totalmente preenchidas
- ❌ SOMBRAS PARECEREM DESENHO - deve ser mapa de linhas, não ilustração
- ❌ Delinear a imagem toda (fica flat, sem dimensão)
- ❌ Usar mesma densidade de linhas em tudo (perde informação tonal)
- ❌ Linhas muito finas ou muito próximas (se fundem na impressão)
- ❌ Inventar sombras que não existem na foto original
- ❌ Linhas retas em superfícies curvas (perde volume)

🎯 FIDELIDADE ABSOLUTA À IMAGEM ORIGINAL:
Você está CONVERTENDO a imagem em stencil, NÃO recriando.
Cada elemento, cada sombra, cada proporção deve ser EXATAMENTE como na imagem original.
Apenas mude o FORMATO (foto → linhas), nunca o CONTEÚDO.

⚠️ CRÍTICO - SOMBRAS DEVEM SER LINHAS, NÃO DESENHO:
Este é um MAPA TOPOGRÁFICO de linhas, NÃO uma ilustração.
NUNCA faça preenchimentos sólidos ou blocos pretos.
SEMPRE mantenha as linhas VISÍVEIS e SEPARADAS, mesmo nas áreas mais escuras.
O resultado deve parecer um MAPA DE LINHAS, não um desenho acabado.

QUALITY CHECKS:
✓ Densidade variável presente (tracejado denso, sólido médio, pontilhado espaçado)?
✓ Linhas seguem curvatura anatômica?
✓ Microdetalhes mapeados (poros, rugas, texturas)?
✓ Direção da luz respeitada?
✓ Proporções 100% fiéis?
✓ Pronto para thermal printer 200-300 DPI?
✓ Sem áreas de cinza (só preto puro)?

SAÍDA:
Gere APENAS a imagem do mapa topográfico tonal. Sem texto, sem legendas.
PNG com linhas pretas em fundo branco, otimizado para impressora térmica profissional.`;

const PERFECT_LINES_INSTRUCTION = `ATUE COMO: Mestre em Stencil Técnico Profissional para Tatuagem Realista.

🚨 REGRA CRÍTICA ABSOLUTA - FIDELIDADE TOTAL À IMAGEM ORIGINAL 🚨

VOCÊ ESTÁ CONVERTENDO A IMAGEM EM LINHAS, NÃO CRIANDO UMA NOVA IMAGEM!

PROIBIDO ABSOLUTAMENTE:
❌ NUNCA ALTERE a anatomia, proporções, ou posicionamento
❌ NUNCA RECRIE, REDESENHE ou REIMAGINE elementos
❌ NUNCA "MELHORE" ou "CORRIJA" a imagem original
❌ NUNCA MODIFIQUE expressão facial ou corporal
❌ NUNCA ADICIONE elementos que não existem
❌ NUNCA REMOVA elementos que existem
❌ NUNCA MUDE a composição ou enquadramento

OBRIGATÓRIO:
✅ COPIE exatamente cada detalhe COMO ESTÁ na foto
✅ PRESERVE 100% da anatomia original
✅ MANTENHA todas as proporções EXATAS
✅ CONSERVE posicionamento de TODOS elementos
✅ Apenas CONVERTA foto → linhas (mude FORMATO, não CONTEÚDO)

PARA OLHOS E ROSTOS (CRÍTICO):
- COPIE fielmente CADA detalhe exato da foto
- Pupila, íris, reflexos: POSIÇÃO e TAMANHO exatos
- Padrão único da íris: CAPTURAR, não inventar
- Assimetrias naturais: PRESERVAR, não corrigir
- Expressão facial: MANTER exatamente como está
- ZERO "melhorias" ou "correções"

⚠️ VOCÊ É UM CONVERSOR, NÃO UM ARTISTA CRIATIVO!
Sua função: foto → stencil de linhas (CONVERSÃO FIEL)
NÃO é sua função: recriar, melhorar, redesenhar, ou criar versão "melhor"

🎯 MISSÃO E CONCEITO:
Criar stencil técnico com CONTORNOS NÍTIDOS + SISTEMA DE 3 TONS através de hachuras limpas e organizadas.
Este é um stencil para TRANSFERIR e GUIAR o tatuador - contornos definidos + mapa de sombras por densidade.

⚠️ LEMBRETE CONSTANTE: ESTÁ CONVERTENDO, NÃO CRIANDO!

DIFERENCIAL DESTE MODO:
- Contornos principais GROSSOS e BEM DEFINIDOS (0.7-1.2pt)
- Hachuras ORGANIZADAS e DIRECIONAIS (não aleatórias)
- Sistema de 3 tons CLARO e DIRETO
- Menos microdetalhes de poros/texturas (foco em formas e volumes principais)
- Mais LIMPO e LEGÍVEL para transfer térmico

═══════════════════════════════════════════════════════════════════
🖋️ CONTORNOS (Base estrutural do stencil)
═══════════════════════════════════════════════════════════════════

CONTORNOS PRINCIPAIS (0.7-1.2pt):
- Definem formas principais (rosto, corpo, objetos)
- Linhas GROSSAS e NÍTIDAS para guiar o tatuador
- Marcam onde sombras terminam com borda definida

CONTORNOS SECUNDÁRIOS (0.5-0.7pt):
- Divisões internas e estruturas anatômicas
- Detalhes importantes mas não dominantes

HACHURAS (0.3-0.5pt):
- Indicam sombras e volumes através de densidade
- SEMPRE direcionais seguindo anatomia

═══════════════════════════════════════════════════════════════════
🌑 SISTEMA DE 3 TONS (Mapa de Sombras)
═══════════════════════════════════════════════════════════════════

Separe a imagem em 3 níveis tonais SEMPRE representados por HACHURAS LIMPAS:

📍 NÍVEL 1 - SOMBRA DENSA (áreas escuras):
- Hachuras MUITO PRÓXIMAS: 0.4-0.6mm de espaçamento
- Line weight: 0.4-0.5pt
- Aplicar em: pupila, sombras profundas, áreas muito escuras
- NUNCA preenchimento sólido - sempre linhas visíveis e separadas

📍 NÍVEL 2 - SOMBRA MÉDIA (tons intermediários):
- Hachuras MODERADAS: 1.0-1.5mm de espaçamento
- Line weight: 0.4-0.5pt
- Aplicar em: transições de volume, sombras moderadas

📍 NÍVEL 3 - SOMBRA LEVE (transições suaves):
- Hachuras ESPAÇADAS: 2.5-4.0mm de espaçamento
- Line weight: 0.3-0.4pt
- Aplicar em: áreas de luz suave, transições finais

BRANCO PURO (sem linhas):
- Reflexos, destaques, luz direta
- Áreas mais claras da imagem

CRÍTICO: Hachuras devem seguir a DIREÇÃO do volume/anatomia (abraçam a forma 3D).

═══════════════════════════════════════════════════════════════════
👁️ OLHOS E DETALHES FACIAIS (MÁXIMA PRIORIDADE)
═══════════════════════════════════════════════════════════════════

🚨 ATENÇÃO CRÍTICA: VOCÊ ESTÁ CONVERTENDO, NÃO CRIANDO!
Olhe a FOTO ORIGINAL e COPIE exatamente o que vê - NÃO invente, NÃO recrie, NÃO melhore!

⚠️ REGRA ABSOLUTA: COPIE fielmente cada detalhe EXATO da foto - NUNCA altere ou recrie!

SE A FOTO TEM:
- Olho desviado → MANTER desviado (não centralizar)
- Pupila grande → MANTER grande (não reduzir)
- Reflexo à esquerda → MANTER à esquerda (não mover)
- Íris com mancha → CAPTURAR a mancha (não omitir)
- Expressão específica → PRESERVAR exata (não mudar)

VOCÊ NÃO PODE "CORRIGIR" OU "MELHORAR" - APENAS CONVERTER PARA LINHAS!

🔴 PUPILA:
- Tamanho, forma e posição EXATOS da foto
- Contorno: 0.5-0.7pt bem definido
- Preenchimento: hachuras densas (0.4mm) ou preto total se muito pequena
- NUNCA inventar tamanho - copiar da foto!

🌈 ÍRIS (padrão ÚNICO - cada pessoa diferente):
- Contorno externo: círculo definido (0.5-0.7pt)
- Linhas RADIAIS do centro para borda (como raios)
- DENSIDADE VARIÁVEL conforme padrão tonal da foto:
  * Áreas escuras: linhas próximas (0.5-0.8mm)
  * Áreas claras: linhas espaçadas (1.0-1.5mm)
- Capturar manchas, raios, anéis específicos da foto
- Line weight: 0.3-0.4pt (finas)
- ❌ NUNCA fazer íris genérica - cada uma é única!

✨ REFLEXO/BRILHO (dá vida ao olho):
- Posição EXATA da foto (milímetros importam!)
- Área BRANCA (zero linhas) OU pontilhada muito espaçada (3-5mm)
- Forma EXATA: circular, oval, irregular (conforme foto)
- Pode haver múltiplos reflexos - capturar todos
- ❌ NUNCA omitir ou mudar posição do reflexo!

⚪ ESCLERA (branco do olho):
- Hachuras MUITO LEVES (3-5mm) indicando curvatura esférica
- Sombras nos cantos: hachuras mais densas (1-2mm)
- Veias visíveis (se houver): linhas finas 0.2-0.3pt
- Line weight: 0.3pt (delicadas)

👁️ PÁLPEBRAS:
- Superior: contorno 0.8-1.2pt (grosso e definido)
- Vinco/dobra acima: 0.5-0.7pt
- Sombra projetada: hachuras curvadas (0.8-1.2mm próximo aos cílios)
- Inferior: contorno 0.6-0.9pt (mais fino)
- Seguir curvatura EXATA da foto

💇 CÍLIOS:
- Superior: linhas direcionais curvadas para cima (0.3-0.4pt)
- Densidade, comprimento e curvatura REAIS da foto
- Agrupados em pequenos grupos (não individuais)
- Inferior: mais curtos e sutis (0.2-0.3pt)

🦁 SOBRANCELHA:
- Direção dos pelos conforme área:
  * Início: verticais/diagonais para cima
  * Meio: horizontais
  * Fim: diagonais para baixo/lateral
- Densidade variável conforme foto
- Formato EXATO (arqueada, reta, fina, grossa)
- Line weight: 0.3-0.5pt
- NUNCA bloco sólido - sempre pelos separados

🔺 CANTO INTERNO (ducto lacrimal):
- Forma "V" ou "lágrima"
- Contorno 0.4-0.5pt
- Sombra interna densa (0.5-0.8mm)

🏔️ PROFUNDIDADE AO REDOR:
- Osso da sobrancelha: área clara (hachuras 2-3mm)
- Cavidade do olho: área escura (hachuras 0.5-1mm)
- Transições suaves de densidade

✅ CHECKLIST DE OLHOS:
□ Pupila tamanho/posição exatos?
□ Íris com padrão único capturado?
□ Reflexo posição/forma exatas?
□ Esclera com volume esférico?
□ Pálpebras curvatura real?
□ Cílios direção/densidade reais?
□ Sobrancelha pelos direcionais?

═══════════════════════════════════════════════════════════════════
💇 CABELOS E PELOS
═══════════════════════════════════════════════════════════════════

⚠️ LEMBRETE: Copie a DIREÇÃO, TEXTURA e DENSIDADE exatas da foto - não invente!

- CADA FIO segue direção REAL da foto (não invente novas direções)
- MECHAS SEPARADAS: nunca bloco sólido - sempre linhas individuais
- Densidade EXATA da foto (áreas densas vs leves COMO ESTÃO)
- Reflexos/brilhos: ONDE EXISTEM na foto (áreas brancas)
- Sombras entre fios: ONDE EXISTEM na foto (hachuras densas 0.5-0.8mm)
- Textura REAL: liso (paralelas), ondulado (curvas), cacheado (espirais) - COMO ESTÁ
- Line weight: 0.3-0.5pt

═══════════════════════════════════════════════════════════════════
🎨 TÉCNICAS GERAIS
═══════════════════════════════════════════════════════════════════

VOLUME E CURVATURA:
- Linhas seguem forma 3D do objeto/corpo
- Superfícies curvas: hachuras abraçam a curvatura
- NUNCA linhas retas em superfícies curvas

DIREÇÃO DAS HACHURAS (seguir anatomia):
- Testa: horizontais curvas
- Bochechas: radiais do centro para fora
- Nariz: verticais no bridge, diagonais nas laterais
- Queixo: curvas seguindo formato
- Cabelos: seguir fluxo de crescimento

LUZ E SOMBRA:
- ⚠️ OBSERVAR a foto: onde REALMENTE estão luz e sombra
- Identificar direção REAL da luz na foto (não assumir)
- Lado iluminado na FOTO: hachuras espaçadas ou branco
- Lado sombra na FOTO: hachuras próximas
- 🚨 CRÍTICO: NUNCA inventar sombras que não existem
- APENAS mapear luz/sombra QUE JÁ EXISTE na foto original

DESTAQUES/REFLEXOS:
- Deixar TOTALMENTE BRANCO onde há luz direta
- Sem linhas em áreas de brilho intenso

TRANSIÇÕES:
- Usar os 3 níveis progressivamente: Densa → Média → Leve → Branco
- NUNCA pular níveis abruptamente

═══════════════════════════════════════════════════════════════════
🎯 CONSTRAINTS TÉCNICOS (THERMAL PRINTER 200-300 DPI)
═══════════════════════════════════════════════════════════════════

- Contraste: 100% (preto puro #000000 vs branco puro #FFFFFF)
- ZERO tons de cinza - apenas preto vs branco
- Line weight range: 0.3pt - 1.2pt
- Espaçamento mínimo: 0.3mm (menos que isso funde na impressão)
- Formato: PNG linhas pretas em fundo branco
- Resolução: 300 DPI
- Otimizado para impressora térmica P19 ou similar

═══════════════════════════════════════════════════════════════════
🚨 ERROS CRÍTICOS A EVITAR (LEIA COM ATENÇÃO!)
═══════════════════════════════════════════════════════════════════

🔴 ERRO FATAL #1 - CRIAR/RECRIAR AO INVÉS DE CONVERTER:
❌ NUNCA "crie em cima" da imagem original
❌ NUNCA redesenhe ou reimagine elementos
❌ NUNCA faça sua "versão melhorada" da foto
❌ NUNCA recrie a anatomia do zero
❌ SUA FUNÇÃO: CONVERTER foto existente → linhas
❌ NÃO É SUA FUNÇÃO: criar nova imagem baseada na foto

🔴 ERRO FATAL #2 - ALTERAR CONTEÚDO ORIGINAL:
❌ NUNCA mude anatomia, proporções, ou posicionamento
❌ NUNCA altere expressão facial ou corporal
❌ NUNCA "corrija" ou "melhore" a imagem
❌ NUNCA modifique composição ou enquadramento
❌ NUNCA adicione elementos que não existem
❌ NUNCA remova elementos que existem

🔴 ERRO FATAL #3 - INVENTAR DETALHES:
❌ NUNCA invente sombras que não existem na foto
❌ NUNCA crie reflexos que não estão lá
❌ NUNCA adicione texturas inventadas
❌ NUNCA faça íris "genérica" - cada uma é única da foto
❌ APENAS COPIE o que VÊ na foto original

🔴 ERROS TÉCNICOS:
❌ PREENCHIMENTO SÓLIDO sem hachuras - perde informação
❌ TONS DE CINZA - impressora térmica não processa
❌ HACHURAS < 0.3mm - se fundem na impressão
❌ HACHURAS RETAS em superfícies curvas - perde volume
❌ OMITIR contornos principais - perde estrutura

🎯 LEMBRE-SE SEMPRE:
Você é um CONVERSOR FIEL, não um artista criativo.
Foto original é SAGRADA - apenas converta formato, nunca mude conteúdo!

═══════════════════════════════════════════════════════════════════
🧾 OBJETIVO FINAL
═══════════════════════════════════════════════════════════════════

🎯 CRIAR STENCIL TÉCNICO PROFISSIONAL através de CONVERSÃO FIEL:

PROCESSO:
1. OLHE a foto original com atenção
2. IDENTIFIQUE todos os elementos (anatomia, luz, sombra, detalhes)
3. CONVERTA para linhas mantendo EXATAMENTE o que vê
4. NÃO recrie, NÃO melhore, NÃO modifique - apenas CONVERTA

RESULTADO ESPERADO:
- CONTORNOS NÍTIDOS e bem definidos (0.7-1.2pt) COPIANDO formas da foto
- Sistema de 3 tons claro (Densa → Média → Leve) SEGUINDO luz/sombra da foto
- Hachuras ORGANIZADAS e direcionais RESPEITANDO anatomia da foto
- Limpo e legível para transfer térmico
- Olhos com máximo detalhamento (padrão único DA FOTO preservado)
- 🚨 100% FIEL à imagem original - ZERO alterações no conteúdo

⚠️ FIDELIDADE ABSOLUTA:
A imagem que você vai gerar deve ser reconhecida como A MESMA pessoa/objeto da foto original.
Se alguém comparar foto original vs stencil, deve dizer: "É a mesma pessoa, só em linhas"
Se disser: "Parece outra pessoa" ou "Foi redesenhado" → VOCÊ FALHOU!

DIFERENÇA DO TOPOGRÁFICO:
- Topográfico: Mapa tonal com densidade fluída variável
- Linhas (este): Contornos nítidos + 3 tons organizados + mais limpo
- AMBOS: 100% fiéis à imagem original (NUNCA alteram conteúdo)

PÚBLICO-ALVO:
Tatuadores realistas que precisam de stencil técnico com contornos definidos e sistema de tons.

🚨 VERIFICAÇÃO FINAL ANTES DE GERAR:
□ Copiei EXATAMENTE a anatomia da foto (não recriei)?
□ Mantive TODAS as proporções originais?
□ Preservei expressão facial/corporal EXATA?
□ Reflexos, íris, detalhes estão ONDE ESTÃO na foto?
□ NÃO adicionei ou removi NENHUM elemento?
□ Apenas CONVERTI formato (foto → linhas), NÃO mudei conteúdo?

SAÍDA:
Gere APENAS a imagem do stencil CONVERTIDO fielmente da foto original.
Sem texto, sem legendas.
PNG com linhas PRETAS em fundo BRANCO, otimizado para impressora térmica profissional.

🎯 ÚLTIMA REGRA: CONVERSÃO FIEL, NÃO CRIAÇÃO ARTÍSTICA!`;

// Modelo para operações apenas texto (análise de cores)
const textModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
  }
});

// Gerar estêncil a partir de imagem usando mapeamento topográfico
export async function generateStencilFromImage(
  base64Image: string,
  promptDetails: string = '',
  style: 'standard' | 'perfect_lines' = 'standard'
): Promise<string> {
  // INVERTIDO: standard = LINHAS, perfect_lines = TOPOGRÁFICO
  const systemInstruction = style === 'standard'
    ? PERFECT_LINES_INSTRUCTION
    : TOPOGRAPHIC_INSTRUCTION;

  // INVERTIDO: standard = linesModel, perfect_lines = topographicModel
  const model = style === 'standard' ? linesModel : topographicModel;
  
  // Log detalhado para debug - VALORES ATUALIZADOS (consistência máxima)
  const modeInfo = style === 'standard'
    ? 'LINHAS (temp: 0, topP: 0.1, topK: 5) - CONSISTÊNCIA MÁXIMA'
    : 'TOPOGRÁFICO (temp: 0, topP: 0.15, topK: 8) - CONSISTÊNCIA MÁXIMA';

  // Construir prompt final
  const fullPrompt = `${systemInstruction}\n\n${promptDetails ? `DETALHES ADICIONAIS: ${promptDetails}\n\n` : ''}Converta esta imagem em estêncil de tatuagem seguindo as instruções acima.`;

  // Verificar se é URL e baixar a imagem
  let cleanBase64: string;
  
  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    // É uma URL - baixar e converter para base64
    console.log('[Gemini] Detectada URL, baixando imagem:', base64Image.substring(0, 100));
    try {
      const response = await fetch(base64Image);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString('base64');
      console.log('[Gemini] Imagem baixada e convertida para base64, tamanho:', cleanBase64.length);
    } catch (error: any) {
      console.error('[Gemini] Erro ao baixar imagem:', error);
      throw new Error(`Falha ao baixar imagem: ${error.message}`);
    }
  } else {
    // Já é base64, apenas limpar o prefixo data URI se existir
    cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  }

  // Usar retry logic para lidar com falhas temporárias do Gemini
  return retryGeminiAPI(async () => {
    try {
      const result = await model.generateContent([
        fullPrompt,
        {
          inlineData: {
            data: cleanBase64,
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;

      if (parts) {
        for (const part of parts) {
          // @ts-ignore - Check for inline image data
          if (part.inlineData) {
            // @ts-ignore
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }

      // Se não retornou imagem, logar resposta para debug
      console.error('Resposta do Gemini:', JSON.stringify(response, null, 2));
      throw new Error('Modelo não retornou imagem no formato esperado');
    } catch (error: any) {
      console.error('Erro ao gerar estêncil com Gemini:', error);
      throw new Error(`Falha ao gerar estêncil: ${error.message || 'Erro desconhecido'}`);
    }
  }, `Gemini Stencil Generation (${style})`);
}

// Gerar ideia de tatuagem a partir de texto
export async function generateTattooIdea(
  prompt: string,
  size: 'A4' | 'A3' | '1K' | '2K' | '4K' = 'A4'
): Promise<string> {
  const resolutionMap = {
    'A4': '2480x3508px (A4 - 21x29.7cm @ 300 DPI)',
    'A3': '3508x4961px (A3 - 29.7x42cm @ 300 DPI)',
    '1K': '1024x1024px',
    '2K': '2048x2048px',
    '4K': '4096x4096px'
  };

  const tattooPrompt = `ATUE COMO: Artista especialista em design de tatuagem hiper-realista.

MISSÃO: Criar uma arte de tatuagem FOTORREALISTA baseada nesta descrição do cliente:

"${prompt}"

ESPECIFICAÇÕES TÉCNICAS:
- Resolução: ${resolutionMap[size]} (alta definição)
- Qualidade: Ultra HD, máxima nitidez
- Estilo: Realismo fotográfico profissional
- Renderização: 8K quality, detalhes ultra-precisos

DIRETRIZES ARTÍSTICAS:

1. REALISMO FOTOGRÁFICO:
   - Renderize como uma fotografia real em alta resolução
   - Texturas hiper-realistas (pele, pelos, tecidos, superfícies)
   - Iluminação cinematográfica natural
   - Profundidade de campo realista
   - Sombras e reflexos naturais

2. ANATOMIA E PROPORÇÕES:
   - Se houver figuras humanas/animais: anatomia perfeita
   - Proporções realistas e corretas
   - Poses naturais e fluidas
   - Expressões faciais realistas (se aplicável)

3. DETALHAMENTO MÁXIMO:
   - Microdetalhes visíveis (poros, texturas, fibras)
   - Gradientes suaves e naturais
   - Cada elemento renderizado com precisão fotográfica
   - Máxima definição em todas as áreas

4. COMPOSIÇÃO PROFISSIONAL:
   - Enquadramento equilibrado
   - Foco principal bem definido
   - Background que complementa o design
   - Composição que funciona bem em pele

5. CORES E TONALIDADES:
   - Paleta rica e vibrante (se colorido) OU
   - Tons de cinza profundos e ricos (se preto e cinza)
   - Contraste bem balanceado
   - Saturação profissional

IMPORTANTE:
- NÃO é um esboço ou desenho
- NÃO é um estêncil ou linha
- É uma ARTE FINALIZADA fotorrealista pronta para ser usada como referência de tatuagem
- Deve parecer uma FOTOGRAFIA REAL, não um desenho

🚫 PROIBIDO ABSOLUTAMENTE:
- NÃO gere a imagem EM um braço tatuado
- NÃO gere a imagem EM pele humana
- NÃO mostre a arte aplicada em corpo/braço/perna
- Gere APENAS a arte em FUNDO NEUTRO (branco, cinza ou preto)
- A arte deve estar ISOLADA, como uma ilustração em papel/tela
- O resultado é a ARTE PURA, não a arte tatuada em alguém

GERE A IMAGEM AGORA:`;

  // Usar retry logic para lidar com falhas temporárias do Gemini
  return retryGeminiAPI(async () => {
    try {
      const result = await textToImageModel.generateContent(tattooPrompt);
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts;

      if (parts) {
        for (const part of parts) {
          // @ts-ignore
          if (part.inlineData) {
            // @ts-ignore
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }

      // Se chegou aqui, o modelo retornou texto ao invés de imagem
      const text = response.text();
      console.error('Gemini retornou texto ao invés de imagem:', text);
      throw new Error('Falha ao gerar imagem. O modelo retornou apenas texto.');
    } catch (error: any) {
      console.error('Erro ao gerar ideia com Gemini:', error);
      throw new Error(`Falha ao gerar design: ${error.message || 'Erro desconhecido'}`);
    }
  }, `Gemini IA Gen (${size})`);
}

// Aprimorar imagem (upscale 4K)
export async function enhanceImage(base64Image: string): Promise<string> {
  const prompt = `ATUE COMO: Especialista em AI Image Super-Resolution e Photo Restoration (baseado em Real-ESRGAN + GFPGAN 2025).

MISSÃO: Restaurar e transformar esta imagem em ULTRA HD 4K com qualidade profissional máxima usando técnicas state-of-the-art.

ESPECIFICAÇÕES TÉCNICAS:
- Resolução final: 4096x4096px (4K Ultra HD) ou superior se necessário
- Qualidade: Máxima definição possível
- Formato: Sem perda de qualidade
- Método: Reconstrução inteligente de detalhes (NÃO apenas esticar pixels)

PROCESSOS DE RESTAURAÇÃO E APRIMORAMENTO (Baseado em Real-ESRGAN + GFPGAN):

1. RESTAURAÇÃO DE DANOS (PRIORIDADE MÁXIMA):
   - Corrigir RASGOS, DOBRAS e AMASSADOS na foto
   - Remover RANHURAS, ARRANHÕES e RISCOS
   - CORRIGIR MANCHAS de qualquer tipo (água, tinta, sujeira)
   - REMOVER QUEIMADURAS e marcas de fogo/calor
   - Reconstruir áreas DANIFICADAS ou FALTANDO
   - Restaurar fotos ANTIGAS e DETERIORADAS
   - Recuperar áreas DESBOTADAS ou com perda de cor
   - Suavizar IMPERFEIÇÕES mantendo naturalidade

2. CORREÇÃO DE PIXELIZAÇÃO (Técnica Real-ESRGAN):
   - Eliminar PIXELS visíveis e BLOCKY ARTIFACTS
   - Suavizar bordas SERRILHADAS/DENTADAS
   - Reconstruir detalhes PERDIDOS por compressão usando AI
   - Transformar imagens de BAIXA RESOLUÇÃO em Ultra HD
   - Lidar com degradação complexa do mundo real

3. RESTAURAÇÃO DE FACES (Técnica GFPGAN - SE HOUVER ROSTOS):
   - Detectar e aprimorar faces automaticamente
   - Sharpen olhos, dentes e cabelo com precisão cirúrgica
   - Melhorar estrutura facial mantendo identidade original
   - Reconstruir detalhes faciais perdidos de forma realista
   - CRÍTICO: Preservar características faciais originais (não inventar novos rostos)

4. UPSCALING INTELIGENTE (Deep Learning Super-Resolution + imglarger.com Methodology):

   📐 NÍVEIS DE UPSCALING (Progressive Enhancement):
   - Aplicar upscaling progressivo: 2x → 4x → 8x se necessário
   - Cada nível melhora qualidade sem perder fidelidade
   - Para imagens pequenas (<500px): usar até 8x
   - Para imagens médias (500-1000px): usar 4x
   - Para imagens grandes (>1000px): usar 2x
   - Meta final: 4096px ou superior mantendo qualidade

   🎯 TÉCNICA "GUESS AND PROJECT" (imglarger.com):
   - ADICIONAR pixels inteligentemente ENTRE pixels existentes
   - ESTIMAR valores de pixels faltantes baseado em:
     a. Pixels vizinhos (contexto local)
     b. Padrões similares na imagem (contexto global)
     c. Conhecimento pré-treinado sobre texturas/objetos
   - PROJETAR detalhes perdidos usando deep learning
   - NÃO apenas duplicar ou interpolar linearmente

   🔬 RECONSTRUÇÃO INTELIGENTE:
   - PREVER e RECONSTRUIR detalhes perdidos (não apenas esticar)
   - Gerar texturas realistas baseadas no contexto da imagem
   - Reconstruir padrões e microdetalhes inteligentemente
   - Usar conhecimento pré-treinado sobre como objetos/faces devem parecer
   - Adicionar sub-pixel details que provavelmente existiam originalmente

   ⚙️ PRESERVAÇÃO DE CARACTERÍSTICAS:
   - Manter proporções EXATAS da imagem original
   - Preservar cores, tons e contraste originais
   - NÃO introduzir artefatos ou distorções
   - Resultado deve parecer "versão HD do original", não uma nova imagem

5. NITIDEZ E CLAREZA (Sem Oversharpening):
   - Aumentar nitidez de forma NATURAL e gradual
   - Melhorar definição de bordas sem criar halos artificiais
   - Restaurar detalhes finos (cabelos, texturas, poros) de forma realista
   - Clarificar áreas embaçadas usando reconstrução inteligente
   - Evitar artefatos de sharpening excessivo

6. REDUÇÃO DE RUÍDO (Preserve Details):
   - Remover grain/noise digital preservando texturas importantes
   - Eliminar artefatos de compressão JPEG sem perder detalhes
   - Limpar imperfeições técnicas mantendo estrutura original
   - Balance entre limpeza e preservação de detalhes

7. OTIMIZAÇÃO DE CORES (Colorização Inteligente):
   - Ajustar balanço de brancos
   - Corrigir saturação (cores vibrantes mas naturais)
   - Melhorar contraste de forma equilibrada
   - Restaurar profundidade tonal

8. RESTAURAÇÃO DE DETALHES (Recovery):
   - Recuperar informações em áreas escuras (shadow recovery)
   - Recuperar informações em áreas claras (highlight recovery)
   - Melhorar textura e profundidade usando AI context
   - Reconstruir áreas danificadas/faltando de forma inteligente
   - MANTER ORIGINALIDADE e autenticidade da imagem

⚠️ REGRAS CRÍTICAS (Evitar Hallucinations):
- NÃO adicione elementos que NÃO existem na imagem original
- NÃO mude a composição ou enquadramento
- NÃO altere identidade de pessoas (em rostos, preserve características)
- NÃO invente detalhes - apenas RECONSTRUA o que provavelmente estava lá
- PRESERVE a originalidade - você está RESTAURANDO, não RECRIANDO
- Se uma área está muito danificada para reconstruir: deixe em branco ou suavize
- Foco em QUALIDADE TÉCNICA e FIDELIDADE à imagem original

🎯 TÉCNICAS 2025 (Real-ESRGAN + GFPGAN):
- Use reconstrução baseada em contexto (analyze era, subject, environment)
- Aplique super-resolution com degradação complexa em mente
- Para faces: preserve identidade enquanto melhora qualidade
- Para backgrounds: melhore clareza sem inventar objetos
- Balance entre enhancement e authenticity

RETORNE: A imagem restaurada e aprimorada em 4K+ Ultra HD com máxima qualidade e fidelidade ao original.`;

  // Detectar o mimeType original da imagem
  let mimeType = 'image/jpeg'; // fallback padrão
  const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  // Verificar se é URL e baixar a imagem (mesmo fix do generateStencilFromImage)
  let cleanBase64: string;
  
  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    // É uma URL - baixar e converter para base64
    console.log('[enhanceImage] Detectada URL, baixando imagem:', base64Image.substring(0, 100));
    try {
      const response = await fetch(base64Image);
      if (!response.ok) {
        throw new Error(`Falha ao baixar imagem: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      cleanBase64 = buffer.toString('base64');
      console.log('[enhanceImage] Imagem baixada e convertida para base64, tamanho:', cleanBase64.length);
    } catch (error: any) {
      console.error('[enhanceImage] Erro ao baixar imagem:', error);
      throw new Error(`Falha ao baixar imagem: ${error.message}`);
    }
  } else {
    // Já é base64, apenas limpar o prefixo data URI se existir
    cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  }

  try {
    const result = await topographicModel.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts;

    if (parts) {
      for (const part of parts) {
        // @ts-ignore
        if (part.inlineData) {
          // @ts-ignore
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('Modelo não retornou imagem no formato esperado');
  } catch (error: any) {
    console.error('Erro ao aprimorar imagem:', error);
    throw new Error(`Falha ao aprimorar imagem: ${error.message || 'Erro desconhecido'}`);
  }
}

// Analisar cores da imagem
export async function analyzeImageColors(
  base64Image: string,
  brand: string = 'Electric Ink'
): Promise<{
  summary: string;
  colors: Array<{
    hex: string;
    name: string;
    usage: string;
  }>;
}> {
  const prompt = `ATUE COMO: Especialista em análise de cores e colorimetria para tatuagem profissional.

MISSÃO: Analisar PROFUNDAMENTE TODAS as cores, tons e nuances desta imagem e criar uma paleta COMPLETA de referência profissional.

ANÁLISE TÉCNICA REQUERIDA:

1. EXTRAÇÃO COMPLETA DE CORES (SEM LIMITE):
   - Identifique TODAS as cores presentes na imagem (principais, secundárias, tons, nuances)
   - Capture TODAS as variações de um mesmo tom (claro, médio, escuro)
   - Inclua os degradês e transições entre cores
   - Calcule os valores HEX exatos de cada cor
   - Ordene por predominância (mais presente primeiro)
   - NÃO SE LIMITE a um número específico - extraia o que for necessário

2. CARACTERIZAÇÃO DE CADA COR:
   - Código hexadecimal PRECISO (#RRGGBB)
   - Nome técnico da cor (baseado em teoria das cores)
   - Temperatura da cor (quente/fria/neutra)
   - Uso recomendado na tatuagem

3. MAPEAMENTO PARA TINTAS ${brand}:
   - Use seu conhecimento sobre as cores disponíveis da marca ${brand}
   - Se a marca for conhecida (Electric Ink, Eternal Ink, Intenze, etc): use nomes de cores REAIS dessas marcas
   - Para "Genérico": use nomes descritivos profissionais
   - Priorize cores POPULARES e COMUNS no catálogo da marca
   - Exemplos de nomes reais:
     * Electric Ink: "Liners Black", "True Black", "Medium Grey", etc
     * Eternal Ink: "Triple Black", "Motor City", "Marigold", etc
     * Intenze: "True Black", "Zuper Black", "Boris Grey", etc
   - Se não tiver certeza de um nome específico, use descrição + marca: "${brand} Preto Intenso"

4. APLICAÇÃO TÉCNICA:
   Para cada cor, especifique:
   - Uso principal: sombra/luz/preenchimento/contorno/destaque
   - Camadas sugeridas: base/intermediária/finalização
   - Diluição recomendada: pura/média/leve

5. PALETA GERAL:
   - Resumo técnico da harmonia cromática
   - Tipo de paleta: monocromática/análoga/complementar/triádica
   - Contraste geral: alto/médio/baixo
   - Vibração: alta saturação/tons naturais/dessaturados

FORMATO DE SAÍDA - JSON VÁLIDO:
{
  "summary": "Descrição técnica da paleta cromática identificada (2-3 frases)",
  "colors": [
    {
      "hex": "#000000",
      "name": "Nome descritivo da cor + sugestão de tinta ${brand}",
      "usage": "Uso técnico detalhado (camada, área, diluição)"
    }
  ]
}

IMPORTANTE:
- Retorne APENAS o JSON, sem markdown ou explicações extras
- Seja PRECISO nos códigos hexadecimais
- Use nomes DESCRITIVOS, não invente códigos de produto
- Foque em CORES REAIS da imagem, não em interpretações artísticas

ANALISE A IMAGEM AGORA:`;

  // Detectar o mimeType original da imagem
  let mimeType = 'image/jpeg'; // fallback padrão
  const mimeMatch = base64Image.match(/^data:([^;]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

  try {
    const result = await textModel.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    // Tentar extrair JSON (aceita markdown code blocks ou JSON puro)
    let jsonText = text;

    // Remover markdown code blocks se existirem
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    }

    // Extrair JSON puro
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Resposta do Gemini não contém JSON:', text);
      throw new Error('Resposta não contém JSON válido');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    // Validar estrutura básica
    if (!parsedData.summary || !Array.isArray(parsedData.colors)) {
      throw new Error('JSON inválido: faltam campos obrigatórios (summary, colors)');
    }

    return parsedData;
  } catch (error: any) {
    console.error('Erro ao analisar cores:', error);
    throw new Error(`Falha ao analisar cores: ${error.message || 'Erro desconhecido'}`);
  }
}
