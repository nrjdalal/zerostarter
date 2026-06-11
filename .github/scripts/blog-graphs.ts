import { instance } from "@viz-js/viz"

// Same method as build-sizes.ts: emit DOT, render via @viz-js/viz (Graphviz as
// wasm, no `dot` binary needed). Colors are set explicitly in the DOT (project
// accent #06b6d4 with translucent fills that read in both light and dark mode),
// so post-processing only strips the opaque background. Run manually to
// (re)generate:  bun .github/scripts/blog-graphs.ts

const ACCENT = "#06b6d4"
const FILL = "#06b6d418" // ~9% accent — card background
const FILL_STRONG = "#06b6d42e" // ~18% accent — emphasised node
const FILL_FAINT = "#06b6d40d" // ~5% accent — muted / terminal node

const NODE = `shape=box, style="filled,rounded", fillcolor="${FILL}", color="${ACCENT}", fontcolor="${ACCENT}", penwidth=1.6, fontname="Helvetica", fontsize=13, margin="0.3,0.2"`
const EDGE = `color="${ACCENT}", fontcolor="${ACCENT}", penwidth=1.5, fontname="Helvetica", fontsize=11, arrowsize=0.9`

const theme = (svg: string): string =>
  svg
    .replaceAll('fill="white"', 'fill="none"')
    .replaceAll('fill="#ffffff"', 'fill="none"')
    .replaceAll('fill="#fff"', 'fill="none"')
    .replaceAll('fill="black"', `fill="${ACCENT}"`)
    .replaceAll('stroke="black"', `stroke="${ACCENT}"`)

const graphs: Array<{ name: string; dot: string }> = [
  {
    // The problem: two sessions clobber one shared "active account", in order.
    name: "gh-account-clash",
    dot: `digraph {
  rankdir=LR; bgcolor="transparent"; nodesep=0.45; ranksep=0.9; pad=0.25;
  node [${NODE}];
  edge [${EDGE}];

  work     [label=<<B>Work session</B><BR/><FONT POINT-SIZE="11">~/work/api</FONT>>];
  personal [label=<<B>Personal session</B><BR/><FONT POINT-SIZE="11">~/personal/blog</FONT>>];
  acct     [label=<<B>gh active account</B><BR/><FONT POINT-SIZE="11">one global value</FONT>>, fillcolor="${FILL_STRONG}", penwidth=2.2];

  work     -> acct [label="①  switch → acme-inc"];
  personal -> acct [label="②  switch → nrjdalal"];
  acct     -> work [label="③  call runs as nrjdalal  ✗", style=dashed, penwidth=2, constraint=false];
}`,
  },
  {
    // The fix: each directory resolves its own identity, nothing shared.
    name: "scope-by-path",
    dot: `digraph {
  rankdir=LR; bgcolor="transparent"; nodesep=0.5; ranksep=0.9; pad=0.25;
  node [${NODE}];
  edge [${EDGE}];

  work        [label=<<B>~/work/*</B>>];
  work_id     [label=<<FONT POINT-SIZE="13">gh: <B>acme-inc</B></FONT><BR/><FONT POINT-SIZE="11">MCP: linear-work · notion-work · slack-work<BR/>git: neeraj@acme.inc</FONT>>, fillcolor="${FILL_STRONG}"];
  personal    [label=<<B>~/personal/*</B>>];
  personal_id [label=<<FONT POINT-SIZE="13">gh: <B>nrjdalal</B></FONT><BR/><FONT POINT-SIZE="11">MCP: linear-personal · notion-personal<BR/>git: admin@nrjdalal.com</FONT>>, fillcolor="${FILL_STRONG}"];

  work     -> work_id     [label="resolves to"];
  personal -> personal_id [label="resolves to"];
}`,
  },
  {
    // The mechanism: the chpwd hook's token resolution, as a flowchart.
    name: "chpwd-flow",
    dot: `digraph {
  rankdir=TB; bgcolor="transparent"; nodesep=0.55; ranksep=0.75; pad=0.25;
  node [fontname="Helvetica", fontsize=13, fontcolor="${ACCENT}", color="${ACCENT}", penwidth=1.6];
  edge [${EDGE}];

  cd       [label="cd into a directory", shape=box, style="filled,rounded", fillcolor="${FILL}", margin="0.3,0.18"];
  q1       [label="PWD under\\n~/work/ ?", shape=diamond, style=filled, fillcolor="${FILL}"];
  q2       [label="PWD under\\n~/personal/ ?", shape=diamond, style=filled, fillcolor="${FILL}"];
  work     [label=<<B>GITHUB_TOKEN</B><BR/><FONT POINT-SIZE="11">gh token · acme-inc</FONT>>, shape=box, style="filled,rounded", fillcolor="${FILL_STRONG}", margin="0.3,0.18"];
  personal [label=<<B>GITHUB_TOKEN</B><BR/><FONT POINT-SIZE="11">gh token · nrjdalal</FONT>>, shape=box, style="filled,rounded", fillcolor="${FILL_STRONG}", margin="0.3,0.18"];
  none     [label="unset GITHUB_TOKEN", shape=box, style="filled,rounded,dashed", fillcolor="${FILL_FAINT}", margin="0.3,0.18"];

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
