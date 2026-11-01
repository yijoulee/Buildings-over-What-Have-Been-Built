# Adaptive Reuse Atlas

A portfolio of case studies from a master's thesis on adaptive reuse of heritage
buildings. The site is built to static HTML from Markdown files.

```bash
npm install
```

```bash
npm run build
```

```bash
npm run dev
```

`build` validates every case study, lists all errors, and leaves invalid files out of the
site without failing the build. It ends with a summary: `N read, N built, N skipped`.
`dev` builds, then serves `dist/`.

## What the build writes

| Output | Purpose |
|---|---|
| `dist/index.html` | The landing page, from `src/templates/landing.html`. Its images come from `public/landing/` through `scripts/landing-page.js`, which also composites the flat hero for narrow screens. The intro animation is in `src/js/landing.js`, with its hold and return times at the top of the file, and its source values in `docs/animation-spec.md`. |
| `dist/case-studies/index.html` | The case studies index, from `src/templates/index.html`. Filter options come from `content/taxonomy.yml`. |
| `dist/map/index.html` | The map, from `src/templates/map.html`. Uses Leaflet and OpenStreetMap tiles, set in `scripts/map-page.js`. |
| `dist/case-studies/<slug>/index.html` | The case study page, from `src/templates/case-study*.html`. |
| `dist/css/`, `dist/js/`, `dist/fonts/` | Copied from `src/css/`, `src/js/` and `public/`. Fonts are self-hosted, with their licences alongside them. |
| `dist/images/<slug>/` | WebP images at widths 480, 960 and 1440. A narrower source is never enlarged; its own width becomes the largest size. Index cards get their own lighter files, at quality 50 rather than 80. |
| `data/cases.json` | Every built case study, for the index and map pages to read at build time. |
| `dist/api/cases.json`, `dist/api/cases.csv` | Public dataset downloads. The CSV has one row per case study and leaves out section text. |
| `dist/sitemap.xml` | Written only when `homepage` in `package.json` is set to the site's full URL. |

`data/`, `dist/` and `.cache/` are generated and gitignored. Encoded images are cached in
`.cache/images/`, and are re-encoded only when the source file's modified time changes.

## Site URL

Set `"homepage"` in `package.json` to the site's full URL, such as `https://example.com`.
The sitemap needs it, because sitemap entries must be absolute URLs. The site must be
served from the domain root, because image and page links start at `/`.

## Writing case studies in the browser

