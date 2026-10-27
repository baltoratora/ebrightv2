# Aether Rift and Aether Atelier

Two original, single-player games under `/aether-rift` and `/aether-atelier`, registered in the Adventure catalogue. No accounts, chat, friends, guilds, payments, or backend are required.

## Play

Click the arena to focus it. Click the ground to walk, or use WASD / arrow keys. 1: Strike, 2: ranged Pulse, 3: area Nova, 4: reusable healing draught. Space: dodge with a short invulnerability window. The on-screen buttons also work with touch. Red expanding rings telegraph enemy attacks. Defeat five sentinels, then the guardian, to unlock the next tier. Select a tier and press Enter / restart rift to begin it; changing the selector alone does not change an active run. Training has an immortal dummy and grants no rewards. Pausing, opening progression panels, and hiding the tab stop simulation. Death retains earned progression; restart for a fresh encounter.

XP raises the character level (cap 50), granting two skill points per level. Three skill branches have prerequisite ranks and free refunds. Equipment has ten guaranteed enhancement ranks. Honor medals require solo kill, boss, and level milestones plus gold. One soul passive can be equipped after reaching its level requirement. Wings unlock after one guardian victory and have five ranks. All these systems contribute to the combat stat calculation. The three class choices grant distinct base stat bonuses and can be changed freely. Outfits are cosmetic.

Atelier uses the same original procedural 3D avatar: plate / robe / ranger silhouettes, three hair styles, skin / hair / clothing / glow colours, three weapon styles, and optional crystal wings. Rotate the model, save up to six looks, load or delete looks, download a PNG, and equip a look in the RPG. Three repeatable style briefs provide a small dress-up challenge loop. Saving a seventh look replaces the oldest. Studio wings are cosmetic; RPG wing ranks grant stats separately.

## Storage and implementation

- `lib/aether.ts`: pure progression, validation, wardrobe schema, and stat calculations.
- `components/aether/avatar.ts`: original Three.js geometry; no Cabal models, textures, screenshots, or icons are distributed.
- `components/aether/World.tsx`: WebGL renderer, fixed orthographic camera, animation, movement, combat, enemy behaviour, and lifecycle disposal.
- `components/aether/Aether.tsx`: progression UI and studio. Three.js scene is loaded client-side only.
- Browser save key `ebright.aether.v1`; wardrobe keys `ebright.atelier.look` and `ebright.atelier.presets`. Storage errors are surfaced to the player. Mid-fight HP/positions do not persist; progression does.

## Reference and scope

User screenshots supplied October 28, 2026 guided the UI categories, character creation, fixed elevated viewpoint, medals, branching passives, and wings. The provided PlayCabal wiki was consulted at https://wiki.playcabal.to/content/basics and https://wiki.playcabal.to/content/basics/axp/soul-ability-ui.md. Systems and numerical balance here are original simplified designs, not a reproduction of Cabal formulas.

This is an initial playable prototype with stylised procedural 3D characters and a modest arena environment. It does not yet include detailed rigged character assets, an open world, quests, loot inventory, pets, full Myth/Anima/Overlord systems, or Cabal's many class-specific skills. The dress-up studio is fantasy themed and shares the avatar system.

## Verification

Nine progression tests cover costs, prerequisite enforcement, point budgets, milestones, rewards, caps, corrupt-save handling, and cosmetic/stat separation. Full suite: 596 tests across 61 files. TypeScript and changed-file ESLint pass. Production static export succeeds with both routes.

Browser visual and interactive QA remains unverified: the managed preview daemon appends Vite-specific `--host` / `--strictPort` arguments to this Next.js repo's existing `next dev` script, which rejects them. No working application scripts were changed to compensate for the preview infrastructure. Combat feel, 3D framing, touch controls, and portrait export need browser review before calling this production-ready.

## Anime character revision

Replaces the default geometric mannequin with pixiv's CC0 Sendagaya Shino base (`public/aether/ASSET-LICENSE.md`). The old model remains only as a graceful asset-load fallback. All asset requests use a bundled same-origin GLB; no runtime dependency on a third-party model host. The cached source scene is cloned with independent skeletons, geometry, materials, and textures. Disposed avatars ignore pending loads. Added relaxed arm pose, walking leg motion, toon materials, closer studio framing, and gentler studio lighting. Existing saves remain compatible.

Wardrobe controls tint clothing, hair, skin and irises/accents. Hair choices are long layers, a compressed bob, and a swept variant with a headband. The three outfit presets add cape/hem, light armour, or traveller accessories over the fully clothed base. These are stylised adaptations of a shared base, not three independently authored clothing meshes. The prior glow colour also drives iris colour. Fantasy presets provide coordinated palettes. Combat stats are unchanged.

Research references:
- https://github.com/M3-org/CharacterStudio — MIT web-based modular VRM/avatar studio; architecture reference, no code or assets copied.
- https://github.com/pixiv/three-vrm — MIT VRM rendering library; investigated as the full VRM path. This revision uses Three.js GLTFLoader directly for the simplified bundled model.
- https://mushokutensei.jp/character/ — visual direction reference only; no character artwork/models copied.

Verification: static export builds and focused progression tests pass. The static export can be served through the managed preview service using a separate static preview directory, with no changes to the repo's Next.js dev command. Preset controls were exercised in the cloud browser. Its WebGL context creation fails, so 3D appearance, accessory placement, and animation remain unverified visually on a GPU-enabled browser.

Gender selection is available in Atelier's wardrobe controls and the RPG Character panel. Female uses the Shino base; Male uses the separately bundled CC0 Sakurada Fumiriya base. Gender persists through saved looks, reloads, and Wear in RPG; presets keep the current gender. Older saves default to Female, preserving their prior model. Gender is cosmetic and does not affect stats. The bases have their own original clothing silhouettes; shared fantasy accessories are adaptations rather than a complete modular clothing library.
