# LEGO Builder Project Specification

## Overview

Build a system where an LLM takes natural language requests for LEGO builds and generates LDraw format output that can be visualized in a web interface. The visualization should support stepping through build instructions.

## Output Format: LDraw

LDraw is the standard textual representation for LEGO models. Use it directly rather than inventing a custom DSL.

### LDraw Line Format

```
1 <color> <x> <y> <z> <a> <b> <c> <d> <e> <f> <g> <h> <i> <part>.dat
```

- `1` — line type (part reference)
- `color` — LDraw color code (e.g., 4 = red, 14 = yellow, 0 = black, 15 = white, 71 = gray)
- `x y z` — position coordinates
- `a b c d e f g h i` — 3x3 rotation matrix (9 values)
- `part` — part filename from LDraw library

### Coordinate System

- **Stud spacing**: 20 LDraw units
- **Brick height**: 24 LDraw units (3 plates)
- **Plate height**: 8 LDraw units
- **Y-axis**: Points UP, but negative Y is "higher" (LEGO convention)
- **Origin**: Typically center-bottom of the model

### Build Order with STEP Markers

Use `0 STEP` meta-commands to delineate instruction steps:

```ldraw
0 FILE model.ldr
0 Name: Simple Stack
0 Author: LLM

0 STEP
1 4 0 0 0 1 0 0 0 1 0 0 0 1 3001.dat

0 STEP
1 14 0 -24 0 1 0 0 0 1 0 0 0 1 3001.dat

0 STEP
1 1 0 -48 0 1 0 0 0 1 0 0 0 1 3001.dat
```

Each `0 STEP` separates build stages. Visualization tools show cumulative progress, highlighting newly added parts.

### Rotation Matrix Presets

Common orientations the LLM should know:

| Orientation | Matrix (a b c d e f g h i) |
|-------------|---------------------------|
| Default (no rotation) | `1 0 0 0 1 0 0 0 1` |
| 90° clockwise (Y axis) | `0 0 -1 0 1 0 1 0 0` |
| 180° (Y axis) | `-1 0 0 0 1 0 0 0 -1` |
| 270° clockwise (Y axis) | `0 0 1 0 1 0 -1 0 0` |
| Flipped upside down | `1 0 0 0 -1 0 0 0 -1` |
| Sideways (on side) | `1 0 0 0 0 -1 0 1 0` |

For arbitrary rotations (hinges, joints), the matrix is computed from euler angles:
- The LLM can be given a formula or lookup table for common angles (30°, 45°, 60°, etc.)

### Common Parts Reference

The LLM needs a reference of frequently used parts. Minimum useful set:

| Part | ID | Size (studs) | Notes |
|------|----|--------------|-------|
| Brick 2x4 | 3001.dat | 2x4x1 | Standard brick |
| Brick 2x2 | 3003.dat | 2x2x1 | |
| Brick 1x2 | 3004.dat | 1x2x1 | |
| Brick 1x4 | 3010.dat | 1x4x1 | |
| Brick 1x1 | 3005.dat | 1x1x1 | |
| Plate 2x4 | 3020.dat | 2x4x⅓ | |
| Plate 2x2 | 3022.dat | 2x2x⅓ | |
| Plate 1x2 | 3023.dat | 1x2x⅓ | |
| Plate 1x1 | 3024.dat | 1x1x⅓ | |
| Tile 2x2 | 3068b.dat | 2x2x⅓ | Smooth top |
| Tile 1x2 | 3069b.dat | 1x2x⅓ | Smooth top |
| Slope 45° 2x1 | 3040.dat | 2x1x1 | |
| Slope 45° 2x2 | 3039.dat | 2x2x1 | |
| Round Brick 1x1 | 3062b.dat | 1x1x1 | Cylinder |
| Round Plate 1x1 | 4073.dat | 1x1x⅓ | |
| Plate 1x2 with Clip | 4085d.dat | 1x2x⅓ | Horizontal clip |
| Plate 1x1 with Clip Vertical | 4085a.dat | 1x1x⅓ | |
| Bar 4L | 30374.dat | - | Fits in clips |
| Hinge Plate 1x2 Base | 73983.dat | 1x2x⅓ | Bottom of hinge |
| Hinge Plate 1x2 Top | 73984.dat | 1x2x⅓ | Top of hinge |
| Technic Pin | 2780.dat | - | Friction pin |
| Technic Axle 4 | 3705.dat | 4L | |

Expand this list as needed. Full catalog at: https://www.ldraw.org/parts/latest-parts.html

### Color Reference

