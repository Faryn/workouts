# Workout app — light training logbook

Approved by Paul on 2026-11-10: lighter, not gym-dark. Preserve Dashboard / Programs / Train and all existing training, scheduling and coach/athlete behavior.

## Direction

- Product: strength-training programs and session logging for athletes and trainers.
- Character: focused, precise, grounded.
- World: a training logbook, with warm off-white paper and white working surfaces.
- Moments: current-set weight/reps and meaningful workout progress, not decorative imagery.
- Signature: aligned measurements and tabular set counts.
- Surface mode: Operate. Scanability and dependable controls take priority.

## Tokens and usage

`apps/web/src/styles.css` is the single theme source. No competing compatibility theme overrides.

- Canvas `#f6f5f1`; panels white; supporting surface `#f2f3ef`.
- Text `#252c28`; secondary text `#626c64`; borders `#dcded7`.
- Primary action `#286447` with white text; hover `#22563d`.
- Green means action or completion; amber means skipped/warning; error text `#b13333`.
- Retain the existing Avenir/Segoe UI interface stack. Headings 28–36px, weight 500; figures use tabular numerals. No display-font dependency.
- 4px spacing rhythm; 8px controls and 12px panels; quiet borders rather than shadows.
- No gradients, glows, uppercase tracked labels, or decorative icon glyphs. Text labels are preferred; the navigation toggle uses a consistent 1.5-stroke SVG.
- Copy is functional, not promotional: use Dashboard / Programs / Train / Log in as headings. No motivational taglines or bylines that repeat what controls already explain.
- Current set gets larger measurement fields; completed and planned values remain distinguishable.
- Mobile preserves section context and slide-out navigation. Weight and reps remain side by side; set rows stack status beneath the measurement column.
- Focus, placeholder, error, selected, disabled, and reduced-motion states belong to the same light palette.

## Verification

Build and run the existing Playwright workflows. Responsive checks cover trainer dashboard overflow/navigation and athlete current-set controls at 390px; capture desktop dashboard and mobile active workout for visual inspection. Use fixture data locally, never live session mutations for visual checks.

Design process informed by [unslop by Damir Sokolovsky](https://github.com/heydamir/unslop), CC BY 4.0. Existing product functionality and identity remain intact.
