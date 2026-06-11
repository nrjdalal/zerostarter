import { instance } from "@viz-js/viz"

// Same method as build-sizes.ts: emit DOT, render via @viz-js/viz (Graphviz as
// wasm, no `dot` binary needed), then post-process the SVG for a transparent
// background and the project accent (#f97316). Run manually to (re)generate:
//   bun .github/scripts/blog-graphs.ts

const ACCENT = "#f97316"

const theme = (svg: string): string =>
  svg
    .replaceAll('fill="white"', 'fill="none"')
    .replaceAll('fill="#ffffff"', 'fill="none"')
    .replaceAll('fill="#fff"', 'fill="none"')
    .replaceAll('fill="black"', `fill="${ACCENT}"`)
    .replace(/stroke="[^"]*"/g, `stroke="${ACCENT}"`)
    .replace(/stroke:[^;]*;/g, `stroke:${ACCENT};`)
    .replace(/<text([^>]*)>/g, `<text$1 fill="${ACCENT}">`)
    .replaceAll(`stroke="${ACCENT}" points="-4,4`, 'stroke="none" points="-4,4')

const graphs: Array<{ name: string; dot: string }> = [
  {
    // The problem: two sessions clobber one shared "active account".
    name: "gh-account-clash",
    dot: `digraph {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style="rounded", fontname="Helvetica", fontsize=13, margin="0.22,0.12"];
  edge [fontname="Helvetica", fontsize=11];

  work     [label="Work session\\n~/work/api"];
  personal [label="Personal session\\n~/personal/blog"];
  acct     [label="gh active account\\none global value · last writer wins", style="rounded,bold"];

  work     -> acct [label="switch → acme-inc"];
  personal -> acct [label="switch → nrjdalal"];
  acct     -> work [label="next call: WRONG user", style=dashed];
}`,
  },
  {
    // The fix: each directory resolves its own identity, nothing shared.
    name: "scope-by-path",
    dot: `digraph {
  rankdir=LR;
  bgcolor="transparent";
  node [shape=box, style="rounded", fontname="Helvetica", fontsize=13, margin="0.22,0.14"];
  edge [fontname="Helvetica", fontsize=11];

  work     [label="~/work/*"];
  personal [label="~/personal/*"];
  work_id     [label="acme-inc\\nGITHUB_TOKEN · linear-work\\ngit: neeraj@acme.inc"];
  personal_id [label="nrjdalal\\nGITHUB_TOKEN · linear-personal\\ngit: admin@nrjdalal.com"];

  work     -> work_id     [label="resolves to"];
  personal -> personal_id [label="resolves to"];
}`,
  },
  {
    // The mechanism: the chpwd hook's token resolution, as a flowchart.
    name: "chpwd-flow",
    dot: `digraph {
  rankdir=TB;
  bgcolor="transparent";
  node [fontname="Helvetica", fontsize=13, margin="0.2,0.1"];
  edge [fontname="Helvetica", fontsize=11];

  cd       [label="cd into a directory", shape=box, style="rounded"];
  q1       [label="PWD under ~/work/ ?", shape=diamond];
  q2       [label="PWD under ~/personal/ ?", shape=diamond];
  work     [label="GITHUB_TOKEN =\\ngh token for acme-inc", shape=box, style="rounded"];
  personal [label="GITHUB_TOKEN =\\ngh token for nrjdalal", shape=box, style="rounded"];
  none     [label="unset GITHUB_TOKEN", shape=box, style="rounded"];

  cd -> q1;
  q1 -> work     [label="yes"];
  q1 -> q2       [label="no"];
  q2 -> personal [label="yes"];
  q2 -> none     [label="no"];
}`,
  },
]

const viz = await instance()
const outDir = "web/next/public/diagrams"

for (const { name, dot } of graphs) {
  const svg = theme(viz.renderString(dot, { format: "svg" }))
  const out = `${outDir}/${name}.svg`
  await Bun.write(out, svg)
  console.log(`blog-graphs: wrote ${out} (${(svg.length / 1024).toFixed(1)} kB)`)
}
