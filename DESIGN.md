# Design

<!-- impeccable:design-schema 1 -->

## World

A hospital clerk's case register. Warm paper, ruled entry lines, a single ruby
margin rule; every emergency is a line in the book, written and read at the
desk. Paper is the working surface, not a card floating on a dashboard. The
ambulance crew files the entry; the hospital desk receives it and stamps the
acknowledgement. Typography, palette, and density come from the register;
layout, navigation, and controls stay the product's own.

## Signature Move

Acknowledgement is stamped into the register. When a hospital acknowledges a
handoff, a double-ruled ruby stamp presses into the entry's footer band and
settles with a short scale-and-rotate ease-out. It fires only on a real status
transition to acknowledged, never on load, and collapses under reduced motion.
This replaces the old strip-advance motion.

## Palette

Jobs, not decoration: warm paper is the surface being worked; ink is the text
written on it; the ruby margin rule and alarm tint carry clinical risk and the
acknowledgement stamp; kraft marks secondary structure; blue-black is
hospital-selected; green means acknowledged, ready, or connected.

| Token | Value | Job |
| --- | --- | --- |
| `--board` | `#f7f4ec` | page ground |
| `--board-deep` | `#efe9db` | chrome band |
| `--board-line` | `#d9d3c2` | chrome hairlines |
| `--board-line-soft` | `#e6dfcf` | chrome soft rules |
| `--paper` | `#fcfaf3` | register sheet |
| `--paper-band` | `#efe9db` | stamp band, selected row |
| `--paper-line` | `#d9d3c2` | register rules |
| `--perf` | `#c9b98f` | kraft: secondary rule, revision marks |
| `--ink` | `#22262b` | text on paper |
| `--paper-muted` | `#6c685f` | secondary text on paper |
| `--text` | `#22262b` | chrome text |
| `--text-muted` | `#6c685f` | chrome secondary text |
| `--label` | `#6c685f` | field labels |
| `--live` | `#456b4e` | connected / healthy |
| `--alarm` | `#8c2f24` | clinical risk, destructive action, margin rule |
| `--alarm-tint` | `#f2e2dd` | alarm callout fill |
| `--st-blue` | `#3f6f8f` | hospital-selected |
| `--st-green` | `#456b4e` | acknowledged / ready |
| `--st-amber` | `#8a6a2f` | pending / preparing |
| `--st-mute` | `#6c685f` | closed / sent |

All text pairs meet WCAG AA on paper: ink ~14:1, secondary 5.3:1, blue 5.2:1,
green 5.8:1, amber 4.8:1, alarm 7.9:1, ink on band 12.5:1.

## Type

- Display: **Georgia / Times New Roman** serif — wordmark, patient names, case
  headings, section heads. Tracked wide for the wordmark, tight for names.
- Data: **Courier New** mono — timestamps, IDs, phones, Aadhaar, status tags,
  field labels, the stamp. Tabular numerals everywhere.
- Body: Georgia serif at 14px; measures capped at 70ch. Both stacks are system
  fonts; no webfonts are loaded.

## Density

Register, not card grid. Mobile first (390×844): 58px brand/status band, ruled
entry sheets stacked with a 58px left margin for the ruby rule. Desktop: 15rem
rail, rack left / active entry right. Radii 0–2px. Shadows are offset with a
soft blur, never a hard 1px drop.

## State Vocabulary

Every state has a register-legible tag: open, hospital selected, acknowledged,
closed, en route, arrived, pending, requested, preparing, ready, sent,
delivered, plus priority and emergency category. Colour is always paired with
text; nothing depends on hue alone.

## Constraints

Preserve all modules, routes, role scoping, RFID flow, voice notes,
acknowledgement, preparation status, and the read-only doctor view. No new
dependencies. Native `<select>`/`<button>`/`<input>` semantics stay intact.
No kicker above a heading; labels sit on their field.
