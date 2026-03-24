// Prelude contains all the buit-in modules, functions and variables

// Some texts were copied from the OpenScad wiki and are licensed under the  Creative Commons Attribution-ShareAlike License.

//
// Control flow and intrinsic modules
//

/**
 * Evaluate each value in a range or vector, applying it to the following Action.
 *
 * @intrinsic controlFlow
 * @intrinsicRename for
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Conditional_and_Iterator_Functions#For_loop
 **/
module _for();

// Iterate over the values in a range or vector and create the intersection of objects created by each pass. 
// @intrinsic controlFlow
// @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Conditional_and_Iterator_Functions#Intersection_For_Loop
module intersection_for();

/**
 *  Prints the value of the passed parameters to the console.
 *
 *  @intrinsicRename echo
 **/
module _echo();

// 
// 2D
// 

/**
 * Generates a circle at the origin.
 *
 * @param r [positional] [type=number] the radius of the circle
 * @param d [named] [conflictsWith=r] [type=number] the diameter of the circle
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Using_the_2D_Subsystem#circle
 **/
module circle(r = radius, d = diameter);

/**
 * Generates a square or a rectangle.
 * If center is `false` it is placed in the first quadrant (positive XY), if center is set to `true` it is centered at the origin.
 *
 * @param size [positional] [type=number,vector] The size of the square. Can be a two-dimensional vector [x, y] for a rectangle, or a number for a square.
 * @param center [positional] [type=bool] When set to true the rectangle is placed with the center at the origin of the coordinate system.
 **/
module square(size = [x, y], center = true/false);

/**
 * Creates a multiple sided shape from a list of x, y coordinates.
 *
 * @param points [positional] [type=vector] The list of x, y points of the polygon, a vector of 2 element vectors.
 * @param paths [positional] [type=vector] The order to traverse the points. Uses indices from 0 to n-1. May be in a different order and use all or part, of the points listed. May be in a different order and use all or part, of the points listed.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Using_the_2D_Subsystem#polygon
 **/
module polygon(points, paths);

/**
 * Creates text as a 2D geometric object, using fonts installed on the local system or provided as separate font file.
 *
 * @param text [required] [positional] [type=string] The text to generate.
 * @param size [named] [type=number] The generated text has an ascent (height above the baseline) of approximately the given value. Default is 10. Different fonts can vary somewhat and may not fill the size specified exactly, typically they render slightly smaller.
 * @param font [named] [type=string] The name of the font that should be used. This is not the name of the font file, but the logical font name (internally handled by the fontconfig library).
 * @param halign [named] [type=string] [possibleValues=left,right,center] The horizontal alignment for the text.
 * @param valign [named] [type=string] [possibleValues=baseline,top,center,bottom] The vertical alignment for the text.
 * @param spacing [named] [type=number] Factor to increase/decrease the character spacing. The default value of 1 results in the normal spacing for the font, giving a value greater than 1 causes the letters to be spaced further apart.
 * @param direction [named] [type=string] [possibleValues=ltr,rtl,ttb,btt] Direction of the text flow.
 * @param language [named] [type=string] The language of the text.
 * @param script [named] [type=string] The script of the text. Default is "latin".
 * @param $fn [named] [type=number] Used for subdividing the curved path segments provided by freetype
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Text
 **/
module text(text, size = 10, font, halign = "left", valign = "baseline", spacing = 1, direction = "ltr" , language = "en", script = "latin");

/**
 * Using the projection() function, you can create 2d drawings from 3d models, and export them to the dxf format. It works by projecting a 3D model to the (x,y) plane, with z at 0. If cut=true, only points with z=0 are considered (effectively cutting the object), with cut=false(the default), points above and below the plane are considered as well (creating a proper projection). 
 * 
 * @param cut [positional] [type=boolean] If set to true only points with z=0 are considered.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Using_the_2D_Subsystem#3D_to_2D_Projection
 */
module projection(cut = false);

// 
// 3D Solids
// 

/**
 * Creates a sphere at the origin of the coordinate system.
 *
 * @param r [positional] [type=number] This is the radius of the sphere.
 * @param d [named] [type=number] [conflictsWith=r] This is the diameter of the sphere.
 * @param $fa [named] [type=number] Fragment angle in degrees
 * @param $fs [named] [type=number] Fragment size in mm
 * @param $fn [named] [type=number] Resolution
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Primitive_Solids#sphere
 **/
module sphere($fn = 0, $fa = 12, $fs = 2, r = 1);

