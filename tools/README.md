# Tools

## Class pages generator (DOCX → HTML)

This repo keeps full class rules in `raceclasses/*.docx`, and generates readable HTML pages into `classes/*.html`.

### Install + generate

```bash
python -m pip install -r requirements.txt
python tools/convert_raceclasses.py
```

Outputs:
- `classes/*.html`
- `assets/data/classes.json` (summaries for homepage cards)

