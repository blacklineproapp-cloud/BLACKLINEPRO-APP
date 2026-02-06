// Prompts otimizados para geração de stencils V6.0
//
// REGRA UNIVERSAL: Nunca alterar posição, proporção, ângulo ou anatomia
// Apenas CONVERTER o formato (foto → stencil)
//
// TOPOGRÁFICO = Mapa topográfico de profundidade com 7 níveis (contornos + hatching)
// LINHAS = Limpo, simples, menos detalhes, contornos básicos (3 tons)
// ANIME = Para ilustrações (limpar linhas) ou fotos (converter para lineart anime-style)
// DOTWORK = Tudo em pontos individuais separados (preto no branco)

// ═══════════════════════════════════════════════════════════════
// INSTRUÇÃO UNIVERSAL: FOCO INTELIGENTE NO ASSUNTO PRINCIPAL
// Aplicada a todos os modos para focar apenas no design/tatuagem
// ═══════════════════════════════════════════════════════════════
const INTELLIGENT_FOCUS_INSTRUCTION = `
═══════════════════════════════════════════════════════════════
🎯 INTELLIGENT SUBJECT FOCUS - EXTRACT ONLY THE MAIN DESIGN
═══════════════════════════════════════════════════════════════

DETECT and FOCUS on the PRIMARY SUBJECT only:

IF IMAGE CONTAINS A TATTOO ON SKIN:
→ Extract ONLY the tattoo design itself
→ IGNORE the body part (arm, leg, torso, back, chest, etc.)
→ IGNORE surrounding skin, veins, body hair, skin texture
→ IGNORE background (walls, furniture, people, etc.)
→ Think: "What would this tattoo look like on transfer paper?"
→ Output: Clean tattoo design isolated from body

IF IMAGE IS A SCREENSHOT (Instagram, Pinterest, social media):
→ Extract ONLY the artwork/design visible in the post
→ IGNORE all UI elements:
  ❌ Navigation bars, buttons, icons, menus
  ❌ Like/comment/share buttons
  ❌ Usernames, captions, hashtags, descriptions
  ❌ Follower counts, timestamps, dates
  ❌ App interface elements, borders, frames
→ Focus on the DESIGN CONTENT only

IF IMAGE HAS A REFERENCE PHOTO WITH BACKGROUND:
→ Extract ONLY the main subject/design
→ IGNORE decorative frames or borders around the image
→ IGNORE background scenery, walls, objects
→ IGNORE secondary objects not part of the main design

EXAMPLES:
✅ CORRECT: Photo of rose tattoo on arm → Output: Rose design only
❌ WRONG: Photo of rose tattoo on arm → Output: Rose + arm + skin

✅ CORRECT: Instagram post of dragon design → Output: Dragon design only
❌ WRONG: Instagram post → Output: Dragon + UI + username + buttons

✅ CORRECT: Reference photo of lion → Output: Lion design only
❌ WRONG: Reference photo → Output: Lion + background + frame

VERIFICATION:
□ Is the output a CLEAN, ISOLATED design?
□ Did I exclude body parts, UI elements, backgrounds?
□ Would this work as a standalone stencil for tattoo transfer?
`;

// ═══════════════════════════════════════════════════════════════
// INSTRUÇÃO UNIVERSAL: PRESERVAÇÃO ESTRITA DE DIMENSÕES
// Garante que a saída tenha exatamente o mesmo tamanho da entrada
// ═══════════════════════════════════════════════════════════════
const DIMENSION_PRESERVATION_INSTRUCTION = `
═══════════════════════════════════════════════════════════════
📐 DIMENSION PRESERVATION - ABSOLUTE REQUIREMENT
═══════════════════════════════════════════════════════════════

OUTPUT DIMENSIONS MUST EXACTLY MATCH INPUT DIMENSIONS:

RULE: If input is WxH pixels → output MUST be WxH pixels

EXAMPLES:
→ Input: 1024x768 → Output: MUST be 1024x768
→ Input: 2048x2048 → Output: MUST be 2048x2048
→ Input: 500x800 → Output: MUST be 500x800
→ Input: 1920x1080 → Output: MUST be 1920x1080

DO NOT:
❌ Crop or trim the output
❌ Add padding, margins, or borders
❌ Resize or scale to different dimensions
❌ Change aspect ratio
❌ "Optimize" or "adjust" dimensions for aesthetics

EVEN IF:
- The subject is small in the frame → Keep full frame size
- There's empty space around the subject → Preserve it
- The composition seems off-center → Keep original dimensions

VERIFICATION:
□ Output width = Input width? (MUST be YES)
□ Output height = Input height? (MUST be YES)
□ Aspect ratio unchanged? (MUST be YES)
`;

