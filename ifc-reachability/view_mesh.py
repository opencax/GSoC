import bpy
import bmesh
from mathutils import Matrix

def create_reachability_mesh(points, voxel_size=0.2):
    """
    Creates a real Blender object with meshes for each voxel.
    Follows Dion's recommendation for selectable/hidable objects.
    PROS: Proper depth (hidden by walls), selectable, stays in file.
    """
    print("Generating Reachability Mesh...")
    
    # Check if object already exists and remove it to refresh
    if "Reachability_Map" in bpy.data.objects:
        old_obj = bpy.data.objects["Reachability_Map"]
        bpy.data.objects.remove(old_obj, do_unlink=True)

    mesh = bpy.data.meshes.new("ReachabilityMesh")
    obj = bpy.data.objects.new("Reachability_Map", mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    
    # Efficiently create many cubes in one mesh
    for p in points:
        bmesh.ops.create_cube(
            bm, 
            size=voxel_size * 0.9, 
            matrix=Matrix.Translation(p)
        )

    bm.to_mesh(mesh)
    bm.free()
    
    # Create and assign a transparent blue material
    mat_name = "ReachabilityMaterial"
    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.0, 0.4, 0.8, 1.0)
        bsdf.inputs["Alpha"].default_value = 0.5
    
    mat.blend_method = 'BLEND'
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    
    return obj
