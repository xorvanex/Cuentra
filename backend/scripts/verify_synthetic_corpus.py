"""Verifica extracción y evaluación HTTP del corpus sin tocar los JSON locales."""

from __future__ import annotations

import json
import sys
import tempfile
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
CORPUS = ROOT / "synthetic-invoices"
sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient

from app.main import app
from app.repositories import local_json


def normalize(value: object) -> str | None:
    return str(value).strip().casefold() if value is not None else None


def main() -> int:
    manifest = json.loads((CORPUS / "manifest.json").read_text(encoding="utf-8"))
    if len(manifest) != 12:
        raise SystemExit(f"Se esperaban 12 entradas en manifest.json; hay {len(manifest)}.")
    policy = json.loads((CORPUS / "company_policy_usd.json").read_text(encoding="utf-8"))
    expected_by_id = {entry["id"]: entry for entry in manifest}
    order = ["PDF-01", "EMAIL-01", "CHAT-01", "IMG-03"]
    order += [entry["id"] for entry in manifest if entry["id"] not in order]
    failures: list[str] = []
    passed = 0
    headers = {"X-Blinka-Workspace": "test"}
    original_test_path = local_json._test_store.path

    with tempfile.TemporaryDirectory(prefix="blinka-corpus-") as temporary:
        local_json._test_store.set_path_for_testing(Path(temporary) / "test-state.json")
        try:
            with TestClient(app) as client:
                response = client.post("/api/v1/policies", headers=headers, json=policy)
                if response.status_code != 201:
                    raise SystemExit(
                        f"No se pudo cargar la política temporal: {response.status_code} {response.text}"
                    )
                policy_id = response.json()["id"]

                for case_id in order:
                    case = expected_by_id[case_id]
                    source = CORPUS / case["filename"]
                    if not source.is_file():
                        failures.append(f"{case_id}: falta el archivo {case['filename']}")
                        continue
                    channel = (
                        "email"
                        if case_id.startswith("EMAIL")
                        else "chat"
                        if case_id.startswith("CHAT")
                        else "auto"
                    )
                    with source.open("rb") as document:
                        response = client.post(
                            "/api/v1/documents/extract",
                            headers=headers,
                            params={"channel": channel},
                            files={"file": (source.name, document, case["media_type"])},
                        )
                    if response.status_code != 200:
                        failures.append(
                            f"{case_id}: extracción HTTP {response.status_code}: {response.text}"
                        )
                        continue
                    extracted = response.json()
                    fields = extracted["fields"]
                    case_failures: list[str] = []
                    comparisons = {
                        "external_reference": case.get("reference"),
                        "vendor_name": case.get("vendor"),
                        "amount": case.get("amount"),
                        "currency": case.get("currency"),
                        "due_date": case.get("due_date"),
                        "agreement_reference": case.get("agreement_reference"),
                    }
                    for key, expected in comparisons.items():
                        actual = fields.get(key)
                        if key == "amount":
                            actual = str(Decimal(actual)) if actual is not None else None
                            expected = str(Decimal(expected)) if expected is not None else None
                        elif key in {
                            "currency",
                            "vendor_name",
                            "external_reference",
                            "agreement_reference",
                        }:
                            actual = normalize(actual)
                            expected = normalize(expected)
                        if actual != expected:
                            case_failures.append(
                                f"{key}: esperado {expected!r}, extraído {actual!r}"
                            )

                    expected_outcome = case.get("expected_outcome")
                    if expected_outcome is None:
                        missing = set(extracted["missing_fields"])
                        if not {"amount", "currency"}.issubset(missing):
                            case_failures.append(
                                "los campos ambiguos no quedaron marcados como faltantes"
                            )
                        if extracted["auto_approval_allowed"]:
                            case_failures.append(
                                "la extracción ambigua habilitó aprobación automática"
                            )
                        if case_failures:
                            failures.extend(f"{case_id}: {failure}" for failure in case_failures)
                        else:
                            passed += 1
                            print(f"PASS {case_id}: revisión humana; importe/moneda faltantes")
                        continue

                    invoice_payload = {
                        **fields,
                        "source_filename": extracted["source_filename"],
                        "source_type": extracted["source_type"],
                        "source_text": extracted["extracted_text"],
                    }
                    response = client.post(
                        "/api/v1/invoices", headers=headers, json=invoice_payload
                    )
                    if response.status_code != 201:
                        failures.append(
                            f"{case_id}: creación HTTP {response.status_code}: {response.text}"
                        )
                        continue
                    invoice_id = response.json()["id"]
                    response = client.post(
                        f"/api/v1/invoices/{invoice_id}/evaluate",
                        headers=headers,
                        params={"policy_id": policy_id},
                    )
                    if response.status_code != 201:
                        failures.append(
                            f"{case_id}: evaluación HTTP {response.status_code}: {response.text}"
                        )
                        continue
                    decision = response.json()
                    expected_reasons = set(case["expected_reason_codes"])
                    if decision["outcome"] != expected_outcome:
                        case_failures.append(
                            f"resultado esperado {expected_outcome}, obtenido {decision['outcome']}"
                        )
                    if not expected_reasons.issubset(set(decision["reason_codes"])):
                        case_failures.append(
                            f"motivos esperados {sorted(expected_reasons)}, obtenidos {decision['reason_codes']}"
                        )
                    if case_failures:
                        failures.extend(f"{case_id}: {failure}" for failure in case_failures)
                    else:
                        passed += 1
                        reasons = ", ".join(decision["reason_codes"])
                        print(f"PASS {case_id}: {decision['outcome']} - {reasons}")
        finally:
            local_json._test_store.set_path_for_testing(original_test_path)
            local_json._test_store._load()

    if failures:
        print("\nFallos:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print(
        f"\nCorpus verificado por API: {passed}/12 casos. JSON operativo y pruebas restaurados intactos."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
