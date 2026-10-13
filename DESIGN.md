---
name: Monster Experience
description: A press-shop dark scroll journey that strikes one can into being, then opens the full Brazilian Monster rack on calibrated instruments.
colors:
  ink: "#060807"
  steel: "#2b3230"
  rule: "rgb(232 238 230 / 0.13)"
  rule-strong: "rgb(232 238 230 / 0.26)"
  text: "#eaefe8"
  text-soft: "#d3dbd5"
  muted: "#a9b3ad"
  faint: "#7e8983"
  acid: "#8fe03a"
  acid-ink: "#0b1205"
  accent-deep: "#5fbf1c"
  line-monster-energy: "#8fe03a"
  line-monster-ultra: "#e4ebf1"
  line-dragon-tea: "#e0a63e"
  line-juice-monster: "#ffb020"
typography:
  display:
    fontFamily: "'Big Shoulders Display', 'Arial Narrow', sans-serif"
    fontSize: "clamp(3.6rem, 8.6vw, 8.6rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.012em"
  numeral:
    fontFamily: "'Big Shoulders Display', 'Arial Narrow', sans-serif"
    fontSize: "clamp(5rem, 9vw, 8.5rem)"
    fontWeight: 900
    lineHeight: 0.78
    letterSpacing: "-0.012em"
    fontFeature: "'tnum', 'lnum'"
  headline:
    fontFamily: "'Big Shoulders Display', 'Arial Narrow', sans-serif"
    fontSize: "clamp(2.6rem, 4.4vw, 4.6rem)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "-0.012em"
  figure:
    fontFamily: "'Big Shoulders Display', 'Arial Narrow', sans-serif"
    fontSize: "2.5rem"
    fontWeight: 900
    lineHeight: 0.9
    fontFeature: "'tnum', 'lnum'"
  title:
    fontFamily: "'Big Shoulders Display', 'Arial Narrow', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.02em"
  body:
    fontFamily: "'Figtree Variable', 'Figtree', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 450
    lineHeight: 1.55
  lede:
    fontFamily: "'Figtree Variable', 'Figtree', system-ui, sans-serif"
    fontSize: "clamp(1rem, 1.15vw, 1.15rem)"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "'Figtree Variable', 'Figtree', system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 650
    lineHeight: 1.3
rounded:
  tick: "2px"
  rail: "10px"
  tile: "14px"
  thumb: "18px"
  sheet: "24px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 56px)"
  header: "72px"
  header-sm: "60px"
  control: "48px"
components:
  button-primary:
    backgroundColor: "{colors.acid}"
    textColor: "{colors.acid-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-ghost:
    backgroundColor: "rgb(255 255 255 / 0.04)"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-icon:
    backgroundColor: "rgb(255 255 255 / 0.04)"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    size: "48px"
  filter:
    backgroundColor: "rgb(255 255 255 / 0.03)"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  step-chip:
    textColor: "{colors.faint}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  step-chip-on:
    backgroundColor: "{colors.acid}"
    textColor: "{colors.acid-ink}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  thumb:
    textColor: "{colors.faint}"
    rounded: "{rounded.thumb}"
    padding: "14px 8px 12px"
    width: "112px"
  detail-panel:
    backgroundColor: "rgb(11 14 13 / 0.94)"
    textColor: "{colors.text}"
    width: "min(600px, 48vw)"
  detail-sheet:
    backgroundColor: "rgb(11 14 13 / 0.94)"
    rounded: "{rounded.sheet}"
    height: "min(64lvh, 640px)"
---

# Design System: Monster Experience

## Overview

**Creative North Star: "The Press Line at Night"**

The whole page is a press shop with the lights mostly off. Black ink and graphite steel are the ground; acid green is the line's working light, the one thing that is lit; raw aluminium, rendered in the 3D world, is the material voice. Everything in the interface behaves like equipment on that line: stations carry a struck numeral and a heavy title, progress is counted in registered strikes, and product figures are read off calibrated instruments that share one scale.

