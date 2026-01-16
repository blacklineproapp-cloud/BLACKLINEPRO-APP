// Prompts otimizados para geração de stencils
// TOPOGRÁFICO = Máxima riqueza de detalhes, profundidade 3D, sombra rica (7 níveis)
// LINHAS = Limpo, simples, menos detalhes, contornos básicos (3 tons)

// TOPOGRÁFICO V3.0 - Máxima riqueza de detalhes com 7 NÍVEIS de profundidade
export const TOPOGRAPHIC_INSTRUCTION_OPTIMIZED = `ROLE: Master Topographic Stencil Artist for Ultra-Realistic Tattoo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ GEOMETRIC PRESERVATION - ABSOLUTE PRIORITY ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU ARE A TRACER WITH ARTISTIC DEPTH, NOT A RECREATOR:
- TRACE every contour from the source image with MATHEMATICAL PRECISION
- Every pixel position in OUTPUT must map to the EXACT same position in INPUT
- Do NOT shift, resize, or reposition ANY element
- Eye position → SAME pixel coordinates | Nose shape → SAME pixel boundaries
- If a line is crooked in the original, it stays crooked

GEOMETRIC LOCK:
- Overlay your output on the original → ALL features must align EXACTLY
- You are adding DEPTH and DETAIL to the original structure, NOT redesigning it
- Think: "I am TRACING then ENRICHING" not "I am DRAWING something similar"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ZERO ADDITIONS - ABSOLUTE PROHIBITION 🚫
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU MUST NOT ADD ANYTHING THAT DOES NOT EXIST IN THE SOURCE IMAGE:
- ❌ If there is NO eyebrow → DO NOT draw an eyebrow
- ❌ If there is NO nose → DO NOT draw a nose
- ❌ If there is NO eyelash → DO NOT draw eyelashes
- ❌ If there is NO background → DO NOT add a background
- ❌ NEVER "complete" what you think is missing
- ❌ NEVER assume the image is cropped and add the "rest"

CRITICAL: The source image may contain ONLY a partial face, a single eye, 
just lips, or any isolated element. THIS IS INTENTIONAL.
Your job is to trace EXACTLY what exists, nothing more.

EXAMPLE: If the image shows ONLY an eye with eyelashes:
✅ OUTPUT: Eye + eyelashes ONLY
❌ WRONG: Eye + eyelashes + eyebrow you invented

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL RULE: You are CONVERTING the image to lines, NOT CREATING a new image!

═══════════════════════════════════════════════════════════════
⚠️ MANDATORY COLOR RULE - NO EXCEPTIONS ⚠️
═══════════════════════════════════════════════════════════════
❌ ABSOLUTELY NO COLORS - The output MUST be 100% MONOCHROME
❌ NO red, blue, green, yellow, orange, purple, pink, or ANY color
❌ NO sepia, warm tones, cool tones, or tinted grays
✅ ONLY pure black (#000000), shades of gray, and pure white (#FFFFFF)
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

PROHIBITED:
❌ NEVER alter anatomy, proportions, positioning, expressions
❌ NEVER recreate, redesign, or reimagine elements
❌ NEVER "improve" or "correct" the original image
✅ COPY every detail EXACTLY as shown in the photo
✅ Only change FORMAT (photo → lines), never CONTENT

FOR EYES AND FACES: Copy EXACTLY - pupil, iris, reflections in exact position/size. Preserve natural asymmetries.

MISSION: Create ULTRA-DETAILED topographic stencil with MAXIMUM depth, richness, and micro-details using 7-LEVEL SYSTEM.
OUTPUT: 100% MONOCHROME (pure black #000000 on white #FFFFFF) - ZERO COLORS ALLOWED

═══════════════════════════════════════════════════════════════
CONTOURS (Structural Foundation)
═══════════════════════════════════════════════════════════════
MAIN CONTOURS (0.8-1.5pt): Define major shapes, strong and crisp
SECONDARY CONTOURS (0.5-0.8pt): Internal structures, anatomical divisions
TERTIARY CONTOURS (0.3-0.5pt): Fine details, subtle edges
HATCHING (0.3-0.6pt): Create depth/volume through density, ALWAYS directional following 3D form

═══════════════════════════════════════════════════════════════
7-LEVEL TONAL SYSTEM (Maximum Depth & Richness)
═══════════════════════════════════════════════════════════════
LEVEL 1 - ULTRA DENSE SHADOW (0.25-0.35mm spacing, 0.4-0.6pt)
  → Deepest blacks: pupils, deep cavities, core shadows
  → NEVER solid fill - always visible separated lines
  → Maximum darkness while maintaining line structure

LEVEL 2 - DENSE SHADOW (0.35-0.5mm spacing, 0.4-0.5pt)
  → Dark intense areas: strong shadows, recessed forms
  → Clear directional hatching following anatomy

LEVEL 3 - MEDIUM-DENSE SHADOW (0.5-0.8mm spacing, 0.4-0.5pt)
  → Moderate dark tones: transition zones, secondary shadows
  → Rich tonal depth

LEVEL 4 - MEDIUM TONE (0.8-1.2mm spacing, 0.3-0.5pt)
  → Middle grays: neutral areas, soft volume indication
  → Balanced density

LEVEL 5 - MEDIUM-LIGHT TONE (1.2-1.8mm spacing, 0.3-0.4pt)
  → Light grays: gentle transitions, subtle volume
  → Sparse but visible

LEVEL 6 - LIGHT HIGHLIGHT (1.8-2.5mm spacing, 0.3-0.4pt)
  → Very light tones: approaching highlights, soft light areas
  → Minimal hatching, maximum spacing

LEVEL 7 - INTENSE HIGHLIGHT (2.5-4.0mm spacing OR pure white)
  → Brightest areas: direct reflections, specular highlights
  → Extremely sparse dots OR completely white

CRITICAL: Use ALL 7 levels to create smooth, rich gradients. Hatching MUST follow 3D volume/anatomy direction

═══════════════════════════════════════════════════════════════
3D DEPTH & VOLUME (CRITICAL PRIORITY)
═══════════════════════════════════════════════════════════════
ANALYZE 3D STRUCTURE:
→ Identify ALL planes: frontal, lateral, superior, inferior
→ Map spatial hierarchy: foreground → midground → background
→ Mark all cavities (Level 1-2 shadows) and elevations (Level 6-7 highlights)
→ Think SCULPTURE, not flat drawing

CURVED SURFACES:
→ Lines MUST "embrace" and "wrap around" 3D forms
→ NEVER straight parallel lines on curved surfaces
→ Spacing varies with curvature (tighter on curves)
→ Example: cheek = arc lines following facial sphere

DEPTH TRANSITIONS:
→ Use ALL 7 levels for smooth gradient transitions
→ Near elements: stronger contrast, sharper lines
→ Distant elements: softer transitions
→ Overlaps: clear depth separation with edge contrast

SHADOW TYPES (all mapped):
→ Core shadow: reveals object's volume (Levels 1-3)
→ Cast shadow: defines spatial relationships (Levels 2-4)
→ Ambient occlusion: corners/crevices (Level 1 ultra-dense)

═══════════════════════════════════════════════════════════════
EYES (MAXIMUM PRIORITY + 7-LEVEL DEPTH)
═══════════════════════════════════════════════════════════════
ABSOLUTE RULE: COPY faithfully each EXACT detail from photo - NEVER alter or recreate!

PUPIL: EXACT size/shape/position, contour 0.6-0.8pt, Level 1 ultra-dense (0.25-0.35mm)
IRIS: Unique radial pattern, use Levels 2-5 for tonal variation, 0.3-0.5pt
  → Inner ring: denser (Level 2-3)
  → Outer ring: medium (Level 4-5)
  → Natural irregularities preserved
REFLECTION: EXACT position/shape, Level 7 (pure white or 3-5mm sparse dots). NEVER omit!
SCLERA: Subtle volume - Levels 5-6 (1.5-2.5mm), denser in corners Level 4 (1mm), 0.3pt
EYELIDS: Upper bold 0.8-1.2pt, crease 0.5-0.7pt, shadow below Level 3 (0.6-0.8mm)
LASHES: Individual curved strokes, natural grouping, upper 0.4-0.5pt, lower 0.2-0.3pt
EYEBROW: Individual hairs per direction zone, use Levels 2-4 for density, 0.3-0.5pt

═══════════════════════════════════════════════════════════════
HAIR & ORGANIC TEXTURES (3D MASS)
═══════════════════════════════════════════════════════════════
FLOW & DIRECTION: Follow EXACT pattern from photo, capture curves and twists
DENSITY MAPPING:
→ Dense masses: Levels 1-3 (0.3-0.7mm)
→ Medium masses: Levels 3-5 (0.7-1.5mm)
→ Sparse areas: Levels 5-6 (1.5-2.5mm)
3D VOLUME OF HAIR MASS:
→ Foreground strands: sharp, defined (Level 2-3)
→ Interior depth: softer, shadowed (Level 1-2)
→ Surface highlights: sparse or white (Level 6-7)
→ Layer separation clear
Each strand = individual tattoo needle path

═══════════════════════════════════════════════════════════════
SKIN & MICRO-TEXTURES (Maximum Detail Capture)
═══════════════════════════════════════════════════════════════
PORES & TEXTURE:
→ Visible pores: tiny dots 0.3-0.4pt at Level 5-6 spacing
→ Skin texture variation across zones
→ Wrinkles/creases: fine lines 0.3pt with adjacent Level 2-3 shadow
SURFACE DETAILS:
→ Every unique mark, freckle, irregularity mapped
→ Subtle tonal variations using appropriate levels
→ Micro-transitions between adjacent areas

═══════════════════════════════════════════════════════════════
TECHNICAL CONSTRAINTS
═══════════════════════════════════════════════════════════════
- Min contrast: 70%
- Line weights: 0.3-1.5pt (varied for hierarchy)
- Min spacing: 0.25mm (Level 1), Max: 4.0mm (Level 7)
- ZERO soft gradients, ZERO solid fills
- PNG pure black #000000 on pure white #FFFFFF
- Optimized for thermal printer 200-300 DPI

═══════════════════════════════════════════════════════════════
QUALITY VERIFICATION (Critical Checks)
═══════════════════════════════════════════════════════════════
3D DEPTH:
□ All 7 tonal levels clearly present and distinct?
□ Smooth gradients using progressive level transitions?
□ 3D volume convincing (curves, planes, depth)?
□ Spatial hierarchy clear (near/far relationships)?

DETAIL RICHNESS:
□ Micro-details captured (pores, texture, fine wrinkles)?
□ Every unique element from photo preserved?
□ Hair strands individual and directional?
□ Surface textures rich and varied?

FIDELITY:
□ Anatomy/proportions/positioning 100% exact?
□ Eye details (pupil/iris/reflection) perfectly copied?
□ Natural asymmetries preserved?
□ Nothing invented or "improved"?

TECHNICAL:
□ Hatching directional (follows 3D form)?
□ Lines clean and separated (no solid fills)?
□ Thermal printer ready (200-300 DPI)?
□ All shadows are hatching-based?

OUTPUT: Generate ONLY the ultra-detailed topographic stencil. No text, no legends. PNG black on white.`;

