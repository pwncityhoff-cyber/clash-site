from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Literal

import mammoth
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
RACECLASSES_DIR = ROOT / "raceclasses"
OUTPUT_DIR = ROOT / "classes"
DATA_DIR = ROOT / "assets" / "data"
DATA_FILE = DATA_DIR / "classes.json"


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = s.replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"(^-|-$)", "", s)
    return s


def normalize_heading_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip()).lower()


Section = Literal["structure", "rules", "other"]


def classify_section(heading_text: str) -> Section:
    t = normalize_heading_text(heading_text)
    if not t:
        return "other"
    if "structure" in t or "format" in t or "race format" in t or "qualifying" in t:
        return "structure"
    if "rule" in t or "regulation" in t or "tech" in t or "limitations" in t:
        return "rules"
    return "other"


def dedupe_preserve_order(items: Iterable[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for it in items:
        key = it.strip().lower()
        if not key:
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(it.strip())
    return out


@dataclass(frozen=True)
class ClassSummary:
    title: str
    slug: str
    pageHref: str
    sourceDocxHref: str
    structureSummary: list[str]
    rulesSummary: list[str]


def extract_summaries_from_html(html: str) -> tuple[list[str], list[str]]:
    soup = BeautifulSoup(html or "", "html.parser")

    structure: list[str] = []
    rules: list[str] = []
    other: list[str] = []

    current: Section = "other"

    # Walk elements in document order. We'll treat headings as section switches.
    for el in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li"]):
        if el.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            current = classify_section(el.get_text(" ", strip=True))
            continue

        if el.name == "p":
            # Some DOCX conversions represent headings as <p><strong>Heading</strong></p>
            strong = el.find("strong")
            text = el.get_text(" ", strip=True)
            if strong and normalize_heading_text(strong.get_text(" ", strip=True)) == normalize_heading_text(text):
                current = classify_section(text)
            continue

        if el.name == "li":
            text = el.get_text(" ", strip=True)
            if not text:
                continue
            if current == "structure":
                structure.append(text)
            elif current == "rules":
                rules.append(text)
            else:
                other.append(text)

    structure_d = dedupe_preserve_order(structure)
    rules_d = dedupe_preserve_order(rules)
    other_d = dedupe_preserve_order(other)

    structure_summary = structure_d[:5] if structure_d else other_d[:5]

    rules_summary = rules_d[:5]
    if not rules_summary:
        rules_summary = [x for x in other_d if x not in structure_summary][:5]

    return structure_summary, rules_summary


def build_class_page_html(title: str, source_file_name: str, converted_html: str) -> str:
    doc_link = f"../raceclasses/{source_file_name.replace(' ', '%20')}"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} • Clash of the Titans</title>
  <meta name="description" content="Full class rules and details for {title} in the Clash of the Titans race series." />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css" />
</head>
<body>
  <header>
    <div class="container nav">
      <a class="logo" href="../index.html#home">
        <img src="../images/logo.png" alt="Clash of the Titans logo" />
      </a>
      <nav aria-label="Primary">
        <ul>
          <li><a href="../index.html#classes">Classes</a></li>
          <li><a href="../index.html#registration" class="cta-nav">Register</a></li>
          <li><a href="../index.html#schedule">Schedule</a></li>
          <li><a href="../index.html#contact">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <section>
    <div class="container">
      <div class="row between" style="align-items:flex-end; gap:12px">
        <div>
          <h2>{title}</h2>
          <p class="lead">Full class info</p>
        </div>
        <div class="row" style="gap:10px">
          <a class="btn" href="../index.html#classes">Back to Classes</a>
          <a class="btn primary" href="{doc_link}">Download DOCX</a>
        </div>
      </div>

      <div class="card doc-content" style="margin-top:16px">
{converted_html}
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <p class="muted">© <span id="year"></span> Clash of the Titans • A Nitrous Outlet Series</p>
    </div>
    <script src="../script.js"></script>
  </footer>
</body>
</html>
"""


def main() -> int:
    if not RACECLASSES_DIR.exists():
        print(f"Missing folder: {RACECLASSES_DIR}")
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    docx_files = sorted(
        [p for p in RACECLASSES_DIR.iterdir() if p.is_file() and p.suffix.lower() == ".docx"],
        key=lambda p: p.name.lower(),
    )

    if not docx_files:
        print(f"No .docx files found in {RACECLASSES_DIR}")
        return 1

    summaries: list[ClassSummary] = []

    for docx_path in docx_files:
        title = docx_path.stem.strip()
        slug = slugify(title)

        with open(docx_path, "rb") as f:
            result = mammoth.convert_to_html(f)

        html = (result.value or "").strip()
        # Indent into template so generated files are readable
        converted_html = "\n".join([f"        {line}" for line in html.splitlines() if line.strip()]) + "\n"

        structure_summary, rules_summary = extract_summaries_from_html(html)

        out_path = OUTPUT_DIR / f"{slug}.html"
        out_html = build_class_page_html(title=title, source_file_name=docx_path.name, converted_html=converted_html)
        out_path.write_text(out_html, encoding="utf-8")
        print(f"Generated: classes/{slug}.html")

        summaries.append(
            ClassSummary(
                title=title,
                slug=slug,
                pageHref=f"classes/{slug}.html",
                sourceDocxHref=f"raceclasses/{docx_path.name}",
                structureSummary=structure_summary,
                rulesSummary=rules_summary,
            )
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "classes": [s.__dict__ for s in summaries],
    }
    DATA_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote: assets/data/classes.json ({len(summaries)} classes)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

