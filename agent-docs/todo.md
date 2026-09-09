- autoscrolling weird, hard to know best behavior

- first click on the cascadingmenubutton for autoscrolling goes off screen to
  right, second click loads menu correctly

- selecting a residue highlights it but never frames it.
  `setClickedStructureRange` lights the selection and `initialSelection` seeds
  it declaratively, but nothing touches the molstar camera, so a residue on the
  far side of the structure stays hidden behind the fold. A `focusResidue(n)`
  that sets the selection and moves the camera to it would finish the pair — an
  agent driving the view has no way to say "show me this one" today. From the
  jbrowse-components protein filmed take, 2026-09-02.
