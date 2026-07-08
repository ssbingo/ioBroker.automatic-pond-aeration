// ============================================================================
//  Design template for the "Automatic Pond Aeration" user manual.
//  Shared by manual.en.typ and manual.de.typ. Modern, clean, colour-coded.
//  Rendered to PDF with typst (see build.mjs).
// ============================================================================

// --- brand palette (matches the adapter icon: pond blues) -------------------
#let ink      = rgb("#0A4D68") // deep pond blue (headings)
#let teal     = rgb("#1B98B5") // bright water blue (accents)
#let sky      = rgb("#E8F4F8") // pale water (backgrounds)
#let dark     = rgb("#12303a") // body text
#let muted    = rgb("#5b7683") // secondary text
#let hairline = rgb("#d3e2e8") // hairlines
#let warn     = rgb("#c0392b") // danger red
#let warnbg   = rgb("#fdecea")
#let safe     = rgb("#b9770e") // safety amber
#let safebg   = rgb("#fef6e6")
#let ok       = rgb("#1e7a46") // success green
#let okbg     = rgb("#e8f6ee")
#let tip      = teal
#let tipbg    = sky

// --- a numbered source reference: superscript link to the References anchor --
#let src(n) = super(link(label("ref-" + str(n)))[[#n]])

// --- callout boxes (font-safe: a coloured chip marker, no emoji glyphs) ------
// Chip labels are localised via a document-level language state set by manual().
#let doclang = state("doclang", "en")
#let CHIP = (
  en: (warning: "WARNING", safety: "SAFETY", tip: "TIP", note: "NOTE", ok: "OK"),
  de: (warning: "WARNUNG", safety: "SICHERHEIT", tip: "TIPP", note: "HINWEIS", ok: "OK"),
)

