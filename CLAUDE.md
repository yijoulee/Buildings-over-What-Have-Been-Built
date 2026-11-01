# Project: Adaptive Reuse Atlas

A portfolio website presenting case studies from a master's thesis on adaptive reuse of
heritage buildings. The author is an architect applying for heritage/BIM roles in the
Netherlands — this site is a work sample and must read as considered and precise.

## Non-negotiable constraints
- Vanilla HTML, CSS and JavaScript. NO React, Vue, Svelte, Tailwind, or bundler.
- No runtime fetching of content. Everything is baked into static HTML at build time.
- Only two runtime JS libraries permitted: GSAP (animation) and Leaflet (map), via CDN
  with integrity hashes. Do not add any other runtime dependency without asking.
- Build-time npm dependencies limited to: gray-matter, marked, js-yaml, sharp.
- Every page must work with JavaScript disabled, except the map page.
- Target: Lighthouse performance 95+, accessibility 100.

## Design system
All colours, spacing, type sizes, borders and radii live as CSS custom properties in
src/css/tokens.css. Never hardcode a hex value or a px font-size anywhere else.

Recurring visual components — red boxed section heading, image frame with red corner
marks, outlined caption box, tag chip, header matrix, case card — are single reusable
CSS components. Decorative corner marks and frames are CSS pseudo-elements, never baked
into image files.

## File layout
/content/case-studies   one .md per case study (the dataset)
/content/images         source images, unoptimised
/content/taxonomy.yml   controlled vocabularies
/src/templates          HTML templates
/src/css                tokens.css, base.css, one file per page
/src/js                 one file per page, plus shared/
/scripts                build.js and helpers
/public                 static assets, fonts, favicons, admin/
/dist                   build output (gitignored)

## Style
- Semantic HTML: <article>, <section>, <figure>, <figcaption>, <nav>, <main>, <dl>.
- CSS mobile-first, logical properties, clamp() for fluid type.
- JS as ES modules. No globals, no jQuery patterns.
- Comments explain why, not what.

## Responsive discipline
This site is responsive, not a scaled-down desktop layout. The Figma frames are all
~1440px — they are the desktop end of a range, never the design itself.

- Breakpoints, mobile-first: base (<600), 600, 900, 1200. Content max-width 1440.
- Fluid type via clamp(). Letter-spacing is fluid too — the display headings are heavily
  tracked and that tracking must reduce on narrow screens or the words break apart.
- Interactive targets at least 44×44px. The red nav chips and filter controls must pass
  this at every width.
- No horizontal page scroll at any width from 320px up.
- Test at 320, 390, 768, 1024, 1440. 320 is the floor, not an afterthought.
- When a Figma frame gives no mobile guidance, propose a layout and SAY SO rather than
  guessing silently. List every responsive assumption at the end of each page you build.

## Workflow rules
- State your plan and wait for approval before writing code for a page.
- Finish one page completely before starting the next.
- Run `npm run build` after each step and confirm it passes.
- NEVER invent case study content, tag values, coordinates or captions. If data is
  missing, leave it empty and tell me.