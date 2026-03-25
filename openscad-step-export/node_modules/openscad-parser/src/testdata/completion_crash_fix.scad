pole_diameter = 27.5;
ring_width = 4;
ring_height = 13;

teeth_spacing = 2;
teeth_size = 0.5;

gap_width = 4;

module ring() {
    $fn = 100;
    union() {
        difference() {
            cylinder(h = ring_height, d = pole_diameter + 2 * ring_width);
            translate([0, 0, -1]) {
                cylinder(h = ring_height + 2, d = pole_diameter);
            }
        }
        
        for(ang = [0 : 360 / ((PI * pole_diameter) / teeth_spacing) : 355]) {
            rotate([0, 0, ang]) 
                translate([0, pole_diameter / 2, 0]) 
                //     rotate([0, 0, ang]) 
                rotate([0, 0, 45]) 
                translate([-teeth_size / 2, -teeth_size / 2]) 
                cube([teeth_size, teeth_size, ring_height]);
        }
    }
}

* difference() {
    ring();
    translate([-gap_width / 2, 0, -1]) 
        cube([gap_width, pole_diameter, ring_height + 2]);
}


circle(d )