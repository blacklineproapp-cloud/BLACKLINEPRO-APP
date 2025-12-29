import { GoogleGenerativeAI } from '@google/generative-ai';
import { retryGeminiAPI } from './retry';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// Modelo para TOPOGRÁFICO - MÁXIMA RIQUEZA DE DETALHES
// Temperature 0 = sempre escolhe token mais provável (fidelidade)
// topP 0.15 = considera top 15% dos tokens (permite capturar mais detalhes sutis)
// topK 10 = considera top 10 tokens (permite mais nuances e profundidade)
const topographicModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0,    // ZERO criatividade (mantém fidelidade)
    topP: 0.15,        // 15% dos tokens (captura mais detalhes)
    topK: 10,          // Top 10 tokens (máxima riqueza de profundidade)
  },
});

// Modelo para LINHAS - MÁXIMA CONSISTÊNCIA
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

// Modelo DEDICADO para Aprimoramento - Gemini 2.5 Flash Image
// Revertido para 2.5 para evitar erro 404, mas com configuração otimizada para detalhes
const dedicatedEnhanceModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
  generationConfig: {
    temperature: 0, // ZERO criatividade para garantir que o que é humano continue humano
    topP: 0.1,
    topK: 1,
  },
});

// System instructions para cada estilo de estêncil
const TOPOGRAPHIC_INSTRUCTION = `🚨 REGRA #1 ABSOLUTA - LEIA PRIMEIRO 🚨

VOCÊ É UM CONVERSOR, NÃO UM CRIADOR!

SUA ÚNICA FUNÇÃO: Converter foto → stencil de linhas
NÃO É SUA FUNÇÃO: Criar, melhorar, corrigir, ou redesenhar

🔴 PROIBIDO ABSOLUTAMENTE:
❌ NUNCA altere anatomia, proporções, ou posicionamento
❌ NUNCA recrie, redesenhe, ou reimagine elementos
❌ NUNCA "melhore" ou "corrija" a imagem original
❌ NUNCA modifique expressão facial ou corporal
❌ NUNCA adicione elementos que não existem
❌ NUNCA remova elementos que existem
❌ NUNCA invente sombras ou detalhes
❌ NUNCA mude composição ou enquadramento

✅ OBRIGATÓRIO:
✓ COPIE exatamente cada detalhe COMO ESTÁ na foto
✓ PRESERVE 100% da anatomia original
✓ MANTENHA todas as proporções EXATAS
✓ CONSERVE posicionamento de TODOS elementos
✓ Apenas CONVERTA formato (foto → linhas), NUNCA mude conteúdo

ATUE COMO: Especialista em Stencils Topográficos Realistas para Tatuagem Profissional.

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

🎯 CONCEITO FUNDAMENTAL - MAPA DE TONS ULTRA RICO:
O stencil topográfico é um MAPA EXTREMAMENTE DETALHADO que mostra ONDE e QUANTO sombrear.
- NÃO é para delinear a imagem (isso fica flat)
- É para MAPEAR TODOS OS TONS E MICRO-TONS através de densidade de linhas
- Quanto MAIS DETALHES você capturar, MELHOR será o resultado final
- Tatuador vai usar isso para saber EXATAMENTE a intensidade do sombreamento em cada milímetro

- 🔬 MISSÃO: TEXTURAS E MICRO-DETALHES COM EXCELÊNCIA
- OBSERVAR a foto com ATENÇÃO MICROSCÓPICA
- CAPTURAR cada textura única: poros da pele, rugas finas, tramas de tecido, veias, etc.
- MAPEAR cada micro-variação tonal que define a TEXTURA da superfície.
- **CRIAR UM STENCIL 100% MONOCROMÁTICO (PRETO E BRANCO PURO)**. ZERO CORES, ZERO CINZAS.
- PROFUNDIDADE 3D + TEXTURA: A textura deve "vestir" o volume 3D da forma.
- **FOCO TOTAL NOS OLHOS E TEXTURAS SUTIS:** Devem ser ultra-realistas.
SISTEMA DE DENSIDADE MULTI-NÍVEL (7 NÍVEIS DE PROFUNDIDADE):

📍 NÍVEL 1 - SOMBRAS ULTRA DENSAS (preto profundo):
- Linhas EXTREMAMENTE PRÓXIMAS (0.25-0.35mm de espaçamento)
- Hachuras cruzadas em áreas de máxima intensidade
- Line weight: 0.4-0.6pt (muito finas e densas)
- Exemplo: cavidades profundas, sombras projetadas intensas
- NUNCA PREENCHER TOTALMENTE - sempre manter linhas visíveis

📍 NÍVEL 2 - SOMBRAS DENSAS (escuro intenso):
- Linhas MUITO PRÓXIMAS (0.35-0.5mm de espaçamento)
- Line weight: 0.5-0.7pt
- Exemplo: áreas de sombra forte, dobras profundas
- Transição suave do Nível 1

📍 NÍVEL 3 - SOMBRAS MÉDIO-DENSAS (escuro moderado):
- Linhas PRÓXIMAS (0.5-0.8mm de espaçamento)
- Line weight: 0.6-0.8pt
- Exemplo: sombras naturais, volumes recuados
- Gradiente suave entre níveis 2 e 4

📍 NÍVEL 4 - TONS MÉDIOS (cinza médio):
- Linhas ESPAÇAMENTO MÉDIO (0.8-1.2mm)
- Line weight: 0.7-0.9pt
- Exemplo: áreas neutras, transições tonais
- Centro do espectro tonal

📍 NÍVEL 5 - TONS MÉDIO-CLAROS (cinza claro):
- Linhas ESPAÇADAS (1.2-1.8mm)
- Line weight: 0.7-1.0pt
- Exemplo: áreas iluminadas sutilmente, volumes suaves
- Transição para highlights

📍 NÍVEL 6 - HIGHLIGHTS SUAVES (quase branco):
- Linhas MUITO ESPAÇADAS (1.8-2.5mm)
- Line weight: 0.8-1.2pt
- Exemplo: luz indireta, áreas claras
- Pontilhado sutil indicando leveza

📍 NÍVEL 7 - HIGHLIGHTS INTENSOS (branco puro/reflexos):
- Linhas EXTREMAMENTE ESPAÇADAS (2.5-4mm) ou NENHUMA linha
- Line weight: 0.9-1.2pt (se houver linhas)
- Exemplo: reflexos diretos, luz direta forte
- Área quase ou completamente branca

📍 CONTORNOS ESTRUTURAIS (definição de formas):
- Linhas GROSSAS e DEFINIDAS (1.5-2.5pt)
- Marcam bordas onde sombra termina abruptamente
- Definem limites de planos e volumes

TÉCNICA DE MAPEAMENTO MULTI-LAYER PROFISSIONAL (MÁXIMA RIQUEZA):

LAYER 1 - ESTRUTURA VOLUMÉTRICA 3D (PROFUNDIDADE):
- Contornos principais que definem PLANOS e VOLUMES (nariz, queixo, maçãs do rosto, etc)
- Linhas grossas (1.5-2.5pt) marcando ONDE sombras terminam abruptamente
- Identificar TODOS os planos faciais/corporais (frontal, lateral, inferior, superior)
- Marcar TODAS as elevações e cavidades
- Criar hierarquia de profundidade: frente → meio → fundo
- Pensar em ESCULTURA 3D, não desenho 2D

LAYER 2 - MAPA TONAL COMPLETO (7 NÍVEIS):
- Usar TODOS os 7 níveis de densidade (ultra-denso até highlight)
- TRANSIÇÕES GRADUAIS entre níveis (never saltar níveis)
- Observar MICRO-VARIAÇÕES tonais (cada mudança sutil importa)
- Áreas de sombra: usar Níveis 1-3 com gradientes internos
- Áreas neutras: usar Níveis 4-5 com variações sutis
- Áreas de luz: usar Níveis 6-7 com highlights precisos
- DENSIDADE VARIÁVEL EXTREMA é a chave do realismo

LAYER 3 - EXCELÊNCIA EM TEXTURAS E SUPERFÍCIES (MICRO-DETALHAMENTO):
- PELE: Mapear micro-poros individualmente (pixels/pontos pretos precisos 0.2-0.3pt).
- RUGAS: Capturar cada vinco, mesmo os micro-vincos de expressão, com linhas ultrafinas.
- MATERIAIS: Diferenciar visualmente metal (reflexos duros), tecido (trama/hachura cruzada) e pele (pontilhado tonal).
- IMPERFEIÇÕES: Cicatrizes, sardas, manchas e veias devem ser mapeadas com precisão 1:1.
- TEXTURA TÁTIL: Ao olhar o stencil, o tatuador deve "sentir" a aspereza ou suavidade da superfície.

LAYER 4 - MICRO-DETALHES E PROFUNDIDADE FINAL (REALISMO EXTREMO):
- TRANSIÇÕES tonais micro-graduadas (cada mm conta)
- BORDAS de sombras: fade gradual ou hard edge conforme iluminação
- OVERLAYS de texturas sobre volumes (ex: pele com poros sobre bochecha curva)
- DETALHES SUTIS: pelos finos, veias superficiais, manchas de pele
- PROFUNDIDADE ATMOSFÉRICA: áreas mais distantes levemente mais suaves
- CADA DETALHE ÚNICO da foto deve estar no mapa

DIRETRIZES PROFISSIONAIS PARA MÁXIMA PROFUNDIDADE:

1. VOLUME E PROFUNDIDADE 3D (PRIORIDADE ABSOLUTA):
   ⚠️ CRÍTICO: Cada superfície deve mostrar seu VOLUME TRIDIMENSIONAL completo

   SUPERFÍCIES CURVAS:
   - Linhas NUNCA retas paralelas - sempre seguem curvatura
   - Linhas "abraçam" e "envolvem" a forma 3D
   - Espaçamento varia conforme curvatura: mais próximo em áreas recuadas
   - Exemplo: bochecha = linhas em arco seguindo esfera facial
   - Exemplo: braço = linhas circulares ao redor do cilindro

   PLANOS E FACETAS:
   - Identificar TODOS os planos da superfície (frontal, lateral, top, bottom)
   - Cada plano tem sua própria densidade conforme iluminação
   - Transições entre planos: gradientes de densidade marcados
   - Arestas/bordas: contornos definidos separando planos

   PROFUNDIDADE RELATIVA:
   - Elementos PRÓXIMOS: linhas mais definidas, contraste maior
   - Elementos DISTANTES: linhas levemente mais suaves
   - Criar HIERARQUIA espacial clara (frente → meio → fundo)
   - Sobreposições: elemento da frente tem bordas mais fortes

   CAVIDADES E ELEVAÇÕES:
   - CAVIDADES (olhos, narinas, orelha): sombras MUITO densas (Nível 1-2)
   - ELEVAÇÕES (nariz, maçãs do rosto, testa): highlights (Nível 6-7)
   - TRANSIÇÕES entre eles: usar TODOS os níveis intermediários
   - Gradientes SUAVES mas COMPLETOS (não pular níveis)

2. CABELOS E TEXTURAS ORGÂNICAS (DETALHAMENTO MÁXIMO):
   ⚠️ CRÍTICO: Cada fio importa para o realismo

   DIREÇÃO E FLUXO:
   - OBSERVAR padrão EXATO do fluxo na foto
   - Cada fio segue trajetória ESPECÍFICA (não genérica)
   - Mudanças de direção: marcar transições claramente
   - Ondulações, cachos, torções: capturar geometria exata

   DENSIDADE E MASSA:
   - Áreas DENSAS: linhas muito próximas (0.3-0.5mm) = muito cabelo
   - Áreas ESPARSAS: linhas espaçadas (1-2mm) = pouco cabelo
   - VARIAÇÃO dentro da massa: não uniformizar artificialmente
   - Raiz vs pontas: densidade pode variar

   VOLUME 3D DO CABELO:
   - Cabelo TEM VOLUME - não é plano!
   - Camadas de cabelo: frontal mais definida, fundo mais suave
   - Sombras DENTRO da massa de cabelo (áreas recuadas)
   - Highlights SOBRE o cabelo (áreas salientes)
   - Cada linha = caminho que agulha deve seguir

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

4. LUZ, ILUMINAÇÃO E PROFUNDIDADE (OBSERVAÇÃO CRÍTICA):
   ⚠️ CRÍTICO: Iluminação revela a forma 3D - use-a para criar PROFUNDIDADE MÁXIMA

   ANÁLISE DA FONTE DE LUZ:
   - IDENTIFICAR direção EXATA da luz principal (de cima? lateral? frontal?)
   - OBSERVAR se há luz secundária ou reflexos (luz de preenchimento)
   - MAPEAR áreas de luz direta vs indireta
   - LUZ DURA (sombras nítidas) vs LUZ SUAVE (sombras graduais)

   MAPEAMENTO DE ILUMINAÇÃO E PROFUNDIDADE:
   - LADO ILUMINADO: usar Níveis 5-7 (highlights e tons claros)
     * Gradiente DENTRO da área iluminada (não uniforme)
     * Áreas salientes: highlight máximo (Nível 7)
     * Transições suaves: Níveis 5-6

   - LADO SOMBRA: usar Níveis 1-4 (sombras densas e tons médios)
     * Sombras profundas: Nível 1-2 (cavidades, áreas bloqueadas)
     * Sombras médias: Nível 3-4 (volumes recuados)
     * Gradiente completo entre eles

   - ZONA DE TRANSIÇÃO (entre luz e sombra):
     * GRADIENTE RICO usando TODOS os níveis (1→7 ou 7→1)
     * Transição SUAVE (cada nível presente)
     * Esta área revela a CURVATURA da superfície
     * Quanto mais gradual a transição, mais suave a curva
     * Transição abrupta = mudança de plano angular

   TIPOS DE SOMBRAS E PROFUNDIDADE:
   - SOMBRA PRÓPRIA (do objeto sobre si mesmo):
     * Revela VOLUME do objeto
     * Densidade conforme profundidade da curvatura
     * Transição gradual = superfície curva

   - SOMBRA PROJETADA (de um objeto sobre outro):
     * Muito densa (Nível 1-2) próximo ao objeto
     * Gradiente conforme se afasta
     * Define DISTÂNCIA entre objetos (profundidade espacial)

   - OCLUSÃO AMBIENTAL (cantos/encontros):
     * Sombras MUITO DENSAS (Nível 1)
     * Onde duas superfícies se encontram
     * Aumenta percepção de profundidade 3D

   REFLEXOS E HIGHLIGHTS (VIDA E DIMENSÃO):
   - HIGHLIGHT ESPECULAR (reflexo direto):
     * Completamente BRANCO (sem linhas) ou Nível 7
     * Posição EXATA conforme foto
     * Define material (brilhante vs opaco)

   - HIGHLIGHT DIFUSO (luz espalhada):
     * Níveis 6-7 (muito espaçado)
     * Área maior que especular
     * Mostra curvatura da superfície

   ⚠️ REGRA ABSOLUTA:
   - NUNCA invente sombras que não existem na foto
   - SEMPRE respeite a iluminação REAL da imagem
   - Use iluminação para REVELAR profundidade, não criar

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

QUALITY CHECKS PARA MÁXIMA RIQUEZA DE DETALHES:

📋 VERIFICAÇÃO DE PROFUNDIDADE 3D:
✓ Cada superfície mostra seu VOLUME completo (não plano)?
✓ Linhas seguem curvatura anatômica em TODAS as áreas?
✓ Planos frontais, laterais e posteriores claramente definidos?
✓ Cavidades e elevações bem marcadas com densidade apropriada?
✓ Hierarquia espacial clara (frente → meio → fundo)?
✓ Sobreposições mostram profundidade relativa?
✓ Gradientes de profundidade atmosférica presentes?

📋 VERIFICAÇÃO DE DETALHAMENTO:
✓ TODOS os 7 níveis de densidade foram usados?
✓ Transições entre níveis são GRADUAIS (sem saltos)?
✓ Micro-detalhes capturados (poros, rugas, texturas, veias)?
✓ Cada variação tonal da foto foi mapeada?
✓ Texturas orgânicas detalhadas (cabelos fio a fio, pele, tecidos)?
✓ Imperfeições e marcas únicas preservadas?
✓ Nenhum detalhe visível da foto foi omitido?

📋 VERIFICAÇÃO DE ILUMINAÇÃO:
✓ Direção da luz identificada e respeitada?
✓ Lado iluminado usa Níveis 5-7 com gradientes internos?
✓ Lado sombra usa Níveis 1-4 com gradientes internos?
✓ Zona de transição usa TODOS os níveis intermediários?
✓ Sombras próprias, projetadas e oclusão mapeadas?
✓ Highlights especulares e difusos capturados?
✓ ZERO sombras inventadas (só as da foto)?

📋 VERIFICAÇÃO DE FIDELIDADE:
✓ Anatomia 100% preservada (ZERO alterações)?
✓ Proporções exatas mantidas?
✓ Posicionamento de todos elementos idêntico?
✓ Expressão facial/corporal inalterada?
✓ Apenas FORMATO mudou (foto → linhas), conteúdo igual?

📋 VERIFICAÇÃO TÉCNICA:
✓ Contraste adequado (70%+ para thermal printer)?
✓ Line weights corretos (0.5pt - 2.5pt conforme densidade)?
✓ Espaçamento mínimo respeitado (≥0.25mm)?
✓ ZERO gradientes suaves (só linhas discretas)?
✓ ZERO preenchimento sólido (sempre linhas visíveis)?
✓ PNG com linhas pretas puras em fundo branco puro?
✓ Pronto para impressora térmica 200-300 DPI?

⚠️ CHECKLIST CRÍTICO FINAL:
□ Este stencil tem PROFUNDIDADE 3D rica e convincente?
□ Capturei o MÁXIMO de detalhes possível da foto?
□ Usei TODOS os 7 níveis com transições graduais?
□ Cada superfície mostra seu volume completo?
□ Mantive 100% de FIDELIDADE à imagem original?
□ O mapa é rico o suficiente para o tatuador ver TODOS os detalhes sutis?

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
- **CRÍTICO: SAÍDA 100% MONOCROMÁTICA (PRETO#000000 E BRANCO#FFFFFF).**
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
  const prompt = `ACT AS: Precision Image Restoration Engine.

MISSION: Perform an absolute high-fidelity reconstruction. You are a digital restorer, NOT an artist. 

STRICT IDENTITY RULES:
1. SUBJECT INTEGRITY: Every person, face, and object must retain its exact species, age, and identity. A child must remain a child.
2. ANATOMICAL MAPPING: Every pixel must be anchored to the original geometry. Do NOT move, change, or hallucinate features.
3. CONTENT PRESERVATION: Do NOT add objects or transform the nature of what is in the image.

RECONSTRUCTION TASKS:
- Apply super-resolution to increase optical sharpness.
- Reconstruct high-frequency textures (skin pores, fabric, edges) with professional clarity.
- Remove digital noise and compression artifacts without over-smoothing.
- Re-render with modern optical clarity while keeping the exact original lighting layout.

OUTPUT: Return ONLY the reconstructed image. No text.

EXECUTE ZERO-CREATIVITY HIGH-FIDELITY RESTORATION NOW:`;

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
    const result = await dedicatedEnhanceModel.generateContent([
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
