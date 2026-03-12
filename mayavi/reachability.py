import functools
import sys
import ifcopenshell
import ifcopenshell.geom
import voxec
import concurrent.futures
import os
import numpy as np

# Ensure helper modules (view_mesh, view_decorator) can be found in Blender
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

voxec.default_VOXELSIZE = 0.2
voxec.default_THREADS = 1
voxec.SILENT = True

def create_geometry(files, **kwargs):
    s = ifcopenshell.geom.settings(
        USE_WORLD_COORDS=True,
        DISABLE_OPENING_SUBTRACTIONS=False,
        ITERATOR_OUTPUT=ifcopenshell.ifcopenshell_wrapper.SERIALIZED,
    )

    def inner():
        for f in files:

            it = ifcopenshell.geom.iterator(s, f, **kwargs, num_threads=8)

            if not it.initialize():
                return

            while True:
                elem = it.get()
                inst = f[elem.id]
                print('g', inst)
                yield inst, elem.geometry.brep_data

                if not it.next():
                    break
    
    return list(inner())

def voxelize(geoms):
    if len(geoms) == 0:
        return None
    
    def voxelize_geometry(inst_geom):
        # Now uses the global default_VOXELSIZE (0.2) automatically
        vox = voxec.run("voxelize", inst_geom[1], method="volume")
        print('v', inst_geom[0])
        return vox

    def combine_union(a, b):
        return a.boolean_union(b)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        voxelized_results = list(executor.map(voxelize_geometry, geoms))
    
    if not voxelized_results:
        return None
        
    return functools.reduce(combine_union, voxelized_results)

def get_reachability(file, surface_voxels):
    slabs = create_geometry(file, include=["IfcSlab"])
    slab_voxels = voxelize(slabs)
    doors = create_geometry(file, include=["IfcDoor"])
    door_voxels = voxelize(doors)
    walkable = voxec.run('shift', slab_voxels, dx=0, dy=0, dz=1)
    walkable_minus = voxec.run('subtract', walkable, slab_voxels)
    walkable_seed = voxec.run('intersect', door_voxels, walkable_minus)
    surfaces_sweep = voxec.run('sweep', surface_voxels, dx=0, dy=0, dz=0.5)
    surfaces_padded = voxec.run('offset_xy', surface_voxels, 0.1)
    surfaces_obstacle = voxec.run('sweep', surfaces_padded, dx=0, dy=0, dz=-0.5)
    walkable_region = voxec.run('subtract', surfaces_sweep, surfaces_obstacle)
    walkable_seed_real = voxec.run('subtract', walkable_seed, surfaces_padded)
    reachable = voxec.run('traverse', walkable_region, walkable_seed_real)
    return reachable

# Handle arguments, filtering out Blender-specific ones if necessary
if "--" in sys.argv:
    fns = sys.argv[sys.argv.index("--") + 1:]
else:
    fns = sys.argv[1:]

if not fns:
    print("Reachability Analysis - Hello World")
    print("Usage: python reachability.py <ifc_file>")
    print("Hint: You can use 'Duplex_A_20110907.ifc' as a demo file.")
    sys.exit()

for fn in fns:
    if not os.path.exists(fn):
        print(f"Error: File '{fn}' not found.")
        sys.exit(1)

files = [ifcopenshell.open(fn) for fn in fns]
print(f"Processing {len(files)} files...")
all_surfaces = create_geometry(files, include=["IfcWall", "IfcSlab", "IfcStair", "IfcStairFlight", "IfcRamp", "IfcRampFlight"])
voxels = voxelize(all_surfaces)
print("Computing reachability...")
reachable = get_reachability(files, voxels)

def plot(vx):
    arr = np.array(vx.get_domain())

    if arr.sum() == 0:
        print("No reachable voxels found. Check if doors and slabs are correctly identified in the IFC.")
        return

    voxels_set = np.array(np.where(arr)).T
    print(f"Drawing {len(voxels_set)} reachable points/voxels.")

    # 1. Check if running inside Blender
    try:
        import bpy
        print("Running in Blender environment...")
        
        # We default to Mesh mode because it's what the mentor recommended for depth
        try:
            import view_mesh
            import view_decorator
            view_mesh.create_reachability_mesh(voxels_set)
            print("Successfully created Reachability Mesh in Blender.")
        except Exception as e:
            print(f"Could not create mesh: {e}")

        # The decorator is also available as an overlay
        # view_decorator.ReachabilityDecorator.install(voxels_set)
        return
    except ImportError:
        print("Not in Blender. Falling back to PyVista for standalone visualization...")

    # 2. Standalone Fallback (PyVista)
    try:
        import pyvista as pv
        cloud = pv.PolyData(voxels_set)
        voxel_mesh = cloud.glyph(
            geom=pv.Cube(),
            scale=False,
            factor=0.95
        )

        plotter = pv.Plotter(title="Reachability Analysis Results")
        plotter.add_mesh(voxel_mesh, color="lightblue", show_edges=False)
        plotter.enable_eye_dome_lighting()
        print("Opening PyVista window...")
        plotter.show()
    except ImportError:
        print(f"Found {len(voxels_set)} reachable voxels.")
        print("Hint: Install PyVista for 3D visualization outside Blender ('pip install pyvista')")

if reachable is None:
    print("Reachability computation failed or returned empty results.")
    sys.exit()

plot(reachable)
print("Done.")