// ═══════════════════════════════════════════════════════════════
// TOPOGRÁFICO V7.0 - MAPEAMENTO TOPOGRÁFICO ULTRA-DETALHADO
// O mais detalhado do mercado: TODOS elementos, TODAS texturas, TODA profundidade
// ═══════════════════════════════════════════════════════════════
export const TOPOGRAPHIC_INSTRUCTION_OPTIMIZED = `YOU ARE THE WORLD'S MOST DETAILED TOPOGRAPHIC STENCIL GENERATOR

${INTELLIGENT_FOCUS_INSTRUCTION}

${DIMENSION_PRESERVATION_INSTRUCTION}

═══════════════════════════════════════════════════════════════
🚨 ABSOLUTE RULE: COMPLETE COVERAGE - ZERO OMISSIONS 🚨
═══════════════════════════════════════════════════════════════

EVERY SINGLE ELEMENT in the image MUST be mapped with lines.
NOTHING is skipped. NOTHING is simplified. NOTHING is left blank.

✅ Main subject → fully mapped with depth lines
✅ Background elements → fully mapped with depth lines
✅ Secondary objects → fully mapped with depth lines
✅ Textures (skin, hair, fabric, metal, wood, stone) → all mapped
✅ Shadows → mapped with hatching density
✅ Light sources → mapped as white zones surrounded by contours
✅ Depth transitions → contour boundaries everywhere tone changes
✅ Every fold, wrinkle, pore, strand, edge, surface → MAPPED

IF AN AREA EXISTS IN THE SOURCE → IT MUST HAVE LINES IN THE OUTPUT
The ONLY white areas allowed are genuine HIGHLIGHTS (brightest points of light).

═══════════════════════════════════════════════════════════════
🚨 NEVER "IMPROVE" OR "CLEAN UP" THE PHOTO 🚨
═══════════════════════════════════════════════════════════════

YOUR JOB IS TO CONVERT, NOT ENHANCE.
Even if the input image is:
- Low quality, blurry, pixelated, or compressed
- Noisy, dark, or poorly lit
- Small or low resolution

YOU MUST STILL output ONLY contour lines and hatching.
❌ NEVER output a "better quality" version of the same photo
❌ NEVER output something that looks like the input but cleaner
❌ NEVER upscale, denoise, or enhance the photo
✅ ALWAYS output a LINE-BASED topographic interpretation
✅ The output must look COMPLETELY DIFFERENT from the input
✅ If you can barely see details, draw contour lines where you CAN detect edges

═══════════════════════════════════════════════════════════════
🎨 OUTPUT FORMAT - STRICT
═══════════════════════════════════════════════════════════════

- ONLY black lines (#000000) on white (#FFFFFF) background
- No colors, no gray fills, no gradients, no solid black areas
- ALL information conveyed through LINE DENSITY and LINE DIRECTION
- PNG format, same dimensions as source

═══════════════════════════════════════════════════════════════
📐 COMPOSITION PRESERVATION - ABSOLUTE
═══════════════════════════════════════════════════════════════

PRESERVE WITH 100% ACCURACY:
→ Position, size, angle of EVERY element
→ Proportions, anatomy, perspective, pose
→ All unique features and asymmetries
→ Spatial relationships between all elements
→ The COMPLETE scene (foreground + midground + background)

NEVER:
❌ Move, resize, rotate, crop, or reframe anything
❌ Add elements not in the source
❌ Remove or skip ANY element (even background details)
❌ Simplify complex areas - MAP THEM FULLY
❌ Leave any area unmapped (except pure highlights)

═══════════════════════════════════════════════════════════════
🚫 ZERO ADDITIONS / ZERO OMISSIONS
═══════════════════════════════════════════════════════════════

DO NOT ADD anything not in the source:
- If there is NO eyebrow → DO NOT draw one
- NEVER "complete" or invent elements

DO NOT SKIP anything in the source:
- If there IS a background → MAP IT with full detail
- If there ARE secondary objects → MAP THEM fully
- Every visible element gets the same detailed treatment

═══════════════════════════════════════════════════════════════
⚠️ WATERMARK REMOVAL - MANDATORY
═══════════════════════════════════════════════════════════════
DETECT and IGNORE watermarks. RECONSTRUCT beneath them.
Output must be CLEAN with NO trace of watermarks.

═══════════════════════════════════════════════════════════════
🗺️ TOPOGRAPHIC MAPPING TECHNIQUE - ULTRA DETAILED
═══════════════════════════════════════════════════════════════

Your output is a DEPTH MAP using only lines. Like a topographic terrain map:
- CONTOUR LINES show WHERE depth/tone changes occur
- LINE DENSITY shows HOW deep/dark an area is
- LINE DIRECTION shows the 3D SURFACE ORIENTATION
- The tattoo artist reads this to know exactly where and how to shade

STEP 1 - CONTOUR BOUNDARY LINES:
→ Draw clear lines at EVERY tonal transition in the image
→ These are like elevation contour lines on a terrain map
→ Close together = steep depth change (sharp shadow edge)
→ Far apart = gradual change (soft gradient)
→ MUST cover the ENTIRE image, not just the main subject
→ Background elements get contour lines too

STEP 2 - SHADOW/DEPTH ZONE HATCHING:
→ Inside each depth zone, fill with HATCHING lines
→ Hatching direction follows the 3D SURFACE FORM
→ Denser hatching = deeper shadow = darker area
→ Sparser hatching = lighter area = closer to light
→ EVERY shadow in the image must be hatched, no exceptions
→ Gradual shadows get gradual density transitions

STEP 3 - TEXTURE DIFFERENTIATION:
→ Each material/texture gets its OWN distinctive line pattern:
  • Skin → smooth curved lines following facial/body contours
  • Hair → flowing parallel strokes following each strand direction
  • Fabric/clothing → lines following fold and drape creases
  • Metal/jewelry → tight parallel lines, high contrast spacing
  • Wood → grain-following long lines with knot patterns
  • Stone/concrete → irregular short marks, stipple-like
  • Glass/water → smooth flowing curves with reflection gaps
  • Fur/animal → short directional strokes following growth pattern
  • Leaves/plants → vein-following lines with edge contours
  • Smoke/clouds → loose flowing spiral curves
→ Texture mapping applies to ALL elements equally

STEP 4 - LIGHT SOURCE MAPPING:
→ Identify light direction from the image
→ Highlight zones = pure white (fewest lines)
→ Light-facing surfaces = sparse, widely-spaced lines
→ Shadow-facing surfaces = dense, closely-spaced lines
→ Cast shadows = dense hatching with clear boundary contour
→ Ambient occlusion (crevices, folds) = densest hatching

═══════════════════════════════════════════════════════════════
📊 7-LEVEL DEPTH SYSTEM - MANDATORY ALL LEVELS PRESENT
═══════════════════════════════════════════════════════════════

EVERY output MUST clearly show all 7 levels:

LEVEL 1 - MAXIMUM DEPTH (pupils, deepest cavities, darkest shadows):
→ Cross-hatching (lines crossing at 45-60°), ~0.3mm spacing
→ Multiple contour boundaries stacked close
→ The "valley floor" of your depth map

LEVEL 2 - VERY DEEP (strong cast shadows, deep recesses, nostrils):
→ Dense single-direction hatching, ~0.5mm spacing
→ Clear shadow zone boundaries visible

LEVEL 3 - DEEP (under-eye, under-nose, neck shadows, deep folds):
→ Medium-dense hatching, ~0.8mm spacing
→ Form-following curves clearly visible

LEVEL 4 - MID-DEPTH (transition zones, ambient shadow, mid-tones):
→ Moderate hatching, ~1.2mm spacing
→ Transitional contour lines bridging light/dark

LEVEL 5 - SHALLOW (soft shadow edges, subtle depth changes):
→ Sparse hatching, ~1.8mm spacing
→ Lines still clearly form-following

LEVEL 6 - NEAR-SURFACE (light-facing surfaces, gentle curves):
→ Very sparse single lines or dot-spaced contours, ~2.5mm
→ Just enough to show surface isn't flat

LEVEL 7 - PEAK/HIGHLIGHT (brightest points, direct light hits):
→ NO lines - pure white
→ Used SPARINGLY - only for true specular highlights
→ Most of the image should have SOME lines

CRITICAL: Level 7 (white) should be MINIMAL.
Most of the image should be covered in Levels 1-6.
If large areas are white, you are NOT detailed enough.

═══════════════════════════════════════════════════════════════
✏️ LINE DIRECTION = 3D FORM INFORMATION
═══════════════════════════════════════════════════════════════

Hatching lines ALWAYS follow the surface curvature:
→ Forehead: horizontal curves wrapping around the dome
→ Cheeks: diagonal curves following cheekbone roundness
→ Nose: vertical curves wrapping around the cylinder/sphere
→ Jaw: lines following the jaw angle and chin curve
→ Hair: each strand group has lines following its flow
→ Arms/legs: lines wrapping around the cylindrical form
→ Torso: lines following rib cage and muscle planes
→ Fabric: lines following drape, fold, and crease directions
→ Background objects: lines following their surface geometry

This directional information is what makes this stencil SUPERIOR -
the artist can read the 3D form from the line direction alone.

═══════════════════════════════════════════════════════════════
👁️ EYES - COMPLETE DEPTH MAPPING
═══════════════════════════════════════════════════════════════

PUPIL: Contour circle + Level 1 cross-hatching (NOT solid fill)
IRIS: Radial lines from pupil outward, Levels 2-4 depth gradation
SCLERA: Very sparse curved lines showing eyeball curvature (Level 5-6)
REFLECTION: Pure white spot (Level 7) - SMALL, precise
EYE SOCKET: Dense contour lines showing orbital recession (Level 2-3)
EYELIDS: Upper/lower contour + form-following curved hatching
LASHES: Individual directional strokes, each one visible
UNDER-EYE: Subtle hatching showing skin texture and depth (Level 3-4)
TEAR DUCT: Small area of dense hatching (Level 2)
BROW BONE: Contour boundary + sparse hatching showing protrusion

═══════════════════════════════════════════════════════════════
💇 HAIR - COMPLETE TEXTURE MAPPING
═══════════════════════════════════════════════════════════════

→ Boundary contour lines around each hair MASS/GROUP
→ EVERY strand group has individual directional strokes
→ Dark regions: dense parallel strokes (Level 2-3)
→ Mid-tone regions: medium-spaced strokes (Level 4-5)
→ Light/highlighted regions: sparse strokes (Level 5-6)
→ Specular highlights: tiny white gaps between strokes (Level 7)
→ Part lines: clear contour boundaries
→ Loose strands: individual thin lines following direction
→ NEVER solid black - ALWAYS individual visible strokes
→ Hair should be one of the MOST detailed areas in the stencil

═══════════════════════════════════════════════════════════════
🧑 SKIN - COMPLETE VOLUME MAPPING
═══════════════════════════════════════════════════════════════

CONTOUR BOUNDARIES at every:
→ Shadow/light transition edge
→ Feature boundary (nose bridge, eye sockets, lip edges, ears)
→ Wrinkle, crease, expression line
→ Bone structure protrusion (cheekbone, brow, jaw)

ZONE FILLING (no skin area left blank):
→ Deepest shadows (under nose, neck, eye socket depth): Level 1-2
→ Medium shadows (cheek hollows, temple, jaw underside): Level 3
→ Transitional zones (sides of face, bridge of nose): Level 4
→ Light-facing surfaces (cheek front, forehead): Level 5-6
→ Highlight points (nose tip, forehead shine, cheekbone top): Level 7 (tiny)
→ Skin texture: fine curved marks following pore/wrinkle direction
→ Scars, moles, freckles: mapped with contour lines if visible

═══════════════════════════════════════════════════════════════
🏔️ BACKGROUND - MUST BE FULLY MAPPED
═══════════════════════════════════════════════════════════════

🚨 BACKGROUNDS ARE NOT OPTIONAL - MAP THEM COMPLETELY 🚨

→ If there's a wall → map its texture and shadows with lines
→ If there's sky → map cloud forms and light gradation
→ If there's foliage → map each leaf cluster with line patterns
→ If there's a room → map furniture, walls, objects with depth lines
→ If there's a gradient → map it as gradual hatching density change
→ Background objects get the SAME 7-level treatment as foreground
→ Distance is shown by slightly sparser (but still present) lines
→ Never leave background as empty white unless it's pure white in source

═══════════════════════════════════════════════════════════════
👕 CLOTHING/FABRIC - FOLD AND DRAPE MAPPING
═══════════════════════════════════════════════════════════════

→ Major fold lines = contour boundaries (bold lines)
→ Shadow in folds = hatching following fold direction (Level 2-4)
→ Fabric surface = sparse lines following drape direction (Level 5-6)
→ Fabric texture (denim, silk, leather) = distinct line patterns
→ Wrinkles at joints = dense contour cluster lines
→ Logos/patterns on clothing = outline contour + depth of print

═══════════════════════════════════════════════════════════════
🚫 CRITICAL FAILURES - THESE MAKE THE STENCIL USELESS
═══════════════════════════════════════════════════════════════

❌ EMPTY WHITE AREAS where there should be detail (WORST failure)
❌ Any color whatsoever (monochrome ONLY)
❌ Gray fills or smooth gradients (use LINES)
❌ Solid black fills (use cross-hatching)
❌ Inconsistent detail (some areas detailed, others empty)
❌ Missing background (if source has background, map it)
❌ Missing secondary elements (map EVERYTHING)
❌ Lines that don't follow surface form (random direction)
❌ Less than 7 distinguishable depth levels
❌ Large areas at same density (no depth variation = flat = wrong)

═══════════════════════════════════════════════════════════════
✅ QUALITY VERIFICATION - ALL MUST BE YES
═══════════════════════════════════════════════════════════════

□ Is EVERY element in the source mapped with lines? (No blank areas)
□ Is the background fully mapped (not left empty)?
□ Are ALL 7 depth levels clearly distinguishable?
□ Do hatching lines follow 3D surface direction everywhere?
□ Is it BLACK LINES on WHITE only? (no colors/grays/fills)
□ Is every element in the SAME position as the source?
□ Are different textures mapped with different line patterns?
□ Is the output DENSELY detailed (very few empty white areas)?
□ Can a tattoo artist read EXACT depth from any point?
□ Would this be the MOST detailed stencil they've ever seen?

═══════════════════════════════════════════════════════════════
🏆 THE GOLD STANDARD - WHAT MAKES THIS THE BEST
═══════════════════════════════════════════════════════════════

A PERFECT output has:
1. NO unexplained white areas (only true highlights are white)
2. COMPLETE coverage of every element (subject + background)
3. VISIBLE texture differentiation (hair ≠ skin ≠ fabric ≠ metal)
4. CLEAR depth reading at every point (7 levels present)
5. CONSISTENT form-following line direction (shows 3D shape)
6. The artist can identify EXACTLY what each area is
7. MORE detail than any other stencil tool in existence

OUTPUT: Ultra-detailed topographic depth-map stencil.
Dense coverage of black contour lines and hatching on white.
Every element mapped. Every texture identified. Every shadow graded.
PNG format. Ready for thermal tattoo printer.
The tattoo artist uses this to understand WHERE, HOW DEEP, and WHAT TEXTURE to shade.`;


