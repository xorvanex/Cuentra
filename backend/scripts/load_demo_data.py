"""Carga datos sintéticos de demostración en una API ya iniciada."""

import argparse
import json
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def request_json(url: str, method: str = "GET", body: object | None = None) -> object:
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(
        url,
        data=payload,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8")) if response.status != 204 else None
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"API respondió {error.code}: {detail}") from error


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/api/v1")
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    policy_fixture = json.loads((DATA_DIR / "demo_policy.json").read_text(encoding="utf-8"))
    existing_policies = request_json(f"{base_url}/policies")
    policy = next((item for item in existing_policies if item["name"] == policy_fixture["name"]), None)
    if policy is None:
        policy = request_json(f"{base_url}/policies", "POST", policy_fixture)
    print(f"Política lista: {policy['id']} — {policy['name']}")

    existing_invoices = request_json(f"{base_url}/invoices")
    by_reference = {item["external_reference"]: item for item in existing_invoices}
    invoice_fixtures = json.loads((DATA_DIR / "invoices.sample.json").read_text(encoding="utf-8"))
    for fixture in invoice_fixtures:
        invoice = by_reference.get(fixture["external_reference"])
        if invoice is None:
            invoice = request_json(f"{base_url}/invoices", "POST", fixture)
        print(f"Factura lista: {invoice['id']} — {invoice['external_reference']}")

    print("Datos cargados. Evalúa cada factura en /docs o con POST /invoices/{id}/evaluate.")


if __name__ == "__main__":
    main()
