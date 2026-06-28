import argparse
import json
from pathlib import Path

import fitz


def normalize_rotation(value):
    if value is None:
        return "auto"

    value = str(value).lower()
    if value in {"auto", "0", "90", "180", "270"}:
        return value

    raise ValueError("rotation must be auto, 0, 90, 180, or 270")


def render_pdf_to_images(pdf_path, output_dir, dpi=200, max_pages=5, rotation="auto"):
    pdf_path = Path(pdf_path).resolve()
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    rotation = normalize_rotation(rotation)
    scale = dpi / 72
    matrix = fitz.Matrix(scale, scale)
    output_files = []

    with fitz.open(pdf_path) as document:
        pages_to_render = min(len(document), max_pages)

        for page_index in range(pages_to_render):
            page = document.load_page(page_index)
            render_matrix = matrix

            if rotation != "auto":
                render_matrix = matrix.prerotate(int(rotation))

            pixmap = page.get_pixmap(matrix=render_matrix, alpha=False)

            # In auto mode PyMuPDF applies the PDF page rotation metadata. If the
            # rendered page is still landscape, rotate it to portrait for invoices.
            if rotation == "auto" and pixmap.width > pixmap.height:
                pixmap = page.get_pixmap(matrix=matrix.prerotate(90), alpha=False)

            output_path = output_dir / f"{pdf_path.stem}-page-{page_index + 1:03}.png"
            pixmap.save(output_path)
            output_files.append(str(output_path))

    return output_files


def main():
    parser = argparse.ArgumentParser(description="Convert PDF pages to PNG images.")
    parser.add_argument("--pdf", required=True, help="Path to the PDF file.")
    parser.add_argument("--output-dir", required=True, help="Directory for rendered PNG files.")
    parser.add_argument("--dpi", type=int, default=200, help="Render DPI.")
    parser.add_argument("--max-pages", type=int, default=5, help="Maximum pages to render.")
    parser.add_argument("--rotation", default="auto", help="auto, 0, 90, 180, or 270.")
    args = parser.parse_args()

    files = render_pdf_to_images(
        pdf_path=args.pdf,
        output_dir=args.output_dir,
        dpi=args.dpi,
        max_pages=args.max_pages,
        rotation=args.rotation,
    )
    print(json.dumps({"images": files}, ensure_ascii=False))


if __name__ == "__main__":
    main()