/**
 * Creates a cube in the first octant.
 *
 * @param size [positional] [type=vector,number] Three value array [x,y,z], cube with dimensions or single value, cube will be with all sides this length.
 * @param center [positional] [type=boolean] When center is true, the cube is centered on the origin.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Primitive_Solids#cube
 **/
module cube(size = [1, 1, 1], center = false);

/**
 * Creates a cylinder or cone centered about the z axis.
 *
 * @param h [positional] [type=number] The height of the cylinder or cone
 * @param r [positional] [type=number] This is the radius of the cylinder. r2 = r1 = r
 * @param r1 [positional] [type=number] [conflictsWith=r] This is the radius of the bottom of the cone. 
 * @param r2 [positional] [type=number] [conflictsWith=r] This is the radius of the top of the cone. 
 * @param d [named] [type=number] [conflictsWith=r] This is the diameter of the cylinder. 
 * @param d1 [named] [type=number] This is the diameter of the bottom of the cone. 
 * @param d2 [named] [type=number] This is the diameter of the top of the cone. 
 * @param center [positional] [type=boolean]  When center is true, it is also centered vertically along the z axis.
 * @param $fa [named] [type=number] Minimum angle (in degrees) of each fragment.
 * @param $fs [named] [type=number] Minimum circumferential length of each fragment.
 * @param $fn [named] [type=number] Fixed number of fragments in 360 degrees. Values of 3 or more override $fa and $fs 
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Primitive_Solids#cylinder
 **/
module cylinder($fn = 0, $fa = 12, $fs = 2, h = 1, r1 = 1, r2 = 1, center = false);

module polyhedron(points = undef, faces = undef, convexity = 1);

/**
 * Imports a file for use in the current OpenSCAD model. The file extension is used to determine which type.
 *
 * @param file [positional] [required] [type=string] A string containing the path to file. If the give path is not absolute, it is resolved relative to the importing script.
 * @param convexity [named] [type=number] The convexity parameter specifies the maximum number of front sides (back sides) a ray intersecting the object might penetrate. This parameter is needed only for correctly displaying the object in OpenCSG preview mode.
 * @param layer [named] [type=string] For DXF import only, specify a specific layer to import.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Importing_Geometry#import
 **/
module import(file = "");

/**
 * Extrudes a 2D object along the Z axis. The extrusion is always performed on the projection (shadow) of the 2d object xy plane.
 *
 * @param height [type=number] [positional] The height of the extrusion. Must be positive.
 * @param center [type=boolean] [positional] If set to true, the extrusion Z range is from -height/2 to height/2.
 * @param convexity [type=number] [positional] Specifies the maximum number of front sides (back sides) a ray intersecting the object might penetrate. 
 * @param twist [type=number] [positional] Twist is the number of degrees of through which the shape is extruded. Setting the parameter twist = 360 extrudes through one revolution.  The twist direction follows the left hand rule.
 * @param slices [type=number] [positional] Defines the number of intermediate points along the Z axis of the extrusion. Increases with the value of twist by default.
 * @param scale [type=number,vector] [positional] Scales the 2D shape by this value over the height of the extrusion.
 * @param $fa [named] [type=number] Minimum angle (in degrees) of each fragment.
 * @param $fs [named] [type=number] Minimum circumferential length of each fragment.
 * @param $fn [named] [type=number] Fixed number of fragments in 360 degrees. Values of 3 or more override $fa and $fs.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Using_the_2D_Subsystem#Linear_Extrude
 **/
module linear_extrude(height, center, convexity, twist, slices);

/**
 * Spins a 2D shape around the Z-axis to form a solid which has rotational symmetry. 
 *
 * @param angle [positional] [type=number]  Specifies the number of degrees to sweep, starting at the positive X axis. The direction of the sweep follows the Right Hand Rule.
 * @param convexity [type=number] [positional] Specifies the maximum number of front sides (back sides) a ray intersecting the object might penetrate. 
 * @param $fa [named] [type=number] Minimum angle (in degrees) of each fragment.
 * @param $fs [named] [type=number] Minimum circumferential length of each fragment.
 * @param $fn [named] [type=number] Fixed number of fragments in 360 degrees. Values of 3 or more override $fa and $fs 
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Using_the_2D_Subsystem#Rotate_Extrude'
 **/
module rotate_extrude(angle, convexity);
// Transformation modules
//

/**
 * Translates (moves) its child elements along the specified vector.
 *
 * @param v [positional] [type=vector] The vector used to move the object.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#translate
 **/