// LINHAS V2.0 - CAPTURA COMPLETA com contornos de sombras
// Agora contorna TUDO: estruturas físicas + bordas de sombras
export const PERFECT_LINES_INSTRUCTION_OPTIMIZED = `
${INTELLIGENT_FOCUS_INSTRUCTION}

${DIMENSION_PRESERVATION_INSTRUCTION}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫🚫🚫 ABSOLUTE RULE #1 - READ THIS FIRST 🚫🚫🚫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO NOT ADD ANYTHING THAT DOES NOT EXIST IN THE SOURCE IMAGE.

The source image may be INTENTIONALLY CROPPED or PARTIAL.
If you see ONLY an eye → draw ONLY that eye
If there is NO eyebrow in the image → DO NOT DRAW AN EYEBROW
If there is NO nose → DO NOT DRAW A NOSE
NEVER "complete" or "fill in" what you think is missing.

EXAMPLE:
Source: Eye + eyelashes (no eyebrow visible)
✅ CORRECT OUTPUT: Eye + eyelashes only
❌ WRONG OUTPUT: Eye + eyelashes + eyebrow you invented

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROLE: Complete Edge & Shadow Boundary Tracer
FUNCTION: Trace ALL visible edges AND shadow boundaries as black lines on white.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CORE MISSION: CAPTURE EVERYTHING WITH LINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You must capture EVERY detail of the image using ONLY contour lines:
✅ Physical structures (edges, textures, features)
✅ Shadow BOUNDARIES (where light meets shadow - trace the EDGE, not fill)
✅ Tonal transitions (trace the boundary LINE between different tones)
✅ All visible details without exception

THE KEY DIFFERENCE:
❌ DO NOT fill shadows with hatching or parallel lines
✅ DO trace the BOUNDARY/EDGE where shadows begin and end
❌ DO NOT use line density to show darkness
✅ DO use THINNER lines for shadow boundaries vs structural edges

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GEOMETRIC PRESERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- TRACE edges exactly where they exist in the source
- Every line in output must correspond to a visible edge OR shadow boundary in source
- Do NOT shift, resize, or reposition anything
- If a contour is crooked in source, it stays crooked in output

VERIFICATION:
□ Did I add ANYTHING not in source? (MUST be NO)
□ Does every output line match a source edge or shadow boundary? (MUST be YES)

═══════════════════════════════════════════════════════════════
CRITICAL RULE: You are CONVERTING the image to lines, NOT CREATING a new image!
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
⚠️ MANDATORY COLOR RULE - NO EXCEPTIONS ⚠️
═══════════════════════════════════════════════════════════════
❌ ABSOLUTELY NO COLORS - The output MUST be 100% MONOCHROME
❌ NO red, blue, green, yellow, orange, purple, pink, or ANY color
❌ NO sepia, warm tones, cool tones, or tinted grays
✅ ONLY pure black (#000000) lines on pure white (#FFFFFF) background
✅ This is a TATTOO STENCIL - it goes on a thermal printer that only prints BLACK

═══════════════════════════════════════════════════════════════
⚠️ WATERMARK REMOVAL - MANDATORY ⚠️
═══════════════════════════════════════════════════════════════
🔍 DETECT and COMPLETELY IGNORE any watermarks in the source image:
❌ Text overlays like "SVG & PNG", "Commercial Use", "Stock Photo", etc.
❌ Semi-transparent watermarks with website names or logos
❌ Diagonal watermarks, copyright symbols (©), brand names
✅ RECONSTRUCT the artwork beneath watermarks using surrounding context
✅ The output stencil must be CLEAN with NO trace of watermarks
✅ Focus ONLY on the actual artwork/subject, not the watermark text

ABSOLUTE PROHIBITIONS - FIDELITY IS MANDATORY:
❌ NEVER alter anatomy, proportions, positioning, expressions
❌ NEVER recreate, redesign, or reimagine elements
❌ NEVER "improve" or "correct" the original image
❌ NEVER change face shapes, eye positions, or any features
❌ NEVER add elements that don't exist in the original
❌ NEVER remove elements that exist in the original (except watermarks)
✅ COPY every detail EXACTLY as shown in the photo
✅ Only change FORMAT (photo → lines), never CONTENT
✅ Preserve ALL asymmetries and unique characteristics

FOR EYES AND FACES: Copy EXACTLY - pupil, iris, reflections in exact position/size. Preserve natural asymmetries. If left eye is slightly different from right, KEEP IT THAT WAY.

═══════════════════════════════════════════════════════════════
🆕 SHADOW BOUNDARY MAPPING - CRITICAL NEW RULE
═══════════════════════════════════════════════════════════════

SHADOWS MUST BE CAPTURED AS CONTOUR LINES (not fills):

1. SHADOW EDGES (where shadow begins/ends):
   → Trace the BOUNDARY LINE of every shadow
   → Use THINNER lines (0.2-0.4pt) for shadow boundaries
   → This includes: cast shadows, core shadows, ambient occlusion

2. TONAL TRANSITION BOUNDARIES:
   → Where light meets mid-tone: trace a fine line (0.2-0.3pt)
   → Where mid-tone meets shadow: trace a fine line (0.3-0.4pt)
   → Where shadow meets deep shadow: trace a fine line (0.2-0.3pt)

3. HOW TO REPRESENT SHADOWS:
   ✅ CORRECT: Single contour line marking where shadow BEGINS
   ✅ CORRECT: Multiple contour lines for gradual shadow transitions (like topographic elevation)
   ❌ WRONG: Hatching or parallel lines to FILL the shadow area
   ❌ WRONG: Increasing line density in dark areas

4. EXAMPLE - Face shadow under nose:
   ✅ CORRECT: Draw ONE line tracing the shadow boundary shape
   ✅ CORRECT: If shadow is gradual, draw 2-3 concentric boundary lines
   ❌ WRONG: Fill the shadow area with hatching lines

5. SHADOW LINE HIERARCHY:
   → Strong shadow edge (hard shadow): 0.3-0.4pt line
   → Soft shadow transition: 0.2-0.3pt line
   → Subtle tonal change: 0.2pt line
   → Multiple lines for gradual shadows (spaced 1-2mm apart)

═══════════════════════════════════════════════════════════════
COMPLETE DETAIL CAPTURE - NOTHING IGNORED
═══════════════════════════════════════════════════════════════

WHAT TO CAPTURE (ALL of these):

STRUCTURAL DETAILS (medium-thick lines 0.4-0.8pt):
✅ Physical edges and boundaries
✅ Texture patterns (skin, fabric, hair)
✅ Wrinkles, creases, folds
✅ Pores and skin irregularities
✅ Individual hair strands
✅ Feature details (eyes, nose, mouth)
✅ Surface variations and marks

SHADOW & TONAL BOUNDARIES (thin lines 0.2-0.4pt):
✅ Shadow edges - where shadows BEGIN and END
✅ Highlight boundaries - where bright areas are defined
✅ Tonal gradients - trace boundary lines (NOT fill with hatching)
✅ Volume contours - where 3D form creates shadow
✅ Depth cues - contour lines showing depth changes

INTELLIGENCE RULE:
- PHYSICAL STRUCTURE → Draw with 0.4-0.8pt line
- SHADOW/TONAL BOUNDARY → Draw with 0.2-0.4pt thinner line
- NEVER FILL with hatching - only trace boundaries

═══════════════════════════════════════════════════════════════
LINE HIERARCHY (Complete System)
═══════════════════════════════════════════════════════════════
MAIN CONTOURS: 0.6-0.8pt - External silhouettes, major boundaries
FEATURE CONTOURS: 0.4-0.6pt - Eyes, nose, mouth, ears, major elements
DETAIL LINES: 0.3-0.5pt - Wrinkles, creases, texture boundaries
SHADOW BOUNDARIES: 0.2-0.4pt - Where shadows begin/end (THINNER)
MICRO-DETAILS: 0.2-0.3pt - Pores, fine textures, subtle shadows

GOAL: Complete detail capture with line weight hierarchy showing both structure AND shadow boundaries.

═══════════════════════════════════════════════════════════════
EYES (Complete Mapping Including Shadows)
═══════════════════════════════════════════════════════════════
PUPIL:
→ Outer boundary circle (0.5-0.6pt)
→ NO internal shading or fills

IRIS:
→ Outer circle (0.5pt)
→ COMPLETE radial pattern as structural lines (0.3-0.4pt)
  - Map every visible spoke/stripe
  - Inner ring boundary
  - Outer ring boundary
  - Crypts and furrows as edge lines
→ Shadow boundary in iris (0.2-0.3pt) - where darker areas begin

REFLECTION:
→ Outline the reflection shape (0.3pt)
→ Mark boundary between reflection and iris
→ Boundary line around highlight area (0.2pt)

SCLERA:
→ Map visible veins as line structures (0.3pt)
→ Corner detail lines (0.4pt)
→ Shadow boundary where eye socket shadow falls (0.2-0.3pt)

EYELIDS:
→ Upper/lower lid edges (0.5-0.7pt)
→ Crease lines (0.3-0.4pt)
→ Skin texture on lid surface
→ SHADOW BOUNDARY below upper lid (0.2-0.3pt) - trace where shadow begins

LASHES:
→ Individual lash edges (0.3-0.4pt)
→ 15-25 per eye showing natural structure
→ Curved, following natural direction
→ Shadow cast by lashes - trace boundary line (0.2pt)

EYEBROW:
→ Overall shape boundary (0.5pt)
→ Individual hair strands (0.3-0.4pt)
→ 30-50 hairs showing direction flow
→ Shadow below brow bone - trace boundary (0.2-0.3pt)

EYE SOCKET SHADOWS:
→ Trace boundary where orbital shadow begins (0.2-0.3pt)
→ Multiple contour lines if shadow is gradual
→ Under-eye shadow boundary (0.2pt)

═══════════════════════════════════════════════════════════════
HAIR (Complete Including Light/Dark Boundaries)
═══════════════════════════════════════════════════════════════
APPROACH:
→ Outline overall hair mass (0.6-0.8pt)
→ Map 80-150+ individual strand edges (0.3-0.5pt)
→ Show directional flow through strand lines
→ Capture every visible separation and overlap

SHADOW MAPPING IN HAIR:
→ Trace BOUNDARY where hair goes from light to dark (0.2-0.3pt)
→ Multiple boundary lines for gradual transitions
→ Each shadow zone gets a contour line around it
→ NOT hatching to fill - ONLY boundary lines

STRAND DETAIL:
→ Each visible strand = edge line (0.3-0.5pt)
→ Strand overlaps = boundary lines
→ Strand separations = gap definition
→ Flow changes = directional lines
→ Dark strand groups = boundary line around the group (0.2-0.3pt)

RESULT: Dense network of strand lines + shadow boundary lines showing both hair structure AND where light/dark areas are.

═══════════════════════════════════════════════════════════════
FACE & SKIN (Complete With Shadow Boundaries)
═══════════════════════════════════════════════════════════════
MAJOR FEATURES:
→ Face outline/jaw (0.6-0.8pt)
→ Nose: edges, nostrils, bridge, tip (0.4-0.6pt)
→ Mouth: lip edges, philtrum, corners, texture (0.5-0.7pt)
→ Ears: outer shape, internal structures (0.4-0.6pt)
→ Neck: outline and major creases (0.5-0.7pt)

SHADOW BOUNDARY MAPPING (NEW):
→ Under-nose shadow: trace boundary line (0.2-0.3pt)
→ Cheek shadow: trace boundary where shadow begins (0.2-0.3pt)
→ Jaw shadow: trace boundary line (0.2-0.3pt)
→ Neck shadow: trace boundary lines (0.2-0.3pt)
→ Temple shadows: trace boundary (0.2pt)
→ Under-lip shadow: trace boundary (0.2-0.3pt)

WRINKLES & CREASES (All Captured):
→ Every wrinkle = edge line (0.3-0.4pt)
→ Forehead lines, crow's feet, smile lines
→ Nasolabial folds, marionette lines
→ Neck creases, under-eye lines
→ Shadow IN wrinkle = boundary line (0.2pt)

SKIN TEXTURE:
→ Visible pores = tiny dots (0.3pt)
→ Skin texture pattern boundaries
→ Freckles, marks, blemishes = outline shapes
→ Surface irregularities as edge lines

VOLUME/FORM INDICATION:
→ Cheekbone shadow boundary (0.2-0.3pt)
→ Forehead curvature shadow lines (0.2pt)
→ Chin shadow boundary (0.2-0.3pt)
→ Use multiple fine lines for gradual curves (like topographic elevation)

═══════════════════════════════════════════════════════════════
TEXTURE MAPPING (All Physical Patterns + Shadows)
═══════════════════════════════════════════════════════════════
SKIN PORES:
→ Each visible pore = boundary circle (0.3pt)
→ Shadow around pore = tiny boundary (0.2pt)
→ Actual pore locations only

FABRIC/CLOTHING:
→ Weave pattern boundaries
→ Fold edges (physical creases) (0.4-0.5pt)
→ Seam lines
→ Texture transitions
→ Shadow IN folds = boundary lines (0.2-0.3pt)
→ Highlight boundaries on fabric (0.2pt)

OTHER TEXTURES:
→ Jewelry: structural details, engravings + reflection boundaries
→ Accessories: patterns, edges + shadow boundaries
→ Background elements: structures + shadow boundaries

═══════════════════════════════════════════════════════════════
TECHNICAL CONSTRAINTS
═══════════════════════════════════════════════════════════════
- Line weights: 0.2-0.8pt (hierarchy for structure vs shadow)
- ZERO hatching (parallel lines for shading)
- ZERO cross-hatching
- ZERO stippling for tonal effect
- ZERO filled areas
- Shadow = BOUNDARY LINES only (0.2-0.4pt), not fills
- PNG pure black #000000 lines on pure white #FFFFFF
- Ultra-detailed network including shadow boundaries
- Optimized for thermal printer 200-300 DPI

═══════════════════════════════════════════════════════════════
QUALITY VERIFICATION
═══════════════════════════════════════════════════════════════
MUST HAVE:
□ ALL structural details captured (wrinkles, pores, strands, textures)?
□ ALL shadow BOUNDARIES traced with thin lines?
□ Individual features (hairs, wrinkles, pores) shown as edges?
□ Dense network of fine, well-defined lines?
□ Every physical element AND shadow boundary mapped?
□ ZERO hatching or fill shading?
□ Shadow areas defined by boundary LINES only?
□ Anatomy/proportions 100% exact?

MUST NOT HAVE:
□ NO parallel lines for shading
□ NO cross-hatching
□ NO stippling for tone
□ NO line density variation inside shadow areas
□ NO filled shadow areas
□ Shadow represented ONLY by boundary contours

INTELLIGENCE TEST:
- Wrinkle edge → ✅ DRAW (0.3-0.4pt - physical structure)
- Shadow boundary in wrinkle → ✅ DRAW (0.2pt - thin shadow line)
- Hair strand → ✅ DRAW (0.3-0.5pt - physical structure)
- Boundary where hair gets darker → ✅ DRAW (0.2-0.3pt - shadow boundary)
- Pore → ✅ DRAW (0.3pt - physical structure)
- Cheek shadow boundary → ✅ DRAW (0.2-0.3pt - where shadow begins)
- FILL shadow area with lines → ❌ NEVER (only trace boundary)

GOAL: Ultra-detailed map capturing EVERY physical detail AND every shadow/tonal boundary.
Like a technical blueprint showing WHERE structures exist AND WHERE shadows fall.
Shadows shown as CONTOUR BOUNDARIES, not filled areas.
The tattoo artist sees EXACTLY where every detail is AND where every shadow begins/ends.

OUTPUT: Generate ONLY the comprehensive contour map including shadow boundaries. No text. PNG black lines on white.`;

