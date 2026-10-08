---
name: Crestline
description: A precise, evidence-backed brand guide for the next handoff.
colors:
  cobalt: "#2856d9"
  cobalt-dark: "#1641bb"
  ink: "#172d55"
  muted: "#526481"
  ground: "#eef2fa"
  paper: "#ffffff"
  line: "#d9e1f0"
  blue-tint: "#e2eaff"
  error: "#9a2838"
  error-surface: "#fff1f3"
  success: "#297355"
  success-surface: "#d9efe4"
  agent-surface: "#ebe6ff"
  agent-text: "#5b4198"
typography:
  display:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "clamp(45px, 5.4vw, 70px)"
    fontWeight: 650
    lineHeight: 1.09
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "42px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  query:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  action:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 750
    lineHeight: 1.6
  download:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "10px"
    fontWeight: 750
    lineHeight: 1.6
  chip:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "10px"
    fontWeight: 650
    lineHeight: 1.6
  meta:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
  evidence:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.6
rounded:
  micro: "3px"
  chip: "4px"
  field: "6px"
  panel: "8px"
  card: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
  4xl: "32px"
  5xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.paper}"
    typography: "{typography.action}"
    rounded: "{rounded.field}"
    padding: "12px 21px"
    height: "48px"
  button-light:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.download}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.download}"
    rounded: "{rounded.field}"
    padding: "9px 12px"
  query-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.query}"
    rounded: "{rounded.panel}"
    padding: "10px 0"
    height: "48px"
  sample-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.chip}"
    padding: "4px 8px"
  palette-swatch:
    backgroundColor: "{colors.blue-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "7px"
    height: "75px"
  session-disclosure:
    textColor: "{colors.muted}"
    typography: "{typography.meta}"
  report-nav:
    textColor: "{colors.muted}"
    typography: "{typography.evidence}"
---

# Design System: Crestline

## Overview

**Creative North Star: "The Precise Identity Handoff"**

Crestline is a production jacket for turning a public website into a usable brand handoff. Cobalt leads the shell, a pale-blue work surface keeps the page open, and white report sheets give the sourced guide a physical place to land. The voice is clear, practical, and visibly accountable to evidence: every logo, colour, typeface, quote, and call can be followed back to a source.

The interface moves in the same order as the work: enter a company or website, watch Resolve → Search → Fetch → Agent → Compose, inspect a readable guide, then download JSON or PDF. Manrope Variable gives the whole system sturdy rounded details without making the report feel soft. The small identity specimen is code-drawn geometry, while external logos stay what they are in the product: remote evidence previews.

**Key Characteristics:**
- Cobalt production-jacket shell over a pale-blue work surface.
- White, lightly lifted report sheets with ink-blue document hierarchy.
- Source-first labels, methods, URLs, endpoint states, and native disclosures.
- Compact desktop density that becomes a stacked portrait workbench without losing the handoff order.

**The Evidence Chain Rule.** Treat the interface as a traceable handoff: visual and verbal claims retain their source link and method, and recorded reports remain visibly distinct from live runs.

## Colors

The palette is a controlled cobalt, ink, pale-blue, and white system. Accent colour marks action and progress; the neutral field does the spatial work so extracted brand colours can become the report's signature.

### Primary
- **Production Cobalt** (`{colors.cobalt}`): The masthead, primary generate action, active progress, links, and report-level interaction cue.
- **Deep Cobalt** (`{colors.cobalt-dark}`): Hover and link emphasis where the action needs a darker printed edge.

### Secondary
- **Agent Violet** (`{colors.agent-text}`): The text role for an Agent method marker and its matching observation surface.

### Tertiary
- **Completion Green** (`{colors.success}`): Ready and completed states; it confirms a state without competing with the cobalt action colour.
- **Error Garnet** (`{colors.error}`): Generation, download, and failed-endpoint messaging only.

### Neutral
- **Ink Blue** (`{colors.ink}`): Primary text, wordmark, document headings, and the dark download action.
- **Quiet Slate** (`{colors.muted}`): Supporting copy, source descriptions, metadata, and secondary navigation.
- **Pale Blue Ground** (`{colors.ground}`): The page field, light button, progress panel, and extracted-content trays.
- **Blue Tint** (`{colors.blue-tint}`): Soft active surfaces, palette ribbon, endpoint chips, and voice attribute chips.
- **Paper White** (`{colors.paper}`): The generator, report sheet, buttons that need a clean face, and the specimen card.
- **Hairline Blue** (`{colors.line}`): Section rules, dividers, and quiet boundaries between evidence records.
- **Completion Wash** (`{colors.success-surface}`): The filled marker for completed progress steps.

