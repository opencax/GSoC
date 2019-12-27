<!-- template for GSoC project ideas
     feel free to remove optional sections when you have no content for them
     and remove comments before submitting
-->
## Outline
Implement the beginnings of a new GUI for BRL-CAD!

## Details
BRL-CAD has two main graphical applications called 'mged' and 'archer' which look like they were developed in the 80's and 90's respectively (because they were). We need a modern GUI, ideally using Qt.

This new GUI will need to leverage our existing libraries in a big way. This includes the C++ coreInterface ( see https://brlcad.org/wiki/Object-oriented_interfaces ) and LIBGED (see src/libged). The latter is basically all commands available to both mged and archer.

You'll need to propose some way for displaying geometry, e.g. wireframes or triangles via OpenGL or real-time ray tracing via Intel OSPRay+LIBRT. It must work on BRL-CAD's .g files. It must be able to open a .g file, display geometry interactively, and run commands.

We are looking for a modern GUI design. You can use the results of the former prototype CAD GUI Google Code-in tasks (http://brlcad.org/gci/data/uncategorized/, search for CAD_GUI there) for inspiration.

Keep your proposal lean and simple. The main emphasis should be on the creation of an application "outline" describing what menus, buttons, dialogs, etc. you will target first.

## Expected Outcome
A minimal functionally complete new GUI!


## Project Properties

### Skills
-C/C++
-Qt

### Difficulty <!-- easy, medium, hard -->
medium
### Additional Information

* Potential mentor(s): [Daniel Rossberg](devs@brlcad.org)
[Sean Morrison](devs@brlcad.org)
* Organization website: https://brlcad.org
* Communication channels: https://brlcad.zulipchat.com
