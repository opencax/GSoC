function convexhull2d(points) = 
    len(points) < 3 ? [] : let(
        a = 0, b = 1, 
        
        c = find_first_noncollinear([a, b], points, 2)
    
    ) c == len(points) ? convexhull_collinear(points) : let(
        
        remaining = [for(i = [2 : len(points) - 1]) if(i != c) i], 
        
        polygon = area_2d(points[a], points[b], points[c]) > 0 ? [a, b, c] : [b, a, c]
    
    ) convex_hull_iterative_2d(points, polygon, remaining);


x = 0 ? 1 : let(a = 5) a;


