# Search discovery and reading guides

The interactive atlas keeps its existing `#home`, `#stage/...`, `#node/...` and other hash routes. Search engines receive a descriptive homepage, canonical and social metadata, and a bilingual HTML summary before JavaScript runs. The normal app replaces that summary when it loads.

`guides/` contains a reading directory and four independent HTML research-stage guides. Their method explanations come directly from both languages in `data.js`. They work without JavaScript and link to the full interactive method pages. They are reading guides, not separate copies of the interactive app. `sitemap.xml` lists only actual, canonical HTML pages, never hash routes.

After editing `data.js`, regenerate and validate the checked-in pages:

```
node scripts/generate-guides.mjs
node scripts/check-discovery.mjs
```

Commit the generated HTML and sitemap with the data update. No dependency installation or build service is required. The generator is deterministic and uses the data snapshot date, not the current time. Keep the marked homepage summary block intact. The checks fail if the generated pages have drifted from the data.

For browser checks, serve the repository over HTTP (for example, `python -m http.server 8000`). Verify the homepage in both languages, existing hash navigation and search, the bottom GitHub links, and each reading guide with JavaScript disabled at desktop and phone widths. Opening Star on GitHub only opens the repository; visitors must choose Star themselves. Issues are the public channel for comments and feature requests, so users should not post private information.

The sitemap can be submitted in the site's verified search-engine webmaster tools. Publishing a sitemap does not guarantee indexing or search ranking. A `robots.txt` inside a GitHub Pages project subdirectory is not an origin-wide robots policy, so none is added here. No telemetry, analytics, external fonts, or new accounts are introduced.
