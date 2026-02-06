# Asset Inventory - Leg 00

## Earth Textures

### Night Map (Primary)
- **File**: `textures/earth_nightmap_8k.jpg`
- **Source**: [Solar System Scope](https://www.solarsystemscope.com/textures/)
- **Resolution**: 8192 x 4096 pixels
- **Size**: 3.0 MB
- **Format**: JPEG (baseline, 8-bit precision, 3 components)
- **License**: CC BY 4.0 (Attribution required)
- **Status**: ✅ Downloaded and verified

## 3D Models

### Cargo Ship (Primary)
- **File**: `models/cargo-ship.glb`
- **Source**: [FetchCFD](https://fetchcfd.com/threeDViewGltf/1491-cargo-ship-3d-model)
- **Format**: glTF 2.0 binary (GLB)
- **Size**: 35 MB ⚠️ Large file - may need optimization
- **License**: Free for educational purposes (remixed from Remix3D)
- **Status**: ✅ Downloaded and verified

### Performance Note
The cargo ship GLB is 35MB, which may cause loading delays on slow connections. If performance issues arise during implementation:
- **Fallback strategy**: Use simplified colored cone geometry as specified in flight.md
- **Optimization option**: Run through glTF-Transform to compress textures and geometry
- **Alternative**: Source a lower-poly model from Sketchfab if needed

## Alternative Sources (Not Downloaded)

### Additional Earth Textures
- [Planet Pixel Emporium](https://planetpixelemporium.com/earth8081.html) - 10K city lights
- NASA Visible Earth - Black Marble 2016

### Alternative Ship Models
- [Low Poly Cargo Ship by Javier_Fernandez](https://sketchfab.com/3d-models/low-poly-cargo-ship-4c22cbaf01c1427f8ab60b3a07b1b32c) - CC BY 4.0, 2.4k triangles (requires Sketchfab account)
- [3DTrixs Cargo Ship](https://3dtrixs.com/3d-model/cargo-ship/) - GLB/GLTF available

## Leg 00 Completion

- [x] 8K night Earth texture sourced and verified
- [x] GLTF cargo ship model sourced and verified
- [x] Fallback strategy documented
- [x] Asset inventory created

**Time elapsed**: ~15 minutes (under 30-min target)