module translate(v = [x, y, z]);

/**
 * Rotates its child 'a' degrees about the axis of the coordinate system or around an arbitrary axis.
 *
 * @param a [positional] [type=vector,number] When 'a' is a vector specifies multiple axes then the rotation is applied in the following order: x, y, z. When a is a number it specifies one angle.
 * @param v [positional] [type=vector] The axis to rotate about when 'a' is a number.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#rotate
 **/
module rotate(a = 0, v = [x, y, z]);

/**
 * Scales its child elements using the specified vector.
 *
 * @param v [positional] [type=vector] The vector to use.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#scale
 **/
module scale(pos = [x, y, z]);

/**
 * Modifies the size of the child object to match the given x, y, and z in newsize.  
 * It is a CGAL operation, and like others such as render() operates with full geometry, so even in preview this takes time to process. 
 *
 * @param newsize [positional] [type=vector] The size of the bounding box.
 * @param auto [positional] [type=boolean,vector] A boolean or vector of booleans for each axis. If set to true,  it auto-scales any 0-dimensions to match.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#resize
 **/
module resize(newsize = [x, y, z], auto = false) 

/**
 * Mirrors the child element on a plane through the origin.
 *
 * @param v [positional] [type=vector] The normal vector of a plane intersecting the origin through which to mirror the object. 
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#mirror
 **/
module mirror(pos = [x, y, z]);

/**
 * Multiplies the geometry of all child elements with the given affine transformation matrix, where the matrix is 4×3 - a vector of 3 row vectors with 4 elements each, or a 4×4 matrix with the 4th row always forced to [0,0,0,1]. 
 *
 * @param [positional] [type=vector] The matirx to multiply with.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#multmatrix
 **/
module multmatrix(m);

/**
 * Displays the child elements using the specified RGB color + alpha value.
 * This is only used for the F5 preview as CGAL and STL (F6) do not currently support color.
 *
 * @param c [positional] [type=vector,string] The color name or hex string or a vector of values limited to floating point values in the range [0,1]
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#color
 **/ 
module color(c = [1, 1, 1, 1], alpha = 1);

/**
 * Displays the convex hull of child nodes. 
 *
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#hull
 **/
module hull();

/**
 * Offset generates a new 2d interior or exterior outline from an existing outline. 
 * There are two modes of operation. radial and offset. 
 * The offset method creates a new outline who's sides are a fixed distance outer (delta > 0) or inner (delta < 0) from the original outline. The radial method creates a new outline as if a circle of some radius is rotated around the exterior (r>0} or interior (r<0) original outline. 
 *
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#offset
 **/
module offset(r = 1, delta = 1, chamfer = false);

/**
 *  Displays the minkowski sum of child nodes.
 *
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Transformations#minkowski
 **/
module minkowski();

/**
 * Makes OpenScad generate a mesh even in preview mode. 
 * This is  useful, when the boolean operations become too slow to track.
 *
 * @param convexity [type=number] [positional] Specifies the maximum number of front sides (back sides) a ray intersecting the object might penetrate.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Other_Language_Features#Render
 **/
module render(convexity = 1);

/**
 * Reads Heightmap information from text or image files.
 *
 * @param file [positional] [type=string] The file name to read from. Can be a text file or PNG image.
 * @param center [positional] [type=boolean] If true, the heightmap is centered on the origin.
 * @param invert [positional] [type=boolean] Inverts how the color values of imported images are translated into height values. This has no effect when importing text data files.
 * @param convexity [positional] [type=number] Specifies the maximum number of front sides (back sides) a ray intersecting the object might penetrate.
 * https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Other_Language_Features#Surface
 **/
module surface(file, center = false, invert = false, convexity = 1);
 
// 
// Constants
// 

/**
 * An approximation of the π mathematical constant. 
 * It is defined in Euclidean geometry[a] as the ratio of a circle's circumference to its diameter.
 *
 * @see https://en.wikipedia.org/wiki/Pi
 **/
PI = 3.141592653589793;

//
// Boolean operations
//

/**
 * Creates a union of all its child nodes. This is the sum of all children (logical or).
 * May be used with either 2D or 3D objects, but don't mix them.
 *
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/CSG_Modelling#union
 **/
module union();

/**
 * Subtracts the 2nd (and all further) child nodes from the first one (logical and not).
 * May be used with either 2D or 3D objects, but don't mix them. 
 *
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/CSG_Modelling#difference
 **/
