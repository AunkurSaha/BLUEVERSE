# BLUEVERSE Interface Direction

<!-- impeccable:design-schema 1 -->

## Direction

An oceanographic operations workstation: dark, measured, source-aware, and built around the live globe rather than dashboard furniture.

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

## Palette

- Abyss: `#030812`, primary workspace background.
- Panel: `#08111f`, navigation and inspector surfaces.
- Raised panel: `#0b1728`, selected and nested control surfaces.
- Scientific cyan: `#67e8f9`, current-model focus, selection, and focus rings.
- Historical amber: `#fbbf24`, historical context and event analysis.
- Slate text: `#e2e8f0` primary and `#94a3b8` secondary.
- Error red: `#fca5a5`, explicit failures only.

## Typography

Use the existing system sans for compact workstation labels and prose. Use tabular numerals for measurements and timestamps. Monospace is reserved for identifiers and coordinate-field names, not used as decorative technical styling.

## Composition

- Header communicates human-readable active context and backend state.
- Left rail follows Where, What, Explore, Analyse in that order.
- Globe takes all remaining width and is the single focal point.
- Inspector is closed by default and appears as a contextual drawer.
- Time and depth form two independent full-width rows below the workspace.
- At narrow widths, workflow and inspector become fixed sheets over a still-visible map.

## Component Character

Controls use one-pixel borders, low radii, quiet surface steps, and restrained selected fills. Cyan and amber indicate context, never decoration. Shadows are reserved for overlay separation. Motion is limited to 180 ms drawer and state transitions.

## Interaction Rules

- Scientific state changes may fetch; layout and disclosure changes may not.
- Tool activation produces a concise next-action instruction.
- Selecting a scientific result opens the inspector without clearing state when it closes.
- Disabled modes name the scientific reason.
- Low-level metadata lives inside collapsed Source & Provenance details.

## Decision Reasons

- Dark theme: reduces glare around the Cesium ocean rendering and preserves the established scientific identity.
- Cyan accent: identifies current model and scientific interaction state.
- Amber accent: separates the 2020 historical context without replacing the application theme.
- Persistent workflow rail: makes the five-step operating model scannable within seconds.
- Contextual drawer: returns width to the globe while preserving detailed scientific inspection.
- Two-row controller: protects exact time and depth values from slider-label overlap.