**The Cobalt Accent Rule.** Keep cobalt concentrated on the shell, primary action, active state, and meaningful links. Extracted brand colours belong to the report content and must not be guessed or recoloured into the product palette.

## Typography

**Display Font:** Manrope Variable (with `sans-serif` fallback)  
**Body Font:** Manrope Variable (with `sans-serif` fallback)  
**Label/Mono Font:** No separate mono face; technical metadata uses the same Manrope family at a smaller evidence scale.

**Character:** Manrope is broad, sturdy, and legible at the small sizes required by source metadata. Weight and size, rather than a second typeface, separate the production shell from the document hierarchy.

### Hierarchy
- **Display** (650, `clamp(45px, 5.4vw, 70px)`, 1.09): The two-line landing promise, left aligned and tightly tracked (`-0.04em`). Portrait screens use `clamp(40px, 8vw, 51px)`.
- **Headline** (700, 42px, 1.15): The generated brand name in the report; it reduces to 35px in portrait layout.
- **Title** (700, 21px, 1.3): Report section headings and other high-signal document labels; portrait section headings use 18px.
- **Body** (400, 14px, 1.6): Default interface copy. Intro support copy steps up to 16px with 1.75 line-height; longer source prose stays readable at its local measure.
- **Evidence** (400, 12px, 1.6): Source links, evidence details, call-history summaries, call metadata, call purposes, and supporting report copy. Call-history URLs are deliberately 11px.
- **Label** (700, 12px, 1.4): Form labels and compact interface labels; action buttons use their explicit 650–750 weights in the component rules.

**The Document Hierarchy Rule.** Headings carry the report; metadata recedes but remains readable. Do not make source evidence smaller than the final 12px evidence scale merely to fit more content.

## Layout

Crestline uses a centered production workbench: the masthead is capped at 1200px, the main workspace at 1120px, and the desktop side padding is 40px. The first view pairs a large left-aligned promise with a small rotated identity specimen, then gives the query form the full working width. The recorded-report strip is a separate, bordered three-column band before any generated report appears.

The report is a white sheet with a 188px sticky guide rail and a flexible document body; at 900px the rail contracts to 154px. The body has generous document padding (39px top, 38px sides on the wide layout), section rules, and grids that move from four palette swatches to three and then two columns as space narrows. A 1500px view adds vertical air to the intro without changing the information order.

At 680px and below, the workbench becomes portrait-first: the masthead and workspace use 22px gutters, the specimen is removed, and the query input and primary action stack full width. The report rail becomes a horizontally scrollable native nav with hidden icons and no sticky side column; the report body becomes a single readable column. Voice guidance and CTA grids collapse to one column, while the palette and logo candidates retain compact two-column evidence grids.

**The Handoff Order Rule.** Preserve the sequence query → live examples → optional session key → recorded reports → generated report. On portrait screens, stack the query controls and let report navigation scroll rather than shrinking labels into illegibility.

## Elevation & Depth

Depth is tonal first and lifted second. The page field is pale blue; the generator, specimen, and report are paper-white objects; rules and blue-tint surfaces do the fine separation. The identity specimen uses a diffuse `0 12px 30px #1e3b6e13` shadow, while generator and report surfaces use the quieter `0 8px 24px #1e3b6e08`. There are no dramatic offset shadows or ornamental depth effects.

**The Paper Sheet Rule.** Use elevation to identify a working surface or finished report, not to decorate every control. Chips, dividers, swatches, and native disclosures stay mostly flat.

## Shapes

The form language is gently rounded and production-clean: 12px report and generator cards, 8px panels and evidence trays, 6px primary controls and logo previews, 4px chips and endpoint markers, and 3px method labels. Borders are pale blue hairlines or quiet blue field strokes; corners do the softening rather than thick outlines.

The specimen's slight 3° rotation is the one expressive geometry in the shell. The palette ribbon is a flat eight-pixel band, swatches are rectangular colour plates with a restrained radius, and the report remains a rectangular sheet. Native `details` and `summary` preserve their disclosure behavior while receiving the same spacing and focus language as the rest of the system.

## Components

### Buttons
- **Character:** Confident, compact, and explicit about the next handoff step.
- **Shape:** 6px radius (`{rounded.field}`), inline-flex alignment, and icon-plus-label construction.
- **Primary:** Cobalt with paper text, 48px minimum height, and `12px 21px` padding for Generate guide. Hover shifts to Deep Cobalt.
- **Light:** Pale-blue background with ink text for Download JSON and quiet secondary actions. Hover shifts to Blue Tint.
- **Ink:** Ink-blue background with paper text for Download PDF. Hover shifts to Deep Cobalt.
- **Hover / Focus:** Use the short 150ms background transition; every interactive button receives the native-visible 3px cobalt focus ring with 4px offset. Disabled buttons wait and reduce opacity rather than changing shape.