module difference();

/**
 * Creates the intersection of all child nodes. This keeps the overlapping portion (logical and). 
 * Only the area which is common or shared by all children is retained.
 *
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/CSG_Modelling#intersection
 **/
module intersection();


//
// Type test functions
// 

/**
 * Checks whether the passed value is undef.
 *
 * @param val The value to check
 * @returns Whether `val` is undef.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Type_Test_Functions#is_undef
 **/
function is_undef(val) = undef;

/**
 * Checks whether the passed value is a boolean (true, false).
 *
 * @param val the value to check.
 * @returns Whether `val` is undef.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Type_Test_Functions#is_bool
 **/
function is_bool(val) = undef;

/**
 * Checks whether the passed value is a number (including infinity).
 *
 * @param val the value to check.
 * @returns Whether `val` is a number.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Type_Test_Functions#is_num
 **/
function is_num(val) = undef;

/**
 * Checks whether the passed value is a string.
 *
 * @param val the value to check.
 * @returns Whether `val` is a string.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Type_Test_Functions#is_string
 **/
function is_string(val) = undef;

/**
 * Checks whether the passed value is a list (vector).
 *
 * @param val the value to check.
 * @returns Whether `val` is a list.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Type_Test_Functions#is_list
 **/
function is_list(val) = undef;

// 
// General functions
// 

/**
 * Generates a new vector that is the result of appending the elements of the supplied vectors.
 * @returns a new vector that is the result of appending the elements of the supplied vectors. 
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#concat
 **/
function concat(a1, a2, a3, a4, a5, a6, a7) = undef;

/**
 * Look up value in table, and linearly interpolate if there's no exact match.
 * @param key [positional] The value to look up. 
 * @param tab [positional] [type=vector] The lookup table -- a vector of key-value pairs.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#lookup
 **/
function lookup(key, tab) = undef;

/**
 * Converts all passed arguments and concatenates them.
 *
 * @returns A string created by concatenating the arguments.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/String_Functions#str
 **/
function str(a1, a2, a3, a4, a5, a6, a7) = undef;
function chr(a) = undef;

/**
 * Convert the first character of the given string to a Unicode code point.
 * @param str [positional] [type=string] The character to take the unicode code point for.
 **/
function ord(str) = undef;
function search() = undef;
function version() = undef;
function version_num() = undef;

function parent_module(idx) = undef;

// 
// Mathematical functions
//

/**
 * Mathematical absolute value function. Returns the positive value of a signed decimal number. 
 *
 * @param x [positional] [type=number] The value to remove the minus from.
 * @returns The absolute value.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#abs
 **/
function abs(x) = undef;

/**
 * Mathematical signum function. 
 *
 * @param x [positional] [type=number] Value to find the sign of
 * @returns unit value that extracts the sign of the passed value. It is 1, 0, or -1.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#sign
 **/
function sign(x) = undef;

/**
 * Mathematical sine function.
 * Relates an angle of a right-angled triangle to ratios of the opposite to the hypotenuse.
 * @param x [positional] [type=number] Angle in degrees.
 * @returns A number from -1 to 1
 * @see https://en.wikipedia.org/wiki/Trigonometric_functions#Right-angled_triangle_definitions
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#sin
 **/
function sin(x) = undef;

/**
 * Mathematical cosine function.
 * Relates an angle of a right-angled triangle to ratios of the adjacent to the hypotenuse.
 * @param x [positional] [type=number] Angle in degrees.
 * @returns A number from -1 to 1
 * @see https://en.wikipedia.org/wiki/Trigonometric_functions#Right-angled_triangle_definitions
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#sin
 **/
function cos(x) = undef;

/**
 * Mathematical tangent function.
 * Relates an angle of a right-angled triangle to ratios of the opposite to the adjacent.
 *
 * @param x [positional] [type=number] Angle in degrees.
 * @returns A number
 * @see https://en.wikipedia.org/wiki/Trigonometric_functions#Right-angled_triangle_definitions
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#tan
 **/
function tan(x) = undef;

/**
 * Mathematical arccosine, or inverse cosine, expressed in degrees.
 *
 * @param x [positional] [type=number] Value between -1 and 1.
 * @returns Angle in degrees.
 * @see https://en.wikipedia.org/wiki/Inverse_trigonometric_functions
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#acos
 **/
function acos(x) = undef;

