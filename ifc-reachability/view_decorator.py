import bpy
import gpu
from gpu_extras.batch import batch_for_shader
from bpy.types import SpaceView3D
from mathutils import Vector

class ReachabilityDecorator:
    """
    Stripped down version of GeoreferenceDecorator.
    Renders reachability points directly on the GPU.
    PROS: Fast, temporary overlay.
    CONS: Shows through walls (as warned by mentor).
    """
    is_installed = False
    handlers = []
    points = []
    color = (0.2, 0.6, 1.0, 0.8) # Transparent Blue

    @classmethod
    def install(cls, voxel_points):
        if cls.is_installed:
            cls.uninstall()
        
        handler = cls()
        # Convert numpy coordinates to Blender Vectors if needed
        handler.points = [Vector(p) for p in voxel_points]
        
        # Add the drawing handler to the 3D Viewport
        cls.handlers.append(SpaceView3D.draw_handler_add(handler.draw_points, (), "WINDOW", "POST_VIEW"))
        cls.is_installed = True
        print(f"Reachability Decorator installed: {len(handler.points)} points.")

    @classmethod
    def uninstall(cls):
        for handler in cls.handlers:
            try:
                SpaceView3D.draw_handler_remove(handler, "WINDOW")
            except ValueError:
                pass
        cls.handlers.clear()
        cls.is_installed = False
        print("Reachability Decorator uninstalled.")

    def draw_points(self):
        if not self.points:
            return

        gpu.state.blend_set("ALPHA")
        gpu.state.point_size_set(6)
        
        shader = gpu.shader.from_builtin("UNIFORM_COLOR")
        batch = batch_for_shader(shader, "POINTS", {"pos": self.points})
        
        shader.bind()
        shader.uniform_float("color", self.color)
        batch.draw(shader)
