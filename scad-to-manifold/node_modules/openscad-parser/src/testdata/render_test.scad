render(convexity = 2) difference() {
 cube([20, 20, 150], center = true);
 translate([-10, -10, 0])
  cylinder(h = 80, r = 10, center = true);
 translate([-10, -10, +40])
  sphere(r = 10);
 translate([-10, -10, -40])
  sphere(r = 10);
}