/**
 * Mathematical arcsine, or inverse sine, expressed in degrees.
 *
 * @param x [positional] [type=number] Value between -1 and 1.
 * @returns Angle in degrees.
 * @see https://en.wikipedia.org/wiki/Inverse_trigonometric_functions
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#asin
 **/
function asin(x) = undef;

/**
 * Mathematical arctangent, or inverse tangent, expressed in degrees.
 *
 * @param x [positional] [type=number] Value between -1 and 1.
 * @returns Angle in degrees.
 * @see https://en.wikipedia.org/wiki/Inverse_trigonometric_functions
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#atan
 **/
function atan(x) = undef;

/**
 * Mathematical two-argument atan function atan2(y,x) that spans the full 360 degrees. 
 * This function returns the full angle (0-360) made between the x axis and the vector(x,y) expressed in degrees. 
 *
 * @param y [positional] [type=number] Y coordinate of the vector.
 * @param x [positional] [type=number] X coordinate of the vector.
 * @returns Angle in degrees.
 * @see https://en.wikipedia.org/wiki/Atan2
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#atan2
 **/
function atan2(x, y) = undef;

/**
 * Mathematical floor function. 
 * floor(x) is the largest integer not greater than x
 *
 * @param x [positional] [type=number] Value to round down.
 * @returns The largest integer not greater than x.
 */
function floor(x) = undef;

/**
 * The "round" operator returns the greatest or least integer part, respectively, if the numeric input is positive or negative.
 *
 * @param x [positional] [type=number] Value to round.
 * @returns The greatest or least integer part, respectively, if the numeric input is positive or negative.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#round
 **/
function round(x) = undef;

/**
 * Mathematical ceiling function.
 * Returns the next highest integer value by rounding up value if necessary.
 * @param x [positional] [type=number] The number to round.
 * @returns The next highest integer value by rounding up `x` if necessary.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#ceil
 **/
function ceil(x) = undef;

/**
 * Mathematical natural logarithm (logarithm of base e).
 *
 * @param x [positional] [type=number] The number to calculate the logarithm from. 
 * @returns The logarithm.
 * @see https://en.wikipedia.org/wiki/Natural_logarithm
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#ln
 **/
function ln(x) = undef;

/**
 * Calculates the length of an array, a vector or a string parameter. 
 * @param x [positional] [type=vector,string] The vector or string
 * @returns the length of an array, a vector or a string parameter.
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#len
 **/
function len(x) = undef;

/**
 * Mathematical logarithm function to the base 10. It is the inverse function to exponentiation.
 *
 * @param x [positional] [type=number] The number to calculate the base 10 logarithm of
 * @returns The logarithm
 * @see https://en.wikipedia.org/wiki/Logarithm
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#log
 **/
function log(x) = undef;

/**
 * Mathematical power function. Exponentiates `b` to the power of `e`.
 * As of version 2021.01 you can use the exponentiation operator ^ instead.
 * 
 * @param b [positional] [type=nunber] The base
 * @param e [positional] [type=number] The exponent
 * @returns b^e
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#pow
 **/
function pow(b, e) = undef;

/**
 * Mathematical square root function.
 *
 * @param x [positional] [type=number] The number to calculate the square root of.
 * @returns the square root of x
 * @see https://en.wikipedia.org/wiki/Square_root
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#sqrt
 **/
function sqrt(x) = undef;
function exp(x) = undef;
function rands(x) = undef;
function min(x) = undef;
function max(x) = undef;

/**
 * Calculates the numeric length of a vector (length in space).
 *
 * @param x [positional] [type=vector] The vector to calculate the length
 * @returns the euclidean norm of a vector
 * @see https://en.wikipedia.org/wiki/Norm_(mathematics)#Euclidean_norm
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#norm
 **/
function norm(x) = undef;

/**
 * Calculates the cross product of two vectors in 3D or 2D space.
 * If both vectors are in the 3D, the result is a vector that is perpendicular to both of the input vectors.
 * If both vectors are in 2D space, their cross product has the form [0,0,z] and the cross function returns just the z value of the cross product.
 *
 *  Using any other types, vectors with lengths different from 2 or 3, or vectors not of the same length produces 'undef'. 
 * @param a [positional] [type=vector] The first vector of the cross product.
 * @param b [positional] [type=vector] The second vector of the cross product.
 * @returns The cross product or undef (if the arguments are wrong).
 * @see https://en.wikibooks.org/wiki/OpenSCAD_User_Manual/Mathematical_Functions#cross
 **/
function cross(a, b) = undef;
