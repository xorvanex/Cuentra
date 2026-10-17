"""Recepción y extracción local preliminar de documentos sintéticos."""

import logging
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.application.document_ingestion import MAX_FILE_BYTES, extract_invoice_fields

router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)


@router.post("/extract")
async def extract_document(
    file: Annotated[UploadFile, File()],
    channel: Annotated[str, Query(pattern="^(auto|email|chat)$")] = "auto",
) -> dict[str, object]:
    filename = file.filename or "document"
    try:
        content = await file.read(MAX_FILE_BYTES + 1)
        return extract_invoice_fields(filename, content, channel)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        # Parser-specific failures are reported as invalid document data, without internals.
        logger.exception("Local extraction failed for document %s", Path(filename).name)
        raise HTTPException(
            status_code=422,
            detail="No se pudo leer el documento. Comprueba que el archivo no esté dañado.",
        ) from error
    finally:
        await file.close()