// SIMPLIFY - Converte topográfico detalhado em linhas simples (Pipeline 2-etapas)
export const SIMPLIFY_TOPOGRAPHIC_TO_LINES = `ROLE: Topographic-to-Lines Simplifier
FUNCTION: Simplify DETAILED topographic stencil → CLEAN line stencil

INPUT: You receive a TOPOGRAPHIC stencil with 7 tonal levels and rich details
OUTPUT: Simple LINE stencil with minimal shading (3 basic tones only)

CRITICAL RULES:
❌ NEVER alter structure, anatomy, proportions, positioning
❌ NEVER add/remove elements or change composition
✅ PRESERVE all main contours and structural integrity
✅ SIMPLIFY tonal richness → basic line work

═══════════════════════════════════════════════════════════════
SIMPLIFICATION PROCESS
═══════════════════════════════════════════════════════════════

STEP 1 - EXTRACT MAIN CONTOURS:
→ Identify all major outline lines from topographic
→ Keep strong structural lines (7 levels → convert to 1.0-1.5pt outlines)
→ Preserve silhouette completely

STEP 2 - CONVERT TONAL LEVELS TO BASIC SHADING:
→ Levels 1-3 (ultra dense, dense, medium-dense) → DARK hatching (0.5-1mm)
→ Levels 4-5 (medium, medium-light) → MEDIUM hatching (1.5-2.5mm)
→ Levels 6-7 (highlights) → WHITE (no lines)

STEP 3 - SIMPLIFY DETAILS:
→ 7 tonal levels → 3 basic tones
→ Individual hair strands → grouped hair masses
→ Micro-textures (pores, fine wrinkles) → REMOVE
→ Complex iris patterns → simple radial lines
→ Rich volume indication → basic shadow suggestion

STEP 4 - GROUP COMPLEX TEXTURES:
→ Detailed hair → directional sections
→ Skin micro-details → clean surface
→ Complex shadows → essential shadows only

═══════════════════════════════════════════════════════════════
QUALITY STANDARDS
═══════════════════════════════════════════════════════════════

MAINTAIN:
✅ 100% structural accuracy (contours, proportions)
✅ All anatomical features positioned correctly
✅ Recognition/likeness (for portraits)
✅ Major volume indication

SIMPLIFY:
→ Tonal richness (7 levels → 3 basic)
→ Texture detail (micro → macro)
→ Hair rendering (individual → grouped)
→ Shadow complexity (smooth gradients → simple hatching)

CHECK:
□ All main contours from topographic preserved?
□ Tonal information reduced to 3 basic levels?
□ Details simplified but structure intact?
□ No micro-textures remaining?
□ Clean, simple, traceable result?

═══════════════════════════════════════════════════════════════
TECHNICAL
═══════════════════════════════════════════════════════════════
- Output: Pure black on white PNG
- Main outlines: 1.0-1.5pt
- Shading lines: 0.3-0.5pt
- ZERO soft gradients, ZERO solid fills
- Much simpler than input topographic

GOAL: Inherit topographic's structural precision, deliver simple line aesthetic.

OUTPUT: Generate ONLY the simplified line stencil. No text. PNG black on white.`;

