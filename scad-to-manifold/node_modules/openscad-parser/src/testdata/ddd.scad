outer_radius = 32;
inner_radius = 30;
depth = 60;
bearing_depth = 7;
bearing_outer_radius = 11;
backwall_thickness = 2;
shaft_radius = 4;

inlet_outer_radius = 5;
inlet_inner_radius = 3;

lock_tooth_depth = 1.5;
lock_tooth_width = 10;
lock_tooth_inner_cut_radius = inner_radius - 2;

lock_tooth_offset_angle = 30;
lock_tooth_slack = 0.2;

exhaust_hole_radius = 2;
exhaust_hole_distance = 3.5;

// water collection basin
wcb_depth = 6;
wcb_radius = 21;
wcb_wall_thickness = backwall_thickness;

// water collection pipe
wcp_radius = 3.2;

$fn = 128; // cylinder resolution

part = "";

module enclosure() union() {
    if(true) difference() {

        // hull
        union() {
            cylinder(h=depth, r=outer_radius);
            // stand cube
            color([1, 1, 0]) translate([-outer_radius, -outer_radius, 0]) cube([outer_radius * 2, outer_radius, depth]); 
            translate([0.75 * outer_radius, 0, 0.5 * depth]) rotate([90, 0, 180]) cylinder(r = inlet_outer_radius, h = 1.5 * outer_radius);

            // // wcb inner wall
            // color("red") difference() {
            //     color("green") translate([0, 0, -wcb_depth]) cylinder(h = wcb_depth, r = bearing_outer_radius + 1 + wcb_wall_thickness);
            //     translate([0, 0, -wcb_depth - 1]) cylinder(h = wcb_depth + 1, r = bearing_outer_radius + 1);
            // }
            // // wcb outer wall
            // difference() {
            //     color("green") translate([0, 0, -wcb_depth]) cylinder(h = wcb_depth, r = wcb_radius);
            //     translate([0, 0, -wcb_depth - 1]) cylinder(h = wcb_depth + 1, r = wcb_radius - wcb_wall_thickness);
            //     rotate([0, 0, -45]) translate([-wcp_radius, -wcb_radius, -wcb_depth + backwall_thickness]) cube([wcp_radius * 2, outer_radius - bearing_outer_radius * 1,  wcb_depth]);
            // }

           
            
            // // wcb lid
            // color([1, 0, 0, 0.5]) difference() {
            //     color("green") translate([0, 0, -wcb_depth]) cylinder(h = backwall_thickness, r = wcb_radius);
            //     translate([0, 0, -wcb_depth - 1]) cylinder(h = backwall_thickness + 2, r = bearing_outer_radius + 1 );
            // }
            
            // color("pink") translate([-outer_radius + wcp_radius + 3, -outer_radius + wcp_radius + 3, -wcb_depth]) {
            //     difference() {
            //         union() {
            //             cylinder(h = wcb_depth, r = wcp_radius + backwall_thickness);
            //             rotate([0, 0, -45]) translate([-wcb_depth / 2, 0, 0]) cube([wcp_radius * 2, outer_radius - bearing_outer_radius * 1.4, wcb_depth + backwall_thickness]);
            //         }
            //        rotate([0, 0, -45]) translate([-wcb_depth / 2 + backwall_thickness / 2, 0, backwall_thickness]) cube([wcp_radius * 2 - 1 * backwall_thickness, outer_radius - bearing_outer_radius * 1.4, wcb_depth ]);
            //         translate([0, 0, 2]) cylinder(h = wcb_depth - 2, r = wcp_radius);
            //     }
            // }
            // rotate([0, 0, -45]) translate([-wcb_depth / 2, -backwall_thickness, 2]) cube([wcp_radius * 2 - backwall_thickness * 2, outer_radius - bearing_outer_radius * 1.4, wcb_depth - 2]);
             
        }

        // // wcp
        // color("blue") translate([-outer_radius + wcp_radius + 3, -outer_radius + wcp_radius + 3, -1]) {
        //     cylinder(h = depth + backwall_thickness + lock_tooth_depth - 1, r = wcp_radius);
        // }

        //  // wcp
        // color("blue") translate([outer_radius - wcp_radius - 3, -outer_radius + wcp_radius + 3, -1]) {
        //     cylinder(h = depth + backwall_thickness + lock_tooth_depth - 1, r = wcp_radius);
        // }


        // inside
        translate([0, 0, backwall_thickness + bearing_depth]) {
            cylinder(h = depth, r=inner_radius);
        }

        
        translate([0, 0, -1]) {
            // bearing hole
            cylinder(h = bearing_depth + 1, r=bearing_outer_radius);
            
            // shaft hole
            cylinder(h = 2000, r=shaft_radius + 1);
        }

        // inlet inside
        translate([0.75*outer_radius, 1, 0.5 * depth]) rotate([90, 0, 180]) cylinder(r = inlet_inner_radius, h = 1.5 * outer_radius);

        for(angle = [0 : 60 : 360]) rotate([0, 0, angle]) translate([0, bearing_outer_radius + exhaust_hole_radius + exhaust_hole_distance, -1]) cylinder(r = exhaust_hole_radius, h = bearing_depth + backwall_thickness + 5);
        
    }
    // lock tools
    color("cyan")  intersection() {
        difference() {
            for(angle = [0 : 60 : 360]) {
                rotate([0, 0, angle]) translate([-outer_radius, -lock_tooth_width / 2, depth - lock_tooth_depth]) cube([outer_radius * 2, lock_tooth_width, lock_tooth_depth]);
            }
            cylinder(h = depth + 50, r=lock_tooth_inner_cut_radius);
        }
        translate([0, 0, depth - lock_tooth_depth - 1]) cylinder(h = lock_tooth_depth + 1, r=inner_radius);
    }
}