Density is low and the type is loud. Heavy industrial condensed caps are packed huge and tight, cheek to cheek, against a full-bleed WebGL stage; reading text is Figtree at comfortable weights, never thin. Copy always sits on a scrim, never directly on bright 3D. When the rack opens, the working light hands over to each product's own color: the accent becomes whatever the selected can is.

Rejected by the user and by the build: thin or monospace faces, grid or blueprint backgrounds, em dashes in visible copy.

**Key Characteristics:**
- Full-bleed 3D stage under a fixed, scrimmed HTML layer.
- One lit color at a time: acid green on the line, the selected product's accent in the rack.
- Big Shoulders Display 800/900, uppercase, tight leading; Figtree 450 to 700 for reading.
- Pills for every control; ruled hairlines for every instrument.
- Motion is scroll-scrubbed and reversible; reduced motion holds composed frames.

## Colors

A near-black, faintly green-tinted ground with a single working light that changes owner when the catalog opens.

### Primary
- **Working-Light Acid** (acid): the line's light. Station numerals, the active step chip, rail fills, scroll-cue bar, register ticks, callout leaders and dots, selection highlight, focus ring default, the "Web" half of the mark.
- **Press Ink on Acid** (acid-ink): text set on any acid fill (step chip, skip link, selection).

### Secondary (runtime accent)
- **Product Accent** (`--accent`, default acid): set at runtime from the selected product's `colors.accent` in `src/data/catalog.json`. Drives the primary button, lit gauge ticks, the flavor line, the detail panel's corner glow, finale title color and the focus ring.
- **Product Deep** (accent-deep, default shown): the selected product's `colors.deep`, consumed by the 3D Director as the secondary light and haze color, not by CSS.

### Tertiary (line colors)
- **Monster Energy Green** (line-monster-energy), **Ultra Frost** (line-monster-ultra), **Dragon Tea Amber** (line-dragon-tea), **Juice Gold** (line-juice-monster): one per product line, used for the filter dot, the active filter's ring and wash, and the line dot beside a product name.

### Neutral
- **Press Ink** (ink): page ground, header and scrim base (`rgb(6 8 7 / alpha)`), strip edge fades.
- **Graphite Steel** (steel): unlit tracks: gauge ticks, register ticks, rail and scroll-cue tracks, scrollbar thumb.
- **Hairline** (rule) and **Strong Hairline** (rule-strong): every divider, instrument row, and inset 1px ring on ghost controls.
- **Bone** (text): headlines and primary reading text.
- **Soft Bone** (text-soft): long-form reading copy on dark ground: station body, detail description and lists.
- **Ash** (muted): ledes, labels, nav links, secondary figures.
- **Slag** (faint): units, scale ends, inactive chips and thumb names, legal notes.

### Named Rules
**The One Light Rule.** Only one chromatic color is lit on screen at a time: acid on the line, the selected product's accent in the rack and detail. Line colors appear only as small dots and filter rings.

**The Line Owns Its Color Rule.** Once the rack opens, a product line's color is law. Never recolor a line, and never use a line color for anything except that line.

## Typography

**Display Font:** Big Shoulders Display 800/900 (with Arial Narrow, sans-serif), self-hosted via @fontsource
**Body Font:** Figtree Variable (with Figtree, system-ui, sans-serif), self-hosted via @fontsource

**Character:** Stamped industrial caps against a warm, round humanist sans. The display face is always uppercase and tight; Figtree carries every sentence and every control label.

