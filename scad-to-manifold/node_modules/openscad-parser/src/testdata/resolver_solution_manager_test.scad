// All ModuleInstantiationStmt should be changed to ResolvedModuleInstantiationStmt in this file


REMOTE_DIAM = 40;

/**
 * mmddd fddff
 **/
enclosure_margin = 2.5;
// mm
wall_thickness = 0.5;
pcb_thickness = 1;
bat_thickness = 5;
pcb_components_thickness = 7;

screw_hole_distance = 37 - 4.5;
scre_hole_diam = 2.5;

ledge_thickness = 1;

enclosure_height = pcb_thickness + bat_thickness + wall_thickness + pcb_components_thickness + ledge_thickness;

bevel_radius = 1;

enclosure_screw_diam = 3.15;


/**
 * Creates a cube, centered only on the XY axes.
 **/
module centercube_xy(size) {
    translate([0, 0, size.z / 2]) 
        cube(size, center = true);
    a = PI;
}

module enclosure_base() {
    difference() {
        minkowski() {
            centercube_xy([REMOTE_DIAM + enclosure_margin * 2 - bevel_radius, REMOTE_DIAM + enclosure_margin * 2 - bevel_radius, enclosure_height]);
            cylinder(r = bevel_radius, $fn = 100);
        }
        translate([0, 0, wall_thickness + bat_thickness]) 
            cylinder(d = REMOTE_DIAM, h = enclosure_height, $fn = 100);
        
        intersection() {
            translate([0, 0, wall_thickness + bat_thickness + pcb_thickness]) 
                cylinder(d = REMOTE_DIAM + 2, h = pcb_thickness + pcb_components_thickness + 3, $fn = 100);
            translate([0, -REMOTE_DIAM / 2, 0]) 
                centercube_xy([REMOTE_DIAM + enclosure_margin * 2, REMOTE_DIAM / 2, enclosure_height + 2]);
        }
        intersection() {
            translate([0, 7.5, wall_thickness]) 
                centercube_xy([REMOTE_DIAM / 2, 0.8 * REMOTE_DIAM, bat_thickness + 1]);
            
            translate([0, 0, wall_thickness - 1]) 
                cylinder(d = REMOTE_DIAM, h = pcb_thickness + pcb_components_thickness + 1, $fn = 100);
            
        }
        
        translate([-screw_hole_distance / 2, 0, wall_thickness]) 
            cylinder(d = scre_hole_diam, h = enclosure_height, $fn = 100);
        translate([screw_hole_distance / 2, 0, wall_thickness]) 
            cylinder(d = scre_hole_diam, h = enclosure_height, $fn = 100);
        
        difference() {
            
            translate([0, 0, enclosure_height - ledge_thickness]) 
                minkowski() {
                    centercube_xy([REMOTE_DIAM - bevel_radius, REMOTE_DIAM - bevel_radius, enclosure_height]);
                    cylinder(r = bevel_radius, $fn = 100);
                }
                translate([0, 0, -1]) 
                for(x = [-1, 1]) 
                for(y = [-1, 1]) 
                translate([x * REMOTE_DIAM / 2, y * REMOTE_DIAM / 2, 0]) 
                cylinder(h = enclosure_height + 5, d = enclosure_screw_diam + 3, $fn = 100);
        }
        
        translate([0, 0, -1]) 
            for(x = [-1, 1]) 
            for(y = [-1, 1]) 
            translate([x * REMOTE_DIAM / 2, y * REMOTE_DIAM / 2, 0]) 
            cylinder(h = 5, d = enclosure_screw_diam + 1.5, $fn = 100);
        translate([0, 0, -1]) 
            for(x = [-1, 1]) 
            for(y = [-1, 1]) 
            translate([x * REMOTE_DIAM / 2, y * REMOTE_DIAM / 2, 0]) 
            cylinder(h = enclosure_height + 5, d = enclosure_screw_diam, $fn = 100);
    }
    
}


enclosure_base();