The site has an editor at `/admin/`, built on [Sveltia CMS](https://sveltiacms.app/en/docs).
It reads and commits directly to the GitHub repository, so there is no server or database.

### First-time setup

1. In `public/admin/config.yml`, set `repo` to your repository as `owner/name`. The editor
   won't connect until this is right.
2. Publish the site so that `/admin/` is reachable. To try it without publishing, run
   `npm run dev` and open `/admin/` at the address it prints.

### Signing in

1. Open `/admin/` and choose **Sign In Using Access Token**. Ignore **Sign In with GitHub**,
   which needs an OAuth service this site doesn't have.
2. Follow the link in the dialog to GitHub, which opens the token page with the permissions
   already chosen. If you make one yourself, use a fine-grained token limited to this
   repository, with **Contents: Read and write**.
3. Copy the token into the dialog.

The token is kept in that browser's local storage, so sign in only on your own computer.
Anyone holding it can change the repository. If you think it has leaked, revoke it on GitHub.

### Adding a case study

1. Go to **Case Studies** and choose **New**.
2. Fill in the fields. Starred fields are required, and all five sections need a body.
3. Add up to two images per section. They are converted to WebP as they upload, and stored
   in `content/images/<slug>/`.
4. Choose **Save**.

The filename, page URL and image folder all come from the title when the entry is first
saved. Changing the title later keeps them as they were, so existing links don't break.

### What happens after saving

Each save commits straight to `main`: the Markdown file, plus any new images. The site
changes only when it is next built and deployed, so a host needs to be set up to run
`npm run build` on every push to `main`.

Checks that fail when you press **Save** stop the save, and the dialog says which rule
failed. The dialog's first line suggests trying again later, but the line beneath it is the
real reason. These checks are in `public/admin/rules.js`, because they depend on more than
one field:

- **Year for sorting** is required when **Year completed** is filled in.
- A **comparison** needs exactly two images, each with a label.
- Latitude, the first coordinate, must be between -90 and 90.
- The slug must be lowercase letters and numbers joined by hyphens. A title with no Latin
  letters or digits can't produce one.

`npm run build` still validates every file. If an invalid file reaches the repository, it is
left out of the site without failing the build, so read the build log if a case study is
missing.

### Things to know

- Saving rewrites the whole file in a standard format. Your data is kept, but comments in
  the YAML are lost, and a value like `48.8600` becomes `48.86`.
- Function options are listed as `Category: Value`, because the editor's dropdowns can't show
  groups. Only the value is saved.
- `public/admin/config.yml` holds its own copy of the taxonomy's options, because a YAML
  config can't read another file. After changing `content/taxonomy.yml`, update it to match.
  `npm run build` warns if the two differ.
- The editor's preview is Sveltia's own, not the site's article layout. Matching the layout
  would mean rebuilding the article template as a React component in the admin.
- Sveltia is pinned to one version in `public/admin/index.html`, with an integrity hash. To
  upgrade, change the version and recompute the hash.

`/admin/` is kept out of search results by `public/robots.txt` and a `noindex` tag. That only
hides it from search engines. Access is protected by the GitHub token, not by the page.

## Adding a case study by hand

### 1. Choose a slug

Use lowercase letters and numbers joined by hyphens, such as `musee-dorsay`. The slug must
match the filename, and it names the image folder and the page URL.

### 2. Add the images

Put the source images in `content/images/<slug>/`. They don't need to be optimised.
Don't add corner marks or frames to the files; the site draws those in CSS.

Filenames must match exactly, including upper and lower case. A wrong-case name can look
fine on Windows but break on the web host, so the validator rejects it.

### 3. Create the Markdown file

Create `content/case-studies/<slug>.md`. All the data goes in the frontmatter, between
the two `---` lines. Copy `content/case-studies/musee-dorsay.md` as a starting point.

| Field | Required | Notes |
|---|---|---|
| `slug` | Yes | Must match the filename. |
| `title` | Yes | |
| `architect` | Yes | `Unknown` is a permitted value. |
| `area_m2` | No | A number. |
| `year_completed` | No | Text shown on the page. Always quote it: `"1986"`, `"7th Century"`. |
| `year_sort` | When `year_completed` is present | A whole number used for sorting. It can be approximate, and negative for BCE. |
| `city` | Yes | Occasionally a country, such as for the Great Wall. |
| `country` | Yes | |
| `coordinates` | Yes | `[latitude, longitude]`, in decimal degrees. |
| `location_note` | No | Use when the point is approximate. |
| `original_function`, `new_function` | Yes | One value from `function` in the taxonomy. |
| `original_form_geometry`, `new_form_geometry` | Yes | One value from `form_geometry`. |
| `original_form_organisation`, `new_form_organisation` | Yes | One value from `form_organisation`. |
| `strategy` | Yes | A list of one or more values from `strategy`. |
| `sections` | Yes | See below. |

Taxonomy values are in `content/taxonomy.yml` and must match exactly. Function values
are grouped by category there, but a case study stores only the value itself, such as
`Train Station` rather than `Transport`. To add a new value, add it to the taxonomy first.

### 4. Write the five sections

All five are required, under `sections:`, each with a non-empty `body`:
`introduction`, `reuse_goal`, `challenges`, `adaptive_strategy`, `solutions`.

```yaml
sections:
  introduction:
    body: |
      Markdown. Paragraphs and bullet lists.

      Leave a blank line between paragraphs.
    images:
      - src: perspective-section.jpg
        caption: Perspective Section
```

Keep the `|` after `body:` and indent the text under it.

Body text can use paragraphs, bullet or numbered lists, bold, italics, inline code and
web or email links. Anything else is reduced to plain text, and raw HTML is shown as
literal text rather than run.

Sections alternate between text on the left and image on the left. To override one, add
`layout: text-left` or `layout: image-left`.

Each section can have up to two images. Every image needs a `src` (the filename only,
with no folder) and a `caption`.

To show two images as a comparison, set `figure: comparison`. The section must then have
exactly two images, each with a `label`:

```yaml
    figure: comparison
    images:
      - src: under-construction.jpg
        caption: Under Repurposing Construction
        label: Before
      - src: after-construction.jpg
        caption: After Repurposing Construction
        label: After
```

The index card uses the last image in the last section that has one.

Without `figure`, images display separately. The build warns if the two images in a
comparison differ in aspect ratio by more than 10%.

### 5. Build

Run `npm run build` and fix anything it reports. Each error names the file and field:

```text
musee-dorsay.md: new_form_geometry 'Oval' not in taxonomy.form_geometry
```

Don't guess missing data. Leave optional fields empty. If a required value isn't known,
the case study stays out of the site until it's supplied, except for `architect`, which
can be `Unknown`.