### Chips
- **Style:** Live examples use paper-white backgrounds, a 1px hairline border, 4px radius, 4px × 8px padding, ink text, and a small outbound arrow. Endpoint and voice chips use Blue Tint with semantic text colours.
- **State:** Hover adds the cobalt border and Blue Tint surface. Recorded reports carry a quiet Samples badge so a demo cannot be mistaken for a live run.

### Cards / Containers
- **Corner Style:** Generator and report sheets use the 12px card radius; progress panels and evidence trays use 8px.
- **Background:** Paper White objects sit on Pale Blue Ground; extracted content can use the ground or Blue Tint as a tonal tray.
- **Shadow Strategy:** Follow the Paper Sheet Rule: only the specimen, generator, and report receive the observed ambient shadows.
- **Border:** Section rules and report rail boundaries use Hairline Blue. The recorded strip uses a slightly stronger pale-blue border and clipped 8px corners.
- **Internal Padding:** The generator uses 26px × 28px on desktop and 19px × 17px in portrait; the report body follows document padding rather than card density.

### Inputs / Fields
- **Style:** The query row is a paper-white field with a 1px blue stroke, 8px desktop radius, 6px portrait input radius, 6px internal padding, a leading globe icon, and a 16px query value on desktop.
- **Focus:** `:focus-within` turns the border cobalt and adds a restrained 2px cobalt focus halo; on portrait screens the actual input owns the same treatment while the wrapper becomes borderless.
- **Session key:** A native disclosure reveals a password field, a quiet Clear action, and explicit storage copy. It remains optional when a server key is available.
- **Error / Disabled:** Errors use Error Garnet on a pale error wash with a dismiss button. Disabled inputs and actions remain legible, wait, and reduce opacity.

### Navigation
- **Style:** The masthead carries the wordmark and one outward link in paper white. The report rail uses small muted links, 6px vertical padding, and inline Lucide geometry.
- **States:** Hover shifts report links to cobalt and underlines external links. At portrait widths the rail becomes a horizontally scrollable one-row nav with 15px gaps, no sticky positioning, and labels kept intact.

### Disclosure
- **Style:** Session key and voice attributes use native `details` / `summary` controls. Summary rows are list-style-free, use a ChevronDown icon, and expose content only when opened.
- **State:** The chevron rotates 180° on open over the observed 150ms transition. Focus stays native-visible, and reduced motion removes the transition.

### Palette Swatches
- **Style:** Extracted colours are 75px-tall buttons in a four-column report grid, with a 6px radius and a small paper copy affordance revealed on hover or focus.
- **Signature behavior:** Clicking copies the real hex value and temporarily recolours the report ribbon. Reset returns the ribbon to the extracted palette; no colour is inferred when evidence is absent.

### Sources & Calls
- **Style:** Source rows lead with a method marker, a 12px evidence detail, and an external-link icon. Evidence remains traceable to the original URL and keeps Agent visually distinct.
- **Citation cascade:** The final cascade is authoritative: call-history summary, call metadata, and call purposes are 12px; call-history links are 11px. Do not regress this hierarchy by restoring smaller metadata.

### Motion & Accessibility
- **Focus:** `:focus-visible` is a 3px solid cobalt outline with a 4px offset; masthead focus uses paper white for contrast. The skip link becomes visible on focus.
- **Reduced motion:** Smooth scrolling becomes automatic, all transitions stop, and the progress spinner animation is disabled under `prefers-reduced-motion: reduce`.

## Do's and Don'ts

### Do:
- **Do** use the frontmatter cobalt, ink, pale-blue, paper, and hairline roles before introducing another product colour.
- **Do** keep every extracted visual or verbal claim attached to its source URL and method.
- **Do** preserve the recorded/live distinction, endpoint history, and Fetch evidence when Agent observation is unavailable.
- **Do** use native buttons, links, `details`, and `summary` controls with the visible focus treatment and reduced-motion behavior.
- **Do** keep the report hierarchy readable at the final 12px evidence scale, including call-history metadata and purposes.
- **Do** draw the identity specimen from geometry and use remote logos only as evidence previews.

### Don't:
- **Don't** invent a colour, font, logo, or tagline when the captured evidence does not provide one.
- **Don't** ship remote logo previews as raster brand assets, or replace the code-drawn specimen with a shipping raster file.
- **Don't** turn the pale-blue work surface into a warm editorial paper, gradient field, or decorative pattern.
- **Don't** add borrowed ornament, side stripes, oversized shadows, or extra display faces to the production-jacket shell.
- **Don't** collapse the portrait report nav into clipped labels or remove the stacked portrait query behavior.
- **Don't** treat a recorded sample as a live run, or treat an Agent failure as a reason to discard usable Fetch evidence.
