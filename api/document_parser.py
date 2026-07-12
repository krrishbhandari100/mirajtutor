import base64
import fitz


def parse_pdf(file_bytes: bytes):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=72)
        img_bytes = pix.tobytes("jpeg", jpg_quality=60)
        pages.append({
            "number": page_num + 1,
            "image_base64": base64.b64encode(img_bytes).decode("utf-8"),
        })

    return {
        "type": "pdf",
        "pages": pages,
        "total_pages": len(pages),
    }


def parse_document(file_bytes: bytes, filename: str):
    if not filename.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are supported")
    return parse_pdf(file_bytes)