#let callout(bg, accent, key, title, body) = context {
  let tag = CHIP.at(doclang.get(), default: CHIP.en).at(key)
  block(
    width: 100%, inset: 10pt, radius: 6pt, fill: bg,
    stroke: (left: 3pt + accent),
    above: 10pt, below: 10pt,
  )[
    #grid(columns: (auto, 1fr), gutter: 7pt, align: horizon,
      box(inset: (x: 5pt, y: 2pt), radius: 3pt, fill: accent)[
        #text(fill: white, weight: "bold", size: 7.5pt, tracking: 0.5pt)[#tag]],
      text(fill: accent, weight: "bold")[#title])
    #v(3pt)
    #set text(fill: dark)
    #body
  ]
}

#let warning(title, body) = callout(warnbg, warn, "warning", title, body)
#let safety(title, body)  = callout(safebg, safe, "safety", title, body)
#let tipbox(title, body)  = callout(tipbg, tip, "tip", title, body)
#let notebox(title, body) = callout(rgb("#eef1f3"), muted, "note", title, body)
#let okbox(title, body)   = callout(okbg, ok, "ok", title, body)

// --- a numbered "how to" step list ------------------------------------------
#let steps(..items) = {
  let arr = items.pos()
  for (i, it) in arr.enumerate() {
    block(above: 6pt, below: 6pt)[
      #grid(columns: (auto, 1fr), gutter: 10pt,
        align(horizon)[#box(width: 22pt, height: 22pt, radius: 11pt, fill: teal,
          align(center + horizon)[#text(fill: white, weight: "bold", size: 11pt)[#(i + 1)]])],
        align(horizon)[#it])
    ]
  }
}

// --- key/value spec table ---------------------------------------------------
#let spec(..rows) = table(
  columns: (auto, 1fr), stroke: none, inset: 6pt,
  fill: (_, y) => if calc.odd(y) { sky } else { white },
  ..rows.pos().map(r => (text(weight: "bold", fill: ink)[#r.at(0)], r.at(1))).flatten(),
)

// ============================================================================
//  Main document wrapper
// ============================================================================
#let manual(
  title: "",
  subtitle: "",
  lang: "en",
  version: "",
  date: "",
  edition: "",   // "English edition" / "Deutsche Ausgabe"
  tagline: "",   // one line under the title on the cover
  tocTitle: "Contents",
  warnTitle: "",
  warnBody: [],
  body,
) = {
  set document(title: title, author: "ssbingo")
  doclang.update(lang)
  set text(font: "DejaVu Sans", size: 10pt, lang: lang, fill: dark)
  set par(justify: true, leading: 0.72em, spacing: 0.9em)

  // running header/footer from page 2 onward
  set page(
    paper: "a4",
    margin: (x: 2cm, top: 2.3cm, bottom: 1.8cm),
    header: context {
      if counter(page).get().first() > 1 {
        set text(size: 8pt, fill: muted)
        grid(columns: (1fr, auto),
          align(left)[#title],
          align(right)[#edition])
        v(-6pt); line(length: 100%, stroke: 0.5pt + hairline)
      }
    },
    footer: context {
      if counter(page).get().first() > 1 {
        set text(size: 8pt, fill: muted)
        line(length: 100%, stroke: 0.5pt + hairline)
        v(-4pt)
        grid(columns: (1fr, auto, 1fr),
          align(left)[ioBroker.automatic-pond-aeration],
          align(center)[#context counter(page).display()],
          align(right)[v#version])
      }
    },
  )

  // link styling
  show link: it => text(fill: teal, it)

  // heading styling (numbered)
  set heading(numbering: "1.1")
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    block(above: 0pt, below: 12pt)[
      #set text(fill: ink, size: 20pt, weight: "bold")
      #block(spacing: 4pt)[#text(fill: teal, size: 13pt)[#counter(heading).display()]]
      #it.body
      #v(2pt)
      #line(length: 100%, stroke: 1.5pt + teal)
    ]
  }
  show heading.where(level: 2): it => block(above: 14pt, below: 6pt)[
    #set text(fill: ink, size: 13pt, weight: "bold")
    #counter(heading).display() #h(4pt) #it.body
  ]
  show heading.where(level: 3): it => block(above: 10pt, below: 4pt)[
    #set text(fill: teal, size: 11pt, weight: "bold")
    #it.body
  ]

  // tables: clean, zebra, coloured header row
  set table(stroke: none, inset: 6pt)
  show table.cell.where(y: 0): set text(fill: white, weight: "bold")

  // =============================== COVER ====================================
  set page(header: none, footer: none)
  block(width: 100%, height: 100%)[
    #place(top + left, dx: -2cm, dy: -2.3cm,
      rect(width: 21cm, height: 11cm, fill: gradient.linear(ink, teal, angle: 35deg)))
    #place(top + right, dx: 2cm, dy: -0.3cm,
      box(width: 3.4cm, height: 3.4cm, radius: 12pt, clip: true,
        image("assets/icon.png", width: 3.4cm)))
    #v(3.2cm)
    #text(fill: white, size: 12pt, weight: "bold", tracking: 2pt)[#upper(edition)]
    #v(2pt)
    #text(fill: white, size: 30pt, weight: "bold")[#title]
    #v(4pt)
    #text(fill: rgb("#cdeaf2"), size: 14pt)[#subtitle]
    #v(10pt)
    #text(fill: rgb("#eaf7fb"), size: 10.5pt)[#tagline]
    #v(5.2cm)
    #warning(warnTitle, warnBody)
    #v(1fr)
    #let metaItem(k, v) = [
      #text(fill: ink, weight: "bold", size: 9pt, tracking: 1pt)[#upper(k)] \
      #text(fill: dark, size: 11pt)[#v]
    ]
    #grid(columns: (1fr, 1fr, 1fr), gutter: 8pt,
      metaItem("Adapter", "ioBroker.automatic-pond-aeration"),
      metaItem("Version", "v" + version),
      metaItem(if lang == "de" { "Stand" } else { "Date" }, date))
  ]

  // =============================== TOC ======================================
  pagebreak()
  {
    set page(header: none)
    text(fill: ink, size: 18pt, weight: "bold")[#tocTitle]
    v(2pt); line(length: 100%, stroke: 1.5pt + teal); v(6pt)
    show outline.entry.where(level: 1): it => {
      v(4pt, weak: true)
      text(fill: ink, weight: "bold")[#it]
    }
    outline(title: none, indent: 1.1em, depth: 2)
  }

  // =============================== BODY =====================================
  body
}
