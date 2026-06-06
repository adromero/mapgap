// Build-time generator: turns the county opportunity-score data into crawlable
// static HTML at /markets/<category>/ (ranked tables) + a /markets/ index + sitemap.
// Runs as an npm `postbuild` step (after `vite build`), writing into dist/.
// No deps beyond Node built-ins. The interactive React map at / is untouched.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "public", "data");
const DIST = path.join(ROOT, "dist");
const SITE = "https://mapgap.online";
const TOP_N = 50;

const HEAD_COMMON = `    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <!-- Cloudflare Web Analytics -->
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "80f1f21dba6a4794ad57ed5805066438"}'></script>`;

const STYLE = `    <style>
      :root { --ink:#10151c; --muted:#5b6776; --line:#e3e8ee; --bg:#f7f9fc; --accent:#1f6feb; }
      * { box-sizing:border-box; }
      body { margin:0; background:var(--bg); color:var(--ink); font-family:Inter,system-ui,sans-serif; line-height:1.55; }
      .wrap { max-width:56rem; margin:0 auto; padding:2.5rem 1.25rem 5rem; }
      a { color:var(--accent); text-decoration:none; } a:hover { text-decoration:underline; }
      .crumb { font-size:.78rem; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); margin-bottom:1.5rem; }
      h1 { font-size:2.1rem; font-weight:700; line-height:1.15; margin:0 0 .75rem; letter-spacing:-.01em; }
      .lede { font-size:1.12rem; color:var(--muted); margin:0 0 2rem; max-width:44rem; }
      table { width:100%; border-collapse:collapse; font-size:.95rem; }
      th, td { text-align:left; padding:.55rem .7rem; border-bottom:1px solid var(--line); }
      th { font-size:.7rem; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); }
      td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
      tr:hover td { background:#eef3fb; }
      .rank { color:var(--muted); }
      .cta { margin-top:2rem; font-size:1rem; }
      ul.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(15rem,1fr)); gap:.6rem; list-style:none; padding:0; margin-top:1.5rem; }
      ul.grid a { display:block; padding:.85rem 1rem; background:#fff; border:1px solid var(--line); border-radius:.5rem; font-weight:600; }
      ul.grid a span { display:block; font-size:.82rem; color:var(--muted); font-weight:400; margin-top:.15rem; }
      @media (max-width:560px){ h1{font-size:1.7rem} .hide-sm{display:none} .wrap{padding:2rem 1rem 4rem} }
    </style>`;

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function num(n) {
  return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function page({ title, desc, canonical, ogType, jsonLd, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:site_name" content="MapGap" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
${HEAD_COMMON}
    <script type="application/ld+json">${jsonLd}</script>
${STYLE}
  </head>
  <body>
    <main class="wrap">
${body}
    </main>
  </body>
</html>
`;
}

function renderCategory(cat, counties) {
  const top = counties.slice(0, TOP_N);
  const lead = top[0];
  const label = cat.label;
  const title = `Most underserved markets for ${label} (by US county) · MapGap`;
  const desc = `U.S. counties with the widest gap in ${label.toLowerCase()}, ranked by opportunity score.${lead ? ` Led by ${lead.name}, ${lead.state} — ${num(lead.populationPerBiz)} residents per business.` : ""}`;
  const canonical = `${SITE}/markets/${cat.id}/`;

  const rows = top.map((c, i) => `        <tr>
          <td class="rank num">${i + 1}</td>
          <td>${esc(c.name)}</td>
          <td>${esc(c.state)}</td>
          <td class="num">${c.score}</td>
          <td class="num hide-sm">${num(c.establishmentCount)}</td>
          <td class="num">${num(c.populationPerBiz)}</td>
        </tr>`).join("\n");

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Most underserved U.S. counties for ${label}`,
    description: desc,
    numberOfItems: top.length,
    itemListElement: top.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: `${c.name}, ${c.state}` })),
  });

  const body = `      <div class="crumb"><a href="/">MapGap</a> · <a href="/markets/">Markets</a></div>
      <h1>Most underserved markets for ${esc(label)}</h1>
      <p class="lede">U.S. counties ranked by opportunity score for <strong>${esc(label.toLowerCase())}</strong> (${esc(cat.description)}). A higher score means more residents per existing business — a wider gap between demand and supply, drawn from US Census County Business Patterns data.</p>
      <table>
        <thead>
          <tr><th class="num">#</th><th>County</th><th>State</th><th class="num">Score</th><th class="num hide-sm">Businesses</th><th class="num">Pop / business</th></tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
      <p class="cta"><a href="/">Open the interactive map →</a> &nbsp;·&nbsp; <a href="/markets/">All categories</a></p>`;

  return page({ title, desc, canonical, ogType: "website", jsonLd, body });
}

function renderIndex(cats) {
  const desc = "Browse underserved U.S. business markets by category — coffee shops, gyms, daycare, auto repair and more, each ranked by county-level opportunity score.";
  const jsonLd = JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: "MapGap — Markets", url: `${SITE}/markets/`, description: desc });
  const body = `      <div class="crumb"><a href="/">MapGap</a></div>
      <h1>Underserved markets by category</h1>
      <p class="lede">${esc(desc)}</p>
      <ul class="grid">${cats.map((c) => `<li><a href="/markets/${c.id}/">${esc(c.label)}<span>${esc(c.description)}</span></a></li>`).join("")}</ul>`;
  return page({ title: "Underserved business markets by category · MapGap", desc, canonical: `${SITE}/markets/`, ogType: "website", jsonLd, body });
}

// ---- run ----
const industries = JSON.parse(fs.readFileSync(path.join(DATA, "industries.json"), "utf8"));
fs.mkdirSync(path.join(DIST, "markets"), { recursive: true });

let n = 0;
for (const cat of industries) {
  const scoresFile = path.join(DATA, "scores", `${cat.id}.json`);
  if (!fs.existsSync(scoresFile)) { console.warn(`[gen-seo-pages] no scores for ${cat.id}`); continue; }
  const scores = JSON.parse(fs.readFileSync(scoresFile, "utf8"));
  const counties = Object.values(scores).sort((a, b) => (b.score - a.score) || (b.populationPerBiz - a.populationPerBiz));
  fs.mkdirSync(path.join(DIST, "markets", cat.id), { recursive: true });
  fs.writeFileSync(path.join(DIST, "markets", cat.id, "index.html"), renderCategory(cat, counties));
  n++;
}
fs.writeFileSync(path.join(DIST, "markets", "index.html"), renderIndex(industries));

const urls = ["/", "/markets/", ...industries.map((c) => `/markets/${c.id}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap);

console.log(`[gen-seo-pages] ${n} market pages + index + sitemap (${urls.length} URLs)`);
