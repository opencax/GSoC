difference() {
    cube(10, center = true);
    translate([0, 0, 5]) {
        rotate([0, 90, 0]) {
            cylinder(r = 2, h = 20, center = true, $fn = 40);
        }
        * rotate([90, 0, 0]) {
            # cylinder(r = 2, h = 20, center = true, $fn = 40);
        }
    }
}
