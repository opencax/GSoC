// Complex OpenSCAD model
x = 20;

module my_part(size, color) {
    // This part is mocked for now in the compiler but the logic remains
    translate([size, 0, 0]) cube(size);
}

// Simple loop
for (i = [0:5:20]) {
    translate([i, 0, i]) sphere(r=2);
}

// Intersection test
intersection() {
    cube(size=10, center=true);
    sphere(r=7);
}
