// Complex model exercising CSG, modules, functions, and loops
x = 20;

function edge(v) = v * 2;

module my_part(size) {
    translate([size, 0, 0]) cube(size);
}

// Loop generating translated spheres
for (i = [0:5:20]) {
    translate([i, 0, i]) sphere(r=2, $fn=8);
}

// Boolean difference
difference() {
    cube(size=10, center=true);
    sphere(r=7, $fn=12);
}

// Boolean intersection
intersection() {
    cube(size=10, center=true);
    sphere(r=7, $fn=12);
}

// Hull of two cubes
hull() {
    cube(2);
    translate([8, 0, 0]) cube(2);
}

// Union + cone
union() {
    cylinder(h=6, r1=2, r2=1, center=true, $fn=8);
    translate([0, 0, -5]) cube(3, center=true);
}

// Custom module call
my_part(5);
