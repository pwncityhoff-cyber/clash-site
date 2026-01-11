import json
from pathlib import Path


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    base = repo / "assets" / "img" / "2025photos"
    out_dir = repo / "assets" / "data" / "2025photos"
    out_dir.mkdir(parents=True, exist_ok=True)

    rounds = sorted([p for p in base.iterdir() if p.is_dir()], key=lambda p: p.name)

    for r in rounds:
        photos = sorted(
            [
                p
                for p in r.rglob("*")
                if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg"}
            ],
            key=lambda p: p.name.lower(),
        )

        rels = [str(p.relative_to(repo)).replace("\\", "/") for p in photos]

        # "Round 1" -> "round-1.json"
        slug = r.name.strip().lower().replace(" ", "-")
        out_path = out_dir / f"{slug}.json"

        payload = {"round": r.name, "count": len(rels), "photos": rels}
        out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"Wrote {out_path} ({len(rels)} photos)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

