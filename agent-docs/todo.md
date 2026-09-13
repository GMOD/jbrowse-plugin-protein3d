- autoscrolling weird, hard to know best behavior

- first click on the cascadingmenubutton for autoscrolling goes off screen to
  right, second click loads menu correctly

- a declared selection is framed on load (`frameSelection.ts`, 2026-09-13), a
  clicked one still is not: `setClickedStructureRange` lights it and leaves the
  camera where it was. A `focusResidue(n)` that sets the selection and moves the
  camera to it would let an agent driving the view say "show me this one". From
  the jbrowse-components protein filmed take, 2026-09-02.
