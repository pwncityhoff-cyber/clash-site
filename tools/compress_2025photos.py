import argparse
import io
import os
from pathlib import Path

from PIL import Image, ImageOps


def iter_images(root: Path) -> list[Path]:
    return [
        p
        for p in root.rglob("*")
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg"}
    ]


def save_jpeg_to_bytes(img: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    img.save(
        buf,
        format="JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
        subsampling="4:2:0",
    )
    return buf.getvalue()


def compress_image(
    path: Path,
    *,
    max_dim: int,
    target_bytes: int,
    min_quality: int,
    max_quality: int,
    skip_under_bytes: int,
) -> tuple[bool, int, int, int]:
    """
    Returns: (changed, old_bytes, new_bytes, chosen_quality)
    """
    old_bytes = path.stat().st_size

    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")

        w, h = im.size
        longest = max(w, h)
        if longest > max_dim:
            scale = max_dim / float(longest)
            new_size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
            im = im.resize(new_size, resample=Image.Resampling.LANCZOS)

        # If it's already small enough (and we didn't resize), don't touch it.
        if old_bytes <= skip_under_bytes and longest <= max_dim:
            return (False, old_bytes, old_bytes, -1)

        # Binary search JPEG quality to hit target_bytes (best effort).
        lo = min_quality
        hi = max_quality
        best_bytes: bytes | None = None
        best_q = lo

        while lo <= hi:
            mid = (lo + hi) // 2
            b = save_jpeg_to_bytes(im, mid)
            if len(b) <= target_bytes:
                best_bytes = b
                best_q = mid
                lo = mid + 1
            else:
                hi = mid - 1

        if best_bytes is None:
            best_q = min_quality
            best_bytes = save_jpeg_to_bytes(im, best_q)

        tmp_path = path.with_name(path.name + ".tmp")
        tmp_path.write_bytes(best_bytes)
        os.replace(tmp_path, path)

        return (True, old_bytes, len(best_bytes), best_q)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Downsize/recompress 2025 photo folders to match target size/quality."
    )
    parser.add_argument(
        "--base",
        default=str(
            Path(__file__).resolve().parents[1] / "assets" / "img" / "2025photos"
        ),
        help="Base folder containing Round folders",
    )
    parser.add_argument(
        "--rounds",
        nargs="*",
        default=["Round 1", "Round 4", "Round 5"],
        help='Round folder names to process (default: "Round 1" "Round 4" "Round 5")',
    )
    parser.add_argument("--max-dim", type=int, default=2048, help="Max long edge px")
    parser.add_argument(
        "--target-kb",
        type=int,
        default=350,
        help="Target output size per image in KB (best effort)",
    )
    parser.add_argument(
        "--skip-under-kb",
        type=int,
        default=450,
        help="Skip images already under this size (KB) if no resize needed",
    )
    parser.add_argument("--min-quality", type=int, default=50)
    parser.add_argument("--max-quality", type=int, default=85)

    args = parser.parse_args()

    base = Path(args.base)
    target_bytes = args.target_kb * 1024
    skip_under_bytes = args.skip_under_kb * 1024

    total_old = 0
    total_new = 0
    changed = 0
    processed = 0

    for round_name in args.rounds:
        folder = base / round_name
        if not folder.exists():
            print(f"[skip] Missing folder: {folder}")
            continue

        files = iter_images(folder)
        print(f"{round_name}: {len(files)} images")

        for i, path in enumerate(files, start=1):
            try:
                did_change, old_b, new_b, q = compress_image(
                    path,
                    max_dim=args.max_dim,
                    target_bytes=target_bytes,
                    min_quality=args.min_quality,
                    max_quality=args.max_quality,
                    skip_under_bytes=skip_under_bytes,
                )
            except Exception as e:
                print(f"[error] {path}: {e}")
                continue

            processed += 1
            total_old += old_b
            total_new += new_b
            if did_change:
                changed += 1

            if i % 25 == 0:
                print(f"  {i}/{len(files)}...")

    if processed == 0:
        print("No images processed.")
        return 0

    print("")
    print(f"Processed: {processed}")
    print(f"Changed:   {changed}")
    print(f"Total:     {total_old/1024/1024:.2f}MB -> {total_new/1024/1024:.2f}MB")
    if total_old:
        print(f"Savings:   {(1 - (total_new/total_old))*100:.1f}%")

    return 0


if __name__ == '__main__':
    raise SystemExit(main())

