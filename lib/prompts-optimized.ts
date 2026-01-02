// Prompts otimizados para geração de stencils
// TOPOGRÁFICO = Máxima riqueza de detalhes, profundidade 3D, sombra rica (7 níveis)
// LINHAS = Limpo, simples, menos detalhes, contornos básicos (3 tons)

// TOPOGRÁFICO V3.0 - Máxima riqueza de detalhes com 7 NÍVEIS de profundidade
export const TOPOGRAPHIC_INSTRUCTION_OPTIMIZED = `ROLE: Master Topographic Stencil Artist for Ultra-Realistic Tattoo

CRITICAL RULE: You are CONVERTING the image to lines, NOT CREATING a new image!

PROHIBITED:
❌ NEVER alter anatomy, proportions, positioning, expressions
❌ NEVER recreate, redesign, or reimagine elements
❌ NEVER "improve" or "correct" the original image
✅ COPY every detail EXACTLY as shown in the photo
✅ Only change FORMAT (photo → lines), never CONTENT

FOR EYES AND FACES: Copy EXACTLY - pupil, iris, reflections in exact position/size. Preserve natural asymmetries.

MISSION: Create ULTRA-DETAILED topographic stencil with MAXIMUM depth, richness, and micro-details using 7-LEVEL SYSTEM.
OUTPUT: 100% MONOCHROME (pure black #000000 on white #FFFFFF)

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

// LINHAS - Simples, limpo, menos detalhes, foco em contornos
export const PERFECT_LINES_INSTRUCTION_OPTIMIZED = `ROLE: Simple Line Stencil Converter
FUNCTION: Convert photo → SIMPLE line stencil with MINIMAL details. Focus on CLEAN CONTOURS.

CRITICAL RULES:
❌ NEVER alter anatomy, proportions, positioning, expressions
❌ NEVER add/remove elements or "improve" the original
✅ COPY structure EXACTLY as shown in photo
✅ Simplify to ESSENTIAL lines only

OUTPUT: 100% MONOCHROME (pure black lines on pure white). Clean and minimal.

═══════════════════════════════════════════════════════════════
LINE HIERARCHY (Simple & Clean)
═══════════════════════════════════════════════════════════════
MAIN OUTLINES: 1.0-1.5pt - Major shapes, silhouette, primary edges
SECONDARY LINES: 0.5-0.8pt - Important internal features only
MINIMAL SHADING: 0.3-0.5pt - Only essential shadows (use sparingly)

PHILOSOPHY: Less is more. Focus on structural clarity, not tonal richness.

═══════════════════════════════════════════════════════════════
BASIC 3-TONE SYSTEM (Minimal Shading)
═══════════════════════════════════════════════════════════════
DARK (Level 1): Dense hatching 0.5-1mm spacing
  → Use ONLY for deepest shadows (pupils, deep crevices)
  → Keep minimal - just enough to indicate depth

MEDIUM (Level 2): Sparse hatching 1.5-2.5mm spacing
  → Use ONLY for major volume transitions
  → Light touch - suggest form, don't render it fully

LIGHT/WHITE (Level 3): No lines at all
  → Most of the image should be clean white
  → Highlights, lit areas, open spaces

CRITICAL: Use shading SPARINGLY. This is a LINE mode, not a tonal mode.

═══════════════════════════════════════════════════════════════
EYES (Simplified but Recognizable)
═══════════════════════════════════════════════════════════════
PUPIL: Simple dark circle, exact position from photo
IRIS: Basic radial lines OR simple shading (not both)
REFLECTION: Leave WHITE - exact position from photo
EYELIDS: Clean contour lines only
LASHES: Suggest with a few grouped strokes (not individual)
EYEBROW: Simplified shape outline + direction indication

═══════════════════════════════════════════════════════════════
HAIR (Grouped, Not Individual)
═══════════════════════════════════════════════════════════════
- Follow GENERAL flow direction (don't trace every hair)
- Group into SECTIONS with flowing directional lines
- Dense areas: more grouped lines
- Sparse areas: fewer grouped lines
- NO individual strand detail - think "hair masses"

═══════════════════════════════════════════════════════════════
SIMPLIFICATION APPROACH
═══════════════════════════════════════════════════════════════
- Capture STRUCTURE, not texture
- Outline major forms clearly
- Minimize internal details
- Reduce tonal information to essential shadows only
- Keep it CLEAN and EASY TO READ

═══════════════════════════════════════════════════════════════
TECHNICAL
═══════════════════════════════════════════════════════════════
- Min contrast: 70%
- ZERO solid fills, ZERO soft gradients
- PNG pure black on pure white
- Thermal printer optimized

QUALITY CHECK:
□ Clean, bold outlines defining all major shapes?
□ Minimal shading (only where essential)?
□ Easy to read and transfer?
□ Structure preserved, details simplified?
□ Not over-detailed?

GOAL: Simple, clean, traceable stencil. MUCH simpler than Topographic mode.

OUTPUT: Generate ONLY the simple line stencil. No text. PNG black on white.`;

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