module lid() difference() {
    translate([0, 0, -lock_tooth_depth - lock_tooth_slack]) rotate([0, 0, lock_tooth_offset_angle]) union() {
        color("red")  intersection() {
            difference() {
                for(angle = [0 : 60 : 360]) {
                    rotate([0, 0, angle]) translate([-outer_radius, -lock_tooth_width / 2, depth - lock_tooth_depth]) cube([outer_radius * 2, lock_tooth_width, lock_tooth_depth]);
                }
            }
            translate([0, 0, depth - lock_tooth_depth - 1]) cylinder(h = lock_tooth_depth + 1, r=inner_radius);
        }
        color("gray") {
            translate([0, 0, depth - lock_tooth_depth]) cylinder(h = 2 *lock_tooth_depth + lock_tooth_slack, r = lock_tooth_inner_cut_radius);
            translate([0, 0, depth - lock_tooth_depth + 2 * lock_tooth_depth + lock_tooth_slack]) cylinder(h = backwall_thickness, r = outer_radius);
        // translate([0, 0, depth - lock_tooth_depth + 2 * lock_tooth_depth + lock_tooth_slack + backwall_thickness]) cylinder(h = bearing_depth, r = bearing_outer_radius * 1.2);
        }
        translate([0, 0, depth - lock_tooth_depth * 2]) cylinder(h = bearing_depth + 1, r = bearing_outer_radius + 3);

        for(angle = [0 : 60 : 360]) rotate([0, 0, angle]) translate([0, bearing_outer_radius + 10, depth]) cylinder(r = 3, h = bearing_depth - lock_tooth_depth - 0.5);
    }

    // bearing hole
    translate([0, 0, depth - lock_tooth_depth * 2]) cylinder(h = bearing_depth + 1, r = bearing_outer_radius);
            
    // shaft hole
    cylinder(h = 2000, r=shaft_radius + 1);
}


module shaft_coupler() {
    translate([0, 0, depth + bearing_depth + backwall_thickness]) {
        difference() {
            cylinder(r = shaft_radius + 1, h = 20);
            translate([0, 0, -1]) cylinder(r = shaft_radius, h = 10 + 2);
            translate([0, 0, 10]) cylinder(r = 1, h = 10 + 2);
        }
    }
}

module motor_holder() {
    color("lightblue")
    translate([0, 0, depth + bearing_depth + backwall_thickness + 20]) {
        difference() {
            translate([-15, -(outer_radius), 0]) cube([30, outer_radius + 10, 10]);
            translate([0, 0, -1]) {
                intersection() {
                        cylinder(r = 10.3, h = 30);
                        cube([21, 15.2, 50], center = true);
                
                }
            }
            translate([-10, -outer_radius / 2 - 13, -1]) cube([20, outer_radius - 15, 20]);
        }
    }
    

}

module base() {
    color("green")
    difference() {
        translate([-outer_radius - 3, -outer_radius - 3, -3]) cube([outer_radius * 2 + 6, 7, depth + 50]);
        translate([-outer_radius, -outer_radius, -.04]) cube([outer_radius * 2 + 0.4, outer_radius, depth + 0.8]); 
        translate([0, 0, depth + bearing_depth + backwall_thickness + 20]) 
        translate([-15, -(outer_radius), 0]) cube([30, outer_radius + 10, 10]);
        translate([-outer_radius * 1.5 / 2, -outer_radius, depth - 1]) cube([outer_radius * 1.5 + 0.4, outer_radius * 0.5, 5]); 
    }
}



if (part == "enclosure") {
    enclosure();
} else if (part == "lid") {
    lid();
} else {
    enclosure();
    lid();
    motor_holder();
   shaft_coupler();
   base();
   
}