### Hierarchy
- **Display** (900, clamp(3.6rem, 8.6vw, 8.6rem), 0.86): hero headline, two to three lines, last phrase in acid. Catalog and finale titles use the same role at clamp(3.2rem, 7.4 to 8vw, 7.6 to 8.4rem).
- **Numeral** (900, clamp(5rem, 9vw, 8.5rem), 0.78, tabular): station numbers in acid, set beside the station title.
- **Headline** (900, clamp(2.6rem, 4.4vw, 4.6rem), 0.88): station titles; product names run larger (clamp(2.8rem, 5vw, 5.2rem)).
- **Figure** (900, 2.5rem, 0.9, tabular lining): instrument values and the strike count.
- **Title** (800, 1.25rem, 0.02em, uppercase): detail block heads; rail numerals and counters use 800 at 1.1 to 1.15rem.
- **Body** (450, 1rem, 1.55): reading text; long detail copy at 1.02rem / 1.62, max 62ch.
- **Lede** (500, clamp(1rem, 1.15vw, 1.15rem)): hero, station and catalog ledes, 38 to 46ch.
- **Label** (650, 0.85rem): chips, gauge labels, nav (600, 0.92rem), scroll cue.

### Named Rules
**The Cheek-to-Cheek Rule.** Display type is uppercase, weight 800 or 900, leading 0.78 to 0.88, tracking at or just under zero. Never loosen it into a light or airy headline.

**The No Hairline Faces Rule.** Figtree never drops below 450 in reading text; no thin, light or monospace face anywhere. Figures get tabular lining numerals instead of a mono font.

## Layout

A fixed WebGL canvas fills the viewport behind everything; the HTML page scrolls over it. The journey is one tall section (1150lvh desktop, 1050lvh portrait) with a sticky 100lvh screen; station placards sit in the left third (width min(40vw, 560px), vertically centered) and the 3D object owns the right. The rail is a fixed numeral column at the right edge. All horizontal insets use the gutter token; the header is 72px (60px at 720px and below), transparent over a fade, solid with blur once scrolled.

The catalog is a two-column stage (can visual, then a 380 to 540px info column) above a horizontally snapping thumb strip that bleeds to the viewport edges with ink fades; stage and strip fit one screen under the header. The detail opens as a right side panel on desktop and a bottom sheet at 1023px and below.

Portrait and phones (820px portrait or 600px): the scrim flips to bottom-up, placards dock to the bottom, the rail becomes a top progress line with the station name, callouts and the journey note hide. Breakpoints in use: 520px, 720px, 820px portrait, 860px, 1023px.

**The Scrim Rule.** Copy never sits directly on bright 3D: every text block over the stage has an ink gradient scrim behind it.

## Elevation & Depth

Depth comes from the 3D world and from light, not from stacked cards. HTML surfaces are flat and tonal; the few shadows are either colored glows (the working light spilling off a lit control) or large soft ambient falloffs under floating panels and can renders. Hairline inset rings (`inset 0 0 0 1px`) stand in for borders everywhere.

### Shadow Vocabulary
- **Lit glow** (`0 10px 30px -12px var(--accent)`, hover `0 14px 36px -10px`): primary button; the active step chip uses `0 6px 22px -8px var(--acid)`.
- **Panel falloff** (`-30px 0 80px -20px rgb(0 0 0 / 0.7)`, sheet `0 -30px 80px -20px`): detail panel and sheet.
- **Can drop** (`drop-shadow(0 40px 50px rgb(0 0 0 / 0.6))`, thumbs `0 12px 14px / 0.55`): product renders.
- **Hairline ring** (`inset 0 0 0 1px var(--rule-strong)`): ghost buttons, icon buttons, chips, filters.

**The Light Not Lift Rule.** A control rises in emphasis by being lit (fill plus colored glow), never by a neutral lift shadow or offset.

## Shapes

Two families. Controls are full pills (999px): buttons, icon buttons, filters, step chips, nav links, the concept tag, rail labels. Instruments are hairline and tick geometry: 1px rules, 2px ticks with 1 to 2px radii, a 2px needle. Containers in between take moderate radii: thumbs 18px, detail prev/next tiles 14px, rail items 10px, the bottom sheet 24px top corners. Dots (filter, line, callout) are circles 7 to 10px.

## Components

