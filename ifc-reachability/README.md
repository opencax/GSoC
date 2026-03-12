# Reachability Analysis for IFC

This project provides tools to calculate and visualize reachable regions within a building IFC model. It uses the `voxec` library for voxelization and reachability analysis.

## Features
- **Cross-Platform**: Runs on Windows, macOS, and Linux.
- **Voxel-based Analysis**: High-performance reachability calculations.
- **Blender Integration**: Visualize results directly in Blender using meshes or GPU decorators.
- **Standalone Mode**: Visualize results outside Blender using PyVista.

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mayavi
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### 1. Standalone Execution (CLI)
To run the reachability analysis and visualize it using PyVista (default outside Blender):
```bash
python reachability.py Duplex_A_20110907.ifc
```

### 2. Blender Integration
To run the script within Blender:
1. Open Blender.
2. Go to the **Scripting** tab.
3. Open `reachability.py`.
4. Modify the `fns` list or pass arguments to the script.
5. Run the script.

Alternatively, you can run Blender from the command line and pass the script:
```bash
blender --python reachability.py -- Duplex_A_20110907.ifc
```

## Modules
- `reachability.py`: Main entry point for calculation.
- `view_mesh.py`: Blender module to create mesh-based visualizations (Mentor Recommended).
- `view_decorator.py`: Blender module to create ephemeral GPU overlays.

## Requirements
- Python 3.x
- `ifcopenshell`
- `voxec`
- `numpy`
- `pyvista` (for standalone visualization)
