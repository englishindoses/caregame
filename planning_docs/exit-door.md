# Illustrated exit door

- Asset: `assets/images/exit_door.png`, transparent PNG, 91 x 128 pixels.
- Created using the built-in imagegen tool (not the fallback CLI).
- Production: transparent margins trimmed and image proportionally resized to 128 pixels high using System.Drawing. Original generated output is retained outside the repository.
- Display: about 68 x 96 reference pixels, with a generous 100 x 110 minimum touch area. Boot loads it and service-worker cache tcm-v17 precaches it.
- Behaviour: one child tap exits full games to Home and mini games to Care Game. Care Game exits to Home. Parent settings still use a two-second hold.

Final generation prompt:

> Create one transparent-background UI game asset: a recognisable friendly wooden door for a touch game for three-year-olds called My Plushie Friends. A single upright closed door, viewed straight-on, with a gently arched top, chunky rounded warm oak doorframe, sage-green painted door with two simple inset panels, and a large round brass knob on the right. Soft handmade toy illustration with velvety painted shading and warm cream highlights, consistent with cute plush toys and a cosy wooden toy shelf. Large simple silhouette, easy to recognise at about 64 x 90 screen pixels. Door and frame only, tightly framed with a small transparent margin. No wall, no room, no floor, no text, no arrows, no character, no white or coloured background; actual alpha transparency. Save a PNG asset.
