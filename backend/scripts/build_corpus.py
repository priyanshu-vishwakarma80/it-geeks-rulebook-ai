"""
Corpus Builder & PDF Generator for IT Geeks Project.
Compiles the Hostel Handbook text into a formatted PDF using ReportLab,
extracts text from all 3 mixed-format documents (Markdown, CSV, PDF),
validates the 6,000+ words requirement, and outputs chunked corpus metadata.
"""

import os
import re
import csv
import json
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CORPUS_DIR = BASE_DIR / "corpus"
RAW_DIR = CORPUS_DIR / "raw"
DATA_DIR = BASE_DIR / "data"

MD_PATH = CORPUS_DIR / "academic_regulations.md"
CSV_PATH = CORPUS_DIR / "fee_schedule.csv"
TXT_PATH = RAW_DIR / "hostel_handbook.txt"
PDF_PATH = CORPUS_DIR / "hostel_handbook.pdf"
CHUNKS_JSON_PATH = DATA_DIR / "corpus_chunks.json"


def generate_hostel_pdf():
    """Generates a professional PDF from hostel_handbook.txt using ReportLab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    print(f"[*] Generating PDF from {TXT_PATH}...")
    with open(TXT_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f172a'),
        alignment=1, # Center
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#2563eb'),
        alignment=1,
        spaceAfter=12
    )
    h1_style = ParagraphStyle(
        'ChapterHeading',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=14,
        spaceAfter=6
    )
    h2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading3'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0f766e'),
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=6
    )

    elements = []
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        
        if line.startswith('# '):
            elements.append(Paragraph(line[2:], title_style))
        elif line.startswith('## '):
            elements.append(Paragraph(line[3:], subtitle_style))
            elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=10))
        elif line.startswith('### '):
            elements.append(Paragraph(line[4:], h1_style))
        elif line.startswith('#### '):
            elements.append(Paragraph(line[5:], h2_style))
        elif line == '---':
            elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0'), spaceAfter=8, spaceBefore=8))
        else:
            # Body text
            clean_text = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            # bold tags
            clean_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', clean_text)
            elements.append(Paragraph(clean_text, body_style))
        i += 1

    doc.build(elements)
    print(f"[+] PDF successfully created at: {PDF_PATH} ({os.path.getsize(PDF_PATH)} bytes)")


def parse_markdown_corpus(filepath):
    """Splits markdown regulations into titled chunks."""
    chunks = []
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    # Split by ### or #### sections
    sections = re.split(r'\n(?=###?#?\s)', text)
    for idx, sec in enumerate(sections):
        lines = sec.strip().split('\n')
        if not lines or not lines[0].strip():
            continue
        header = lines[0].replace('#', '').strip()
        body = '\n'.join(lines[1:]).strip()
        if not body:
            continue

        words = len((header + " " + body).split())
        chunks.append({
            "chunk_id": f"MD-{idx:03d}",
            "document": "academic_regulations.md",
            "doc_format": "markdown",
            "section": header,
            "text": body,
            "full_content": f"{header}\n{body}",
            "word_count": words
        })
    return chunks


def parse_csv_corpus(filepath):
    """Parses tabular CSV fee schedule into structured chunks."""
    chunks = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            clause_code = row.get("Clause_Code", f"FEE-{idx:03d}")
            category = row.get("Category", "General")
            subcategory = row.get("Subcategory", "")
            desc = row.get("Description", "")
            amount = row.get("Amount_INR", "0")
            deadline = row.get("Due_Date_Or_Deadline", "")
            terms = row.get("Special_Terms_And_Conditions", "")

            sec_title = f"{category} - {subcategory} ({clause_code})"
            body = (
                f"Clause Code: {clause_code}\n"
                f"Category: {category} > {subcategory}\n"
                f"Description: {desc}\n"
                f"Fee / Amount: Rs. {amount}\n"
                f"Due Date / Deadline: {deadline}\n"
                f"Terms & Conditions: {terms}"
            )
            words = len((sec_title + " " + body).split())
            chunks.append({
                "chunk_id": f"CSV-{clause_code}",
                "document": "fee_schedule.csv",
                "doc_format": "csv_table",
                "section": sec_title,
                "text": body,
                "full_content": f"{sec_title}\n{body}",
                "word_count": words
            })
    return chunks


def parse_pdf_corpus(filepath):
    """Extracts text from PDF and splits into chapters/sections."""
    from pypdf import PdfReader
    reader = PdfReader(str(filepath))
    full_text = ""
    for page in reader.pages:
        full_text += page.extract_text() + "\n"

    chunks = []
    # Split by CHAPTER or section patterns
    sections = re.split(r'\n(?=(?:CHAPTER|####?\s*\d+\.\d+))', full_text)
    for idx, sec in enumerate(sections):
        lines = [l.strip() for l in sec.strip().split('\n') if l.strip()]
        if not lines:
            continue
        header = lines[0].replace('#', '').strip()
        body = '\n'.join(lines[1:]).strip()
        if not body:
            continue

        words = len((header + " " + body).split())
        chunks.append({
            "chunk_id": f"PDF-{idx:03d}",
            "document": "hostel_handbook.pdf",
            "doc_format": "pdf",
            "section": header,
            "text": body,
            "full_content": f"{header}\n{body}",
            "word_count": words
        })
    return chunks


def build_and_verify():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Generate PDF
    generate_hostel_pdf()

    # 2. Parse all three documents
    md_chunks = parse_markdown_corpus(MD_PATH)
    csv_chunks = parse_csv_corpus(CSV_PATH)
    pdf_chunks = parse_pdf_corpus(PDF_PATH)

    all_chunks = md_chunks + csv_chunks + pdf_chunks

    # Calculate word counts
    md_words = sum(c["word_count"] for c in md_chunks)
    csv_words = sum(c["word_count"] for c in csv_chunks)
    pdf_words = sum(c["word_count"] for c in pdf_chunks)
    total_words = md_words + csv_words + pdf_words

    print("=" * 60)
    print("CORPUS AUDIT & VERIFICATION REPORT:")
    print(f"  - Document 1 (Markdown: academic_regulations.md): {md_words:,} words ({len(md_chunks)} chunks)")
    print(f"  - Document 2 (CSV Table: fee_schedule.csv):       {csv_words:,} words ({len(csv_chunks)} chunks)")
    print(f"  - Document 3 (PDF: hostel_handbook.pdf):          {pdf_words:,} words ({len(pdf_chunks)} chunks)")
    print(f"  TOTAL CORPUS WORD COUNT:                           {total_words:,} WORDS")
    print("=" * 60)

    if total_words >= 6000:
        print(f"[SUCCESS] Exceeds 6,000 words mandatory requirement by {total_words - 6000:,} words!")
    else:
        print(f"[WARNING] Under 6,000 words: needs {6000 - total_words} more words.")

    # Save chunks JSON
    with open(CHUNKS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "metadata": {
                "total_words": total_words,
                "total_chunks": len(all_chunks),
                "documents": [
                    {"name": "academic_regulations.md", "format": "markdown", "words": md_words, "chunks": len(md_chunks)},
                    {"name": "fee_schedule.csv", "format": "csv_table", "words": csv_words, "chunks": len(csv_chunks)},
                    {"name": "hostel_handbook.pdf", "format": "pdf", "words": pdf_words, "chunks": len(pdf_chunks)}
                ]
            },
            "chunks": all_chunks
        }, f, indent=2)

    print(f"[+] Chunk index saved to {CHUNKS_JSON_PATH}")
    return total_words


if __name__ == "__main__":
    build_and_verify()