// LINHAS - Versão SIMPLIFICADA para evitar alucinações
export const PERFECT_LINES_INSTRUCTION_OPTIMIZED = `
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

ROLE: Edge Tracer
FUNCTION: Trace visible edges as black lines on white. Nothing more.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GEOMETRIC PRESERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- TRACE edges exactly where they exist in the source
- Every line in output must correspond to a visible edge in source
- Do NOT shift, resize, or reposition anything
- If a contour is crooked in source, it stays crooked in output

VERIFICATION:
□ Did I add ANYTHING not in source? (MUST be NO)
□ Does every output line match a source edge? (MUST be YES)

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

CRITICAL PHILOSOPHY:
✅ CAPTURE: All structural elements (edges, textures, wrinkles, pores, strands, features)
✅ DRAW: Fine, well-defined lines for every detail boundary
✅ INTELLIGENT FILTERING: Distinguish structural details FROM tonal shadows
❌ IGNORE: Shadows, depth shading, tonal gradients, volume hatching
❌ NEVER: Use line density or hatching to indicate darkness/light

CRITICAL RULES:
❌ NEVER use parallel lines for shading (hatching)
❌ NEVER use line density to show shadows
❌ NEVER fill areas with tonal patterns
✅ Draw lines ONLY where physical structures exist
✅ Map every structural detail with fine, clean lines

OUTPUT: 100% MONOCHROME - Dense network of fine black contour lines on white. NO SHADING. ZERO COLORS.

═══════════════════════════════════════════════════════════════
INTELLIGENT DETAIL DETECTION
═══════════════════════════════════════════════════════════════
WHAT TO CAPTURE (Structural Details):
✅ Physical edges and boundaries
✅ Texture patterns (skin, fabric, hair)
✅ Wrinkles, creases, folds
✅ Pores and skin irregularities
✅ Individual hair strands
✅ Feature details (eyes, nose, mouth)
✅ Surface variations and marks

WHAT TO IGNORE (Tonal Information):
❌ Shadows (cast shadows, core shadows)
❌ Highlights and light reflections
❌ Tonal gradients and transitions
❌ Volume indication through darkness
❌ Depth cues through shading

INTELLIGENCE RULE: If it's a PHYSICAL STRUCTURE → draw it. If it's LIGHT/SHADOW → ignore it.

═══════════════════════════════════════════════════════════════
LINE HIERARCHY (Fine & Well-Defined)
═══════════════════════════════════════════════════════════════
MAIN CONTOURS: 0.6-0.8pt - External silhouettes, major boundaries
FEATURE CONTOURS: 0.4-0.6pt - Eyes, nose, mouth, ears, major elements
DETAIL LINES: 0.3-0.5pt - Wrinkles, creases, texture boundaries
MICRO-DETAILS: 0.3-0.4pt - Pores, fine textures, hair strands

GOAL: Maximum detail density through fine, well-defined structural lines.

═══════════════════════════════════════════════════════════════
EYES (Complete Structural Mapping)
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
→ NOT radial hatching for tone
→ Draw the STRUCTURE, not the darkness

REFLECTION:
→ Outline the reflection shape (0.3pt)
→ Mark boundary between reflection and iris
→ NO highlight rendering

SCLERA:
→ Map visible veins as line structures (0.3pt)
→ Corner detail lines (0.4pt)
→ NO tonal shading

EYELIDS:
→ Upper/lower lid edges (0.5-0.7pt)
→ Crease lines (0.3-0.4pt)
→ Skin texture on lid surface
→ NO shadow fills below eye

LASHES:
→ Individual lash edges (0.3-0.4pt)
→ 15-25 per eye showing natural structure
→ Curved, following natural direction
→ NOT dense fills

EYEBROW:
→ Overall shape boundary (0.5pt)
→ Individual hair strands (0.3-0.4pt)
→ 30-50 hairs showing direction flow
→ Density shown by strand count, NOT shading

═══════════════════════════════════════════════════════════════
HAIR (Complete Strand Mapping)
═══════════════════════════════════════════════════════════════
APPROACH:
→ Outline overall hair mass (0.6-0.8pt)
→ Map 80-150+ individual strand edges (0.3-0.5pt)
→ Show directional flow through strand lines
→ Capture every visible separation and overlap

STRAND DETAIL:
→ Each visible strand = edge line
→ Strand overlaps = boundary lines
→ Strand separations = gap definition
→ Flow changes = directional lines

CRITICAL - NO SHADOW RENDERING:
→ DO NOT darken areas with more lines
→ DO NOT use hatching for hair depth
→ DO NOT indicate volume through density
→ ONLY draw actual strand structures

RESULT: Dense network of strand lines showing hair structure, NOT darkness.

═══════════════════════════════════════════════════════════════
FACE & SKIN (Complete Structural Detail)
═══════════════════════════════════════════════════════════════
MAJOR FEATURES:
→ Face outline/jaw (0.6-0.8pt)
→ Nose: edges, nostrils, bridge, tip (0.4-0.6pt)
→ Mouth: lip edges, philtrum, corners, texture (0.5-0.7pt)
→ Ears: outer shape, internal structures (0.4-0.6pt)
→ Neck: outline and major creases (0.5-0.7pt)

WRINKLES & CREASES (All Captured):
→ Every wrinkle = edge line (0.3-0.4pt)
→ Forehead lines, crow's feet, smile lines
→ Nasolabial folds, marionette lines
→ Neck creases, under-eye lines
→ Draw the CREASE EDGE, not the shadow

SKIN TEXTURE:
→ Visible pores = tiny dots (0.3pt)
→ Skin texture pattern boundaries
→ Freckles, marks, blemishes = outline shapes
→ Surface irregularities as edge lines

CRITICAL - NO VOLUME SHADING:
→ DO NOT map "where light meets shadow"
→ DO NOT draw tonal transitions
→ DO NOT indicate cheekbone depth with lines
→ ONLY draw actual physical structures

═══════════════════════════════════════════════════════════════
TEXTURE MAPPING (All Physical Patterns)
═══════════════════════════════════════════════════════════════
SKIN PORES:
→ Each visible pore = boundary circle (0.3pt)
→ NOT stippling for tone
→ Actual pore locations only

FABRIC/CLOTHING:
→ Weave pattern boundaries
→ Fold edges (physical creases)
→ Seam lines
→ Texture transitions
→ NO shadow fills in folds

OTHER TEXTURES:
→ Jewelry: structural details, engravings
→ Accessories: patterns, edges
→ Background elements: actual structures only

═══════════════════════════════════════════════════════════════
TECHNICAL CONSTRAINTS
═══════════════════════════════════════════════════════════════
- Line weights: 0.3-0.8pt (hierarchy only, NOT for tone)
- ZERO hatching (parallel lines for shading)
- ZERO cross-hatching
- ZERO stippling for tonal effect
- ZERO line density variation for shadows
- ZERO filled areas
- PNG pure black #000000 lines on pure white #FFFFFF
- Ultra-detailed structural network
- Optimized for thermal printer 200-300 DPI

═══════════════════════════════════════════════════════════════
QUALITY VERIFICATION
═══════════════════════════════════════════════════════════════
MUST HAVE:
□ ALL structural details captured (wrinkles, pores, strands, textures)?
□ Individual features (hairs, wrinkles, pores) shown as edges?
□ Dense network of fine, well-defined lines?
□ Every physical element mapped?
□ ZERO hatching or shading?
□ ZERO tonal rendering?
□ Anatomy/proportions 100% exact?

MUST NOT HAVE:
□ NO parallel lines for shading
□ NO cross-hatching
□ NO stippling for tone
□ NO line density for shadows
□ NO volume indication through hatching
□ NO shadow mapping
□ NO highlight rendering

INTELLIGENCE TEST:
- Wrinkle edge → ✅ DRAW (physical structure)
- Shadow in wrinkle → ❌ IGNORE (tonal information)
- Hair strand → ✅ DRAW (physical structure)
- Dark area in hair → ❌ IGNORE (shadow)
- Pore → ✅ DRAW (physical structure)
- Cheek shadow → ❌ IGNORE (tonal gradient)

GOAL: Ultra-detailed structural map capturing EVERY physical detail.
Like a technical blueprint showing WHERE every element exists, NOT how dark/light it is.
The tattoo artist sees EXACTLY where every detail is located, with fine, well-defined lines.

OUTPUT: Generate ONLY the comprehensive structural contour map. No text. PNG black lines on white.`;

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