// ANIME/ILUSTRAÇÃO - Para animes, desenhos, Maori, Tribal, Blackwork e qualquer arte que precisa de contornos limpos
// Se input é ilustração: LIMPA e PRESERVA linhas existentes
// Se input é foto: CONVERTE para lineart estilo anime (contornos limpos)
// CRÍTICO: NENHUM preenchimento sólido - APENAS contornos e traçados
export const ANIME_ILLUSTRATION_INSTRUCTION_OPTIMIZED = `ROLE: Lineart Stencil Cleaner for Tattoo (Maori, Tribal, Blackwork, Anime)

${INTELLIGENT_FOCUS_INSTRUCTION}

${DIMENSION_PRESERVATION_INSTRUCTION}

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
⛔ CRITICAL RULES - TATTOO THERMAL STENCIL ⛔
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

❌ NO SOLID FILLS - ZERO FILLED AREAS - ONLY OUTLINES
❌ NO COLORS - 100% MONOCHROME (black lines on white)
❌ NO SHADING - NO HATCHING - NO GRADIENTS

✅ ONLY: Contour lines and edge traces
✅ ONLY: Pure black (#000000) lines on pure white (#FFFFFF) background
✅ ANY solid black area must become ONLY its outline/edge

🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨

═══════════════════════════════════════════════════════════════
🎨 INPUT TYPE DETECTION & HANDLING
═══════════════════════════════════════════════════════════════

This mode works with ANY input type:
✅ Anime / Manga characters → CLEAN and preserve lines
✅ Cartoon illustrations → CLEAN and preserve lines
✅ Tribal / Maori patterns → CLEAN and preserve lines
✅ Geometric tattoo designs → CLEAN and preserve lines
✅ Comic book art → CLEAN and preserve lines
✅ Digital illustrations with outlines → CLEAN and preserve lines
✅ Traditional drawings → CLEAN and preserve lines
✅ Photos / Portraits → CONVERT to anime-style lineart stencil

═══════════════════════════════════════════════════════════════
🎯 CORE MISSION: EXTRACT CLEAN LINEART
═══════════════════════════════════════════════════════════════

YOUR JOB DEPENDS ON INPUT TYPE:

IF INPUT IS AN ILLUSTRATION (has existing line art):
- PRESERVE all existing contour lines exactly where they are
- CLEAN the lines (remove fills, backgrounds, colors)
- DO NOT add new lines - only keep what exists

IF INPUT IS A PHOTO (no existing line art):
- EXTRACT contour lines from the photo
- Create ANIME-STYLE lineart (clean, bold outlines)
- Convert 3D form to 2D outline representation
- Keep same composition, proportions, anatomy
- Think: "What would this look like as an anime/manga drawing?"

REGARDLESS OF INPUT:
- Output MUST be black lines on white background ONLY
- NO solid fills, NO shading, NO gradients
- PRESERVE exact position and proportions of all elements

═══════════════════════════════════════════════════════════════
⚫ SOLID BLACK AREA HANDLING - CRITICAL
═══════════════════════════════════════════════════════════════

SOLID BLACK AREAS (backgrounds, tribal elements, fills):
→ Convert to OUTLINE ONLY - extract the edge/boundary line
→ The interior becomes WHITE (empty)
→ Keep the contour shape, remove the fill

EXAMPLE - Tribal background behind character:
- INPUT: Black tribal shapes filled solid
- OUTPUT: Only the outline/edge of the tribal shape, interior is white

EXAMPLE - Character with black hair fill:
- INPUT: Hair is solid black mass
- OUTPUT: Only the hair outline and strand lines, no solid fill

NEVER:
❌ Keep solid black fills
❌ Use hatching to represent solid areas
❌ Create new decorative elements
❌ Add shading where there was solid black

═══════════════════════════════════════════════════════════════
✏️ LINE PRESERVATION RULES
═══════════════════════════════════════════════════════════════

PRESERVE EXACTLY:
✅ All character contour lines
✅ Facial feature lines (eyes, nose, mouth, expression lines)
✅ Hair strand lines and flow direction
✅ Clothing/armor detail lines
✅ Internal detail lines (muscles, folds, patterns)

LINE WEIGHTS TO MAINTAIN:
→ Main outlines: 0.8-1.2pt (bold, defining the silhouette)
→ Internal details: 0.4-0.7pt (features, clothing)
→ Fine details: 0.3-0.5pt (strands, subtle lines)

═══════════════════════════════════════════════════════════════
🗑️ WHAT TO REMOVE/CLEAN
═══════════════════════════════════════════════════════════════

REMOVE:
❌ Background elements (tribal, decorative, patterns behind subject)
❌ Solid black fills → convert to outline only
❌ Gradients and shading
❌ Color areas (convert all to white)
❌ Watermarks and text

DO NOT REMOVE:
✅ Lines that are part of the main subject
✅ Detail lines within the character/design
✅ Structural elements of the illustration

═══════════════════════════════════════════════════════════════
🔲 GEOMETRIC & TRIBAL PATTERNS
═══════════════════════════════════════════════════════════════

For Maori, Tribal, Geometric designs:
→ KEEP all pattern lines and curves
→ REMOVE solid fills → outline only
→ Preserve symmetry and precision
→ Maintain the structural integrity of the pattern

EXAMPLE - Maori arm band:
- INPUT: Black filled curved shapes
- OUTPUT: Only the outer and inner edges of each shape, white interior

═══════════════════════════════════════════════════════════════
👤 ANIME/MANGA CHARACTER HANDLING
═══════════════════════════════════════════════════════════════

FACE:
→ Preserve expression lines exactly
→ Keep eye detail lines (iris pattern, eyelashes as outlines)
→ Maintain nose and mouth line work
→ No shading, no fills

HAIR:
→ Convert solid black hair to strand outlines only
→ Keep hair flow direction lines
→ Show separation between hair masses via edge lines
→ NO solid black masses

CLOTHING/BODY:
→ Keep all fold and crease lines
→ Preserve muscle definition lines
→ Pattern details preserved as outlines
→ No solid shaded areas

═══════════════════════════════════════════════════════════════
🚫 ABSOLUTE PROHIBITIONS
═══════════════════════════════════════════════════════════════

NEVER:
❌ Add elements that don't exist in source
❌ Create hatching or cross-hatching
❌ Fill any area with solid black
❌ Add shadows or shading
❌ Create gradients
❌ Generate colors (MONOCHROME ONLY)
❌ Alter character proportions or positions
❌ "Improve" or "fix" the original art

═══════════════════════════════════════════════════════════════
✅ QUALITY CHECKLIST
═══════════════════════════════════════════════════════════════

BEFORE OUTPUT, VERIFY:
□ Is the output 100% monochrome (black lines on white)?
□ Are ALL solid black areas converted to outlines only?
□ Is the background completely white/clean?
□ Are all existing contour lines preserved?
□ No hatching, shading, or fills present?
□ No added elements (only what was in source)?
□ Lines are clean and well-defined?
□ ZERO filled/solid areas - ONLY edge lines?

═══════════════════════════════════════════════════════════════
🚨 FINAL MANDATORY CHECK 🚨
═══════════════════════════════════════════════════════════════

IF YOU SEE ANY SOLID BLACK AREA → CONVERT TO OUTLINE ONLY
IF YOU SEE ANY COLOR → MAKE IT BLACK LINE ON WHITE
IF YOU SEE ANY FILLED SHAPE → EXTRACT ONLY THE EDGE LINE

THIS IS FOR MAORI, TRIBAL, BLACKWORK, ANIME:
- All these styles need CLEAN OUTLINES for thermal stencil
- Artist will fill in the black areas manually during tattooing
- Your job is to provide ONLY the contour guide

═══════════════════════════════════════════════════════════════

OUTPUT: Clean lineart stencil. Black lines on white background.
ZERO solid fills. ONLY contour lines and edge traces.
NO backgrounds. NO colors. NO filled areas. PNG format.
Ready for thermal tattoo stencil printing.`;
