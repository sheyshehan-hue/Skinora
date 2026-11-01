# AI face shape and style scan

A second scan next to the skin quiz. The customer takes or uploads a selfie, the browser maps 478 face
points (MediaPipe Face Landmarker), and the page shows:

- the face shape (oval, round, square, heart, long, diamond) with how strongly each one matches
- a gold overlay on the selfie: face outline, the three face sections with percentages, forehead,
  cheekbone and jaw widths, and length to width
- what stands out in the face (for example "Taller forehead, top third is 36%"), from the measurements
- haircuts ranked for that face, for women or men, filtered by hair type (straight, wavy, curly, coily).
  Each card says why it suits the person, tied to their own features and numbers, and what to ask the
  stylist for. Styles that work against their features are listed under "Maybe skip".
- fringe and parting, brows, contour and blush with a map drawn on her photo (women), beard styles (men)
- shop the look with products from the catalogue

Nothing rates a face or calls one shape ideal. The photo never leaves the device: there is no upload and
no server call. Only the shape, chosen style group and hair type are kept, in localStorage (`skd-face`).
If the face model cannot load, the customer picks their shape from outlines instead.

## Files
- `fs-engine.js` loads the model and turns landmarks into measurements, a shape mix and traits
- `fs-data.js` all the content: shapes, traits, 12 women's cuts, 12 men's cuts, 7 beards, brows, parting,
  contour and blush, hair type tips, shop the look
- `fs-ui.js` the screens, the overlay and contour map, line drawings of each style, the quiz and account hooks
- `faceshape.css`
- `build.py <site dir>` applies it to the static site. It works with or without `layer-skinscan`.

## Model files
The page loads `vendor/mediapipe/` from the site first, and falls back to jsDelivr
(`@mediapipe/tasks-vision@1.2.0` and a mirror of the official `face_landmarker.task`). The model is
checked against the official SHA-256 before it is used, whichever source it comes from. `build.py`
downloads the files into `./vendor/` (git-ignored, about 18 MB) and copies them into the site.
For the live store, keep them self-hosted so the scan does not depend on a CDN.
