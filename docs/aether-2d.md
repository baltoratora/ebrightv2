# Aether 2D conversion

Atelier now uses original layered SVG anime artwork (`Character2D.tsx`) for Male and Female characters, hair, skin/eye/clothing colours, three outfit silhouettes, weapons, and wings. It renders through the browser's normal SVG engine. Portrait zoom replaces 3D rotation. PNG export rasterises the same SVG onto a local 2D canvas; no remote images or WebGL are needed.

Rift now uses Canvas 2D for isometric terrain and the same character artwork for combat sprites. It preserves movement, skills, cooldowns, mana, dodging, telegraphed attacks, boss/tier progression, training, and existing progression callbacks. Sprites use fixed front-facing artwork with motion and attack effects, rather than a full eight-direction animation sheet. The same portrait appearance is used at smaller scale in combat.

Existing saves and gender selections continue to work with the unchanged Look schema. Old 3D asset/code files remain in the repository for history and their existing tests; neither current game route imports the 3D runtime. A separate future cleanup can remove them and the unused Three.js dependency after acceptance.

All artwork in Character2D.tsx is original vector code. No Cabal, Mushoku Tensei, or VRoid artwork is embedded in the 2D characters.

## Verification

Production static export, TypeScript, changed-file ESLint, and all ten progression tests pass. Browser review confirmed both gender portraits display facial features, changing to the Mage preset updates the artwork, and the isometric training arena renders in the cloud browser without WebGL. Click-to-move, Pulse damage/mana/cooldown, and Nova damage/mana/cooldown were exercised. The portrait download observation timed out in the browser automation, so exported PNG delivery is not marked as verified. Native screenshots were inspected, but the shared-file synchronization did not make the saved browser screenshots available to the main workspace.