### Buttons
Plates with a lit edge.
- **Shape:** full pill (999px), 48px min height, 0 22px padding, 18px icon with 10px gap.
- **Primary:** accent fill with near-black text, lit glow shadow; follows the selected product's accent.
- **Ghost:** 4% white wash with a strong hairline ring; on hover the wash doubles and the ring takes the accent.
- **Icon button:** 48px circle in the ghost treatment; disabled at 35% opacity.
- **Press / Focus:** active scales to 0.97; focus is a 2px accent outline at 3px offset.

### Chips (step chips and filters)
- **Step chips:** faint text in a hairline ring; done steps brighten to muted with a strong ring; the current step fills acid with acid-ink text and a glow.
- **Filters:** 44px pills with a line-color dot (glowing) and a faint count; pressed state takes a 1.5px ring and 14% wash in the line color.

### Navigation
Header nav links are 600-weight Figtree pills in muted, brightening to text on a 6% wash. The mark pairs "APX" in display 900 with "Web" in acid display 800, followed by a hairline "Projeto conceitual" tag.

### Station Placard (signature)
An acid numeral beside a heavy two-line title, a lede under 38ch, then a row of step chips. The forming station adds a strike register: a label, a struck count in display figures, five ticks that light acid and stretch 1.5x per strike, and a faint total.

### Instrument Row (signature)
One panel of ruled rows (strong rule on top, hairline between). Each row: label with unit, a display figure right-aligned, and a 21-tick ruler (every fifth tick major) spanning the catalog-wide min to max across all variants, ticks lit in the accent up to the value and a bone needle with a soft glow. Missing figures read "Não informado" and dim the ruler.

### Anatomy Callout (signature)
Anchored to the 3D can silhouette: a 7px acid dot with a 3px acid halo, a 46px acid leader, and a 700-weight label with a dark text shadow. Fades in on its scroll beat; hidden on phones.

### Station Rail
Fixed numeral column at the right: display numerals on small ink plates, a 3px track that fills acid as the station progresses, the current numeral in acid, titles sliding in from the left on hover or focus. Phones replace it with a top 2px progress line and the station name.

### Product Strip
112px thumbs on 18px radii with the can render, a pointer-driven tilt and sheen, and the name below. The selected thumb gets a 10% wash of its line color and a 2px bottom bar.

### Detail Panel / Sheet
Right side panel (min(600px, 48vw)) on desktop, 64lvh bottom sheet with 24px top corners below 1023px. Translucent ink with an 18px blur, a corner radial glow in the product accent, hairline-divided blocks, and a sticky prev/next footer with display counter.

### Motion
Everything on the journey is scroll-scrubbed and reversible frame by frame; the scroll is the action, there is no CTA in the first viewport. UI transitions use the ease-out curve (`cubic-bezier(0.16, 1, 0.3, 1)`) at 0.2 to 0.9s; looping cues use the in-out curve. Under reduced motion the camera holds each station's composed frame and transitions collapse to near zero.

## Do's and Don'ts

### Do:
- **Do** keep a single lit color per screen: acid on the line, the product accent in the rack (The One Light Rule).
- **Do** set display type in Big Shoulders 800/900, uppercase, leading 0.78 to 0.88.
- **Do** put every new figure on a shared, calibrated scale with its unit and source; label absent data "Não informado".
- **Do** use full pills (999px) for controls and hairline rings instead of borders.
- **Do** place a scrim behind any copy that sits over the 3D stage.
- **Do** make scroll motion reversible and give reduced motion a held, composed frame.

### Don't:
- **Don't** use thin, light or monospace fonts anywhere.
- **Don't** add grid or blueprint backgrounds.
- **Don't** use em dashes in visible copy.
- **Don't** recolor a product line or borrow a line color for decoration.
- **Don't** lift controls with neutral drop shadows; emphasis is light (fill and colored glow).
- **Don't** redraw Monster marks or can art; use the official reference assets.
