"""Extracción local conservadora para documentos sintéticos de cuentas por pagar."""

import os
import re
from datetime import datetime
from email import policy as email_policy
from email.parser import BytesParser
from io import BytesIO
from pathlib import Path

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_PAGES = 10
MAX_TEXT_CHARS = 20_000
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".txt", ".eml"}
SUPPORTED_CURRENCIES = {"USD", "COP", "EUR", "MXN", "BRL", "ARS", "CLP", "PEN"}


def _labeled_value(text: str, labels: str) -> str | None:
    match = re.search(
        rf"(?im)^\s*(?:{labels})\s*[:#-]\s*(.*?)\s*$",
        text,
    )
    if not match:
        return None
    value = match.group(1).strip()
    # OCR may join neighboring columns onto one line (e.g. "Supplier: X Customer: Y").
    neighboring_label = re.search(
        r"\s+(?=(?:Customer|Bill To|Attn|Issue Date|Date Issued|Currency|Payment Terms|"
        r"Subtotal|Tax|Description|Amount Due|Invoice Number|Purchase Order)\s*[:#-])",
        value,
        flags=re.IGNORECASE,
    )
    return value[: neighboring_label.start()].strip() if neighboring_label else value


def _money(text: str, label: str) -> tuple[str | None, str | None]:
    raw = _labeled_value(text, label)
    if not raw:
        return None, None
    currency_match = re.search(r"\b([A-Z]{3})\b", raw.upper())
    currency = currency_match.group(1) if currency_match else None
    if currency not in SUPPORTED_CURRENCIES:
        currency = None
    amount_match = re.search(
        r"(?<![\w.])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![\w.,])",
        raw,
    )
    if not amount_match:
        return None, currency
    try:
        amount = amount_match.group(1).replace(",", "")
        from decimal import Decimal, InvalidOperation

        parsed = Decimal(amount)
        if parsed <= 0:
            return None, currency
        return f"{parsed:.2f}", currency
    except (InvalidOperation, ValueError):
        return None, currency


def _due_date(text: str) -> str | None:
    raw = _labeled_value(text, r"Due Date|Payment Due|Fecha de vencimiento|Vence")
    if not raw:
        return None
    candidates = [
        (r"\d{4}-\d{2}-\d{2}", "%Y-%m-%d"),
        (r"\d{1,2}/\d{1,2}/\d{4}", "%m/%d/%Y"),
        (r"\d{1,2}-\d{1,2}-\d{4}", "%m-%d-%Y"),
    ]
    for pattern, date_format in candidates:
        match = re.search(pattern, raw)
        if match:
            try:
                return datetime.strptime(match.group(0), date_format).date().isoformat()
            except ValueError:
                return None
    return None


def _read_text(filename: str, content: bytes, channel: str) -> tuple[str, str, list[str]]:
    extension = Path(filename).suffix.lower()
    warnings: list[str] = []
    source_type = channel
    if extension == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(content), strict=False)
        text = "\n".join((page.extract_text() or "") for page in reader.pages[:MAX_PAGES])
        if not text.strip():
            warnings.append("El PDF no tiene texto seleccionable; requiere OCR o captura manual.")
        return text, "pdf", warnings
    if extension in {".png", ".jpg", ".jpeg"}:
        from PIL import Image, UnidentifiedImageError

        try:
            image = Image.open(BytesIO(content))
            image.verify()
            image = Image.open(BytesIO(content))
        except (UnidentifiedImageError, OSError) as error:
            raise ValueError("El archivo no contiene una imagen PNG o JPEG válida.") from error
        try:
            import pytesseract

            command = os.getenv("TESSERACT_CMD")
            if (
                not command
                and os.name == "nt"
                and pytesseract.pytesseract.tesseract_cmd.casefold()
                in {"tesseract", "tesseract.exe"}
            ):
                default_command = (
                    Path(os.getenv("ProgramFiles", "C:/Program Files"))
                    / "Tesseract-OCR"
                    / "tesseract.exe"
                )
                if default_command.is_file():
                    command = str(default_command)
            if command:
                pytesseract.pytesseract.tesseract_cmd = command
            language = os.getenv("TESSERACT_LANG", "eng")
            tessdata_dir = os.getenv("TESSERACT_TESSDATA_DIR")
            config = f'--tessdata-dir "{tessdata_dir}"' if tessdata_dir else ""
            return (
                pytesseract.image_to_string(image, lang=language, config=config),
                "image",
                warnings,
            )
        except (ImportError, OSError) as error:
            warnings.append(
                "OCR local no disponible. Instala Tesseract OCR o revisa/captura los campos manualmente."
            )
            if error.__class__.__name__ != "TesseractNotFoundError":
                warnings.append("No se pudo iniciar el motor OCR instalado.")
            return "", "image", warnings
    if extension == ".eml":
        message = BytesParser(policy=email_policy.default).parsebytes(content)
        part = message.get_body(preferencelist=("plain",))
        body = part.get_content() if part else ""
        headers = "\n".join(
            f"{label}: {message.get(label)}"
            for label in ("Subject", "From", "Date")
            if message.get(label)
        )
        return f"{headers}\n\n{body}", "email", warnings
    if extension == ".txt":
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as error:
            raise ValueError("El texto debe estar codificado en UTF-8.") from error
        if source_type == "auto":
            source_type = "email" if re.search(r"(?im)^(from|to|subject|de):\s*", text) else "chat"
        elif source_type not in {"email", "chat"}:
            source_type = "chat"
        return text, source_type, warnings
    raise ValueError("Formato no admitido. Usa PDF, PNG, JPG, TXT o EML.")


def extract_invoice_fields(
    filename: str, content: bytes, channel: str = "auto"
) -> dict[str, object]:
    """Extrae texto y campos sugeridos; no crea ni evalúa una factura."""
    safe_name = Path(filename.replace("\\", "/")).name[:255]
    extension = Path(safe_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Formato no admitido. Usa PDF, PNG, JPG, TXT o EML.")
    if not content:
        raise ValueError("El archivo está vacío.")
    if len(content) > MAX_FILE_BYTES:
        raise ValueError("El archivo supera el límite local de 10 MB.")
    if channel not in {"auto", "email", "chat"}:
        raise ValueError("El canal debe ser auto, email o chat.")

    text, source_type, warnings = _read_text(safe_name, content, channel)
    text = text[:MAX_TEXT_CHARS]
    reference = _labeled_value(
        text,
        r"Invoice Number|Invoice No\.?|Invoice ID|Reference|Factura|Referencia",
    )
    vendor = _labeled_value(text, r"Supplier|Vendor|Proveedor|Beneficiary|Beneficiario")
    amount, currency = _money(
        text,
        r"Total Due|Invoice Total|Total|Amount Due|Amount|Importe",
    )
    agreement_reference = _labeled_value(
        text,
        r"Purchase Order|PO Reference|Agreement Reference|Orden de compra|Acuerdo",
    )
    fields = {
        "external_reference": reference,
        "vendor_name": vendor,
        "amount": amount,
        "currency": currency,
        "due_date": _due_date(text),
        "agreement_reference": agreement_reference,
    }
    required_fields = ("external_reference", "vendor_name", "amount", "currency", "due_date")
    missing_fields = [field for field in required_fields if not fields[field]]
    if missing_fields:
        warnings.append("Revisa o completa manualmente los campos que no se pudieron detectar.")
    return {
        "source_filename": safe_name,
        "source_type": source_type,
        "extracted_text": text,
        "fields": fields,
        "missing_fields": missing_fields,
        "warnings": warnings,
        "ready_for_review": True,
        "auto_approval_allowed": False,
    }