| Code | Color |
|------|-------|
| 0 | Black |
| 1 | Blue |
| 2 | Green |
| 4 | Red |
| 14 | Yellow |
| 15 | White |
| 7 | Light Gray |
| 8 | Dark Gray |
| 71 | Stone Gray |
| 72 | Dark Stone Gray |
| 25 | Orange |
| 26 | Magenta |
| 27 | Lime |
| 28 | Dark Tan |
| 29 | Bright Pink |
| 70 | Reddish Brown |

Full list: https://www.ldraw.org/article/547.html

---

## Visualization Stack

### Primary Tool: ldraw.js

JavaScript library for rendering LDraw in the browser using Three.js.

- Repository: https://github.com/nickalevitt/LDrawJS or similar forks
- Loads parts from LDraw parts library (can use CDN or local)
- Supports stepping through STEP markers
- Interactive 3D rotation/zoom

### Alternative: Three.js + LDrawLoader

Three.js has a built-in LDrawLoader:

```javascript
import { LDrawLoader } from 'three/addons/loaders/LDrawLoader.js';

const loader = new LDrawLoader();
loader.setPartsLibraryPath('path/to/ldraw/parts/');
loader.load('model.ldr', (model) => {
  scene.add(model);
});
```

This is part of Three.js examples/addons — well maintained and documented.

### Implementation Approach

1. **Minimal viewer**: HTML page with Three.js, LDrawLoader, orbit controls
2. **Text input**: Paste LDraw output from LLM
3. **Step navigation**: Parse STEP markers, show/hide parts per step
4. **Part highlighting**: New parts in each step rendered with different opacity or outline

---

## LLM Integration

### System Prompt Requirements

The LLM generating LDraw needs:

1. **Coordinate system rules** (from above)
2. **Part reference table** (from above, expandable)
3. **Rotation matrix presets** (from above)
4. **Color codes** (from above)
5. **STEP marker conventions**
6. **Examples of complete, valid LDraw files**

### Example System Prompt Section

```
You generate LEGO models in LDraw format. 

COORDINATE SYSTEM:
- 1 stud = 20 units
- 1 brick height = 24 units  
- 1 plate height = 8 units
- Y axis points up, but negative Y is higher
- Place first part at origin (0, 0, 0)

OUTPUT FORMAT:
- Start with header: 0 FILE, 0 Name, 0 Author
- Use 0 STEP between build stages
- Each part: 1 <color> <x> <y> <z> <rotation matrix 9 values> <part>.dat

ROTATION (no rotation): 1 0 0 0 1 0 0 0 1
ROTATION (90° Y): 0 0 -1 0 1 0 1 0 0

[Include parts table]
[Include color codes]

When generating builds:
1. Plan the structure before outputting
2. Order steps for physical buildability (foundation first)
3. Group related parts in the same step
4. Verify parts don't overlap spatially
```

### Validation Layer (Optional)

A Python or JS script that:

1. Parses LDraw output
2. Validates part IDs exist
3. Checks for obvious collisions (same coordinates, same step)
4. Verifies syntax correctness
5. Returns errors for LLM to fix

---

## Development Phases

### Phase 1: Viewer Prototype
- [ ] HTML page with Three.js + LDrawLoader
- [ ] Text area for pasting LDraw
- [ ] Basic orbit controls
- [ ] Load and render simple test model

### Phase 2: Step Navigation
- [ ] Parse STEP markers from LDraw text
- [ ] Prev/Next buttons
- [ ] Show cumulative build per step
- [ ] Highlight current step's parts

### Phase 3: LLM Prompt Engineering
- [ ] Assemble system prompt with part reference
- [ ] Test with simple builds (stack of bricks, small house)
- [ ] Iterate on prompt to reduce errors
- [ ] Add more parts to reference as needed

### Phase 4: Integration
- [ ] Connect LLM output directly to viewer
- [ ] Add regenerate/edit workflow
- [ ] Optional: validation layer with error feedback

### Phase 5: Polish
- [ ] Part count/inventory display
- [ ] Export to file download
- [ ] Better UI for input/output
- [ ] Mobile support

---

## Resources

- LDraw.org (official spec): https://www.ldraw.org
- LDraw file format spec: https://www.ldraw.org/article/218.html
- Parts library: https://www.ldraw.org/parts/latest-parts.html
- Three.js LDrawLoader docs: https://threejs.org/docs/#examples/en/loaders/LDrawLoader
- Color reference: https://www.ldraw.org/article/547.html

---

## Notes

- The parts library is large (~500MB complete). For web, load parts on demand or host a subset.
- LDraw has submodels (MPD format) for complex builds — useful later but not needed initially.
- Some parts have multiple versions (e.g., 3068a vs 3068b) — use "b" versions generally (updated geometry).