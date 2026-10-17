"""Modelos del dominio. Los importes se representan con Decimal, nunca con float."""

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DecisionOutcome(StrEnum):
    APPROVE = "APPROVE"
    BLOCK = "BLOCK"
    ESCALATE = "ESCALATE"


class ApprovalStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELED = "CANCELED"


class InvoiceCreate(BaseModel):
    external_reference: str = Field(min_length=1, max_length=120)
    vendor_name: str = Field(min_length=1, max_length=160)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    currency: str = Field(min_length=3, max_length=3)
    due_date: date
    agreement_reference: str | None = Field(default=None, max_length=120)
    source_filename: str | None = Field(default=None, max_length=255)
    source_type: Literal["manual", "pdf", "image", "email", "chat"] = "manual"
    source_text: str | None = Field(default=None, max_length=20000)

    @field_validator("currency")
    @classmethod
    def currency_uppercase(cls, value: str) -> str:
        value = value.upper()
        if not value.isalpha():
            raise ValueError("La moneda debe ser un código de tres letras")
        return value

    @field_validator("external_reference", "vendor_name")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El campo no puede estar vacío")
        return value


class Invoice(InvoiceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID = Field(default_factory=uuid4)
    version: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    deleted_at: datetime | None = None


class VendorTerm(BaseModel):
    vendor_name: str = Field(min_length=1, max_length=160)
    agreement_reference: str = Field(min_length=1, max_length=120)
    currency: str = Field(min_length=3, max_length=3)
    agreed_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)

    @field_validator("vendor_name", "agreement_reference")
    @classmethod
    def strip_term_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El campo del acuerdo no puede estar vacío")
        return value

    @field_validator("currency")
    @classmethod
    def term_currency_uppercase(cls, value: str) -> str:
        value = value.upper()
        if not value.isalpha():
            raise ValueError("La moneda del acuerdo debe ser un código de tres letras")
        return value


class PolicyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    currency: str = Field(min_length=3, max_length=3)
    allowed_vendors: list[str] = Field(min_length=1)
    max_invoice_amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    period_budget: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    human_approval_threshold: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    approver_ids: list[str] = Field(default_factory=lambda: ["demo-approver"])
    vendor_terms: list[VendorTerm] = Field(default_factory=list)

    @field_validator("currency")
    @classmethod
    def policy_currency_uppercase(cls, value: str) -> str:
        value = value.upper()
        if not value.isalpha():
            raise ValueError("La moneda debe ser un código de tres letras")
        return value

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El nombre no puede estar vacío")
        return value

    @field_validator("allowed_vendors")
    @classmethod
    def normalize_vendors(cls, values: list[str]) -> list[str]:
        normalized = list(dict.fromkeys(value.strip().casefold() for value in values if value.strip()))
        if not normalized:
            raise ValueError("Debe permitirse al menos un proveedor")
        return normalized

    @field_validator("approver_ids")
    @classmethod
    def normalize_approvers(cls, values: list[str]) -> list[str]:
        return list(dict.fromkeys(value.strip() for value in values if value.strip()))

    @field_validator("vendor_terms")
    @classmethod
    def unique_vendor_terms(cls, values: list[VendorTerm]) -> list[VendorTerm]:
        seen: set[tuple[str, str]] = set()
        for term in values:
            key = (term.vendor_name.casefold(), term.agreement_reference.casefold())
            if key in seen:
                raise ValueError("No repitas proveedor y referencia de acuerdo")
            seen.add(key)
        return values


class Policy(PolicyCreate):
    id: UUID = Field(default_factory=uuid4)
    version: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    deleted_at: datetime | None = None


class PolicySnapshot(PolicyCreate):
    id: UUID
    version: int


class InvoiceSnapshot(InvoiceCreate):
    id: UUID
    version: int
    created_at: datetime


class ApprovalResolution(BaseModel):
    outcome: DecisionOutcome
    actor_id: str = Field(min_length=1, max_length=120)
    reason: str = Field(min_length=1, max_length=1000)

    @field_validator("outcome")
    @classmethod
    def only_final_outcomes(cls, value: DecisionOutcome) -> DecisionOutcome:
        if value not in (DecisionOutcome.APPROVE, DecisionOutcome.BLOCK):
            raise ValueError("La resolución debe ser APPROVE o BLOCK")
        return value

    @field_validator("actor_id", "reason")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El campo no puede estar vacío")
        return value


class Decision(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    invoice_id: UUID
    policy_id: UUID
    policy_version: int
    invoice_version: int
    invoice_snapshot: InvoiceSnapshot
    policy_snapshot: PolicySnapshot
    outcome: DecisionOutcome
    reason_codes: list[str]
    explanation: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ApprovalRequest(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    decision_id: UUID
    invoice_id: UUID
    policy_id: UUID
    policy_version: int
    status: ApprovalStatus = ApprovalStatus.PENDING
    requested_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    resolution_reason: str | None = None


class AuditEvent(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    actor: str
    action: str
    entity_type: str
    entity_id: str
    details: dict[str, object] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
