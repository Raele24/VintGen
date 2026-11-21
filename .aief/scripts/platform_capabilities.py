#!/usr/bin/env python3
"""Minimal loader and schema validator for core/platform-capabilities.json.

Pure standard-library module used by sync_adapters.py and validate.py to enforce
explicit, evidence-bound platform capability metadata without speculative abstractions.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Set

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CAPABILITIES_PATH = REPO_ROOT / "core" / "platform-capabilities.json"

REQUIRED_TOP_LEVEL_KEYS: Set[str] = {
    "schema_version",
    "framework_version",
    "description",
    "platforms",
}

REQUIRED_PLATFORM_KEYS: Set[str] = {
    "id",
    "display_name",
    "runtime_status",
    "native_skill_dirs",
    "tool_id_map",
    "agent_definition",
    "instruction_entries",
    "workflow_commands",
    "hooks_support",
    "runtime_constraints",
}

REQUIRED_CAPABILITY_DOMAINS: tuple[str, ...] = (
    "native_skill_dirs",
    "tool_id_map",
    "agent_definition",
    "instruction_entries",
    "workflow_commands",
    "hooks_support",
)

VALID_CAPABILITY_STATES: Set[str] = {
    "verified_runtime",
    "verified_static",
    "documentation_derived",
    "planned",
    "unsupported",
    "unknown",
}

VALID_RUNTIME_STATUSES: Set[str] = {
    "RUNTIME_VERIFIED",
    "PARTIAL_RUNTIME_VERIFIED",
    "CONTRACT_VALIDATED",
    "STATICALLY_VALIDATED",
    "DOCUMENTATION_ONLY",
    "BLOCKED_EXTERNAL",
    "NOT_SUPPORTED",
}


class CapabilityModelError(ValueError):
    """Raised when core/platform-capabilities.json fails validation or lookup."""


def _is_non_empty_str(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _is_str_list(value: object) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) and bool(item.strip()) for item in value)


def _validate_domain_state(platform_id: str, domain_name: str, domain_obj: object) -> List[str]:
    errors: List[str] = []
    if not isinstance(domain_obj, dict):
        return [f"Platform '{platform_id}': '{domain_name}' must be an object"]

    state = domain_obj.get("state")
    if state not in VALID_CAPABILITY_STATES:
        errors.append(
            f"Platform '{platform_id}': invalid state '{state}' in '{domain_name}'. "
            f"Allowed: {sorted(VALID_CAPABILITY_STATES)}"
        )

    if domain_name == "native_skill_dirs":
        paths = domain_obj.get("paths")
        if not isinstance(paths, list) or not all(isinstance(p, str) and bool(p.strip()) for p in paths):
            errors.append(f"Platform '{platform_id}': 'native_skill_dirs.paths' must be a list of non-empty strings")
        manifest_file = domain_obj.get("manifest_file")
        if manifest_file is not None and not _is_non_empty_str(manifest_file):
            errors.append(f"Platform '{platform_id}': 'native_skill_dirs.manifest_file' must be string or null")

    elif domain_name == "tool_id_map":
        tool_map = domain_obj.get("canonical_to_native")
        if not isinstance(tool_map, dict) or not all(
            _is_non_empty_str(k) and _is_non_empty_str(v) for k, v in tool_map.items()
        ):
            errors.append(
                f"Platform '{platform_id}': 'tool_id_map.canonical_to_native' must map non-empty strings to strings"
            )

    elif domain_name == "agent_definition":
        for key in ("format", "target_path"):
            if not _is_non_empty_str(domain_obj.get(key)):
                errors.append(f"Platform '{platform_id}': 'agent_definition.{key}' must be a non-empty string")
        unsupported = domain_obj.get("unsupported_fields")
        if not isinstance(unsupported, list) or not all(isinstance(x, str) for x in unsupported):
            errors.append(f"Platform '{platform_id}': 'agent_definition.unsupported_fields' must be a list of strings")

    elif domain_name == "instruction_entries":
        if not _is_str_list(domain_obj.get("root_files")) or not domain_obj.get("root_files"):
            errors.append(
                f"Platform '{platform_id}': 'instruction_entries.root_files' must be a non-empty list of strings"
            )
        scoped_glob = domain_obj.get("scoped_glob")
        if scoped_glob is not None and not _is_non_empty_str(scoped_glob):
            errors.append(f"Platform '{platform_id}': 'instruction_entries.scoped_glob' must be string or null")

    elif domain_name == "workflow_commands":
        for key in ("format", "target_glob"):
            if not _is_non_empty_str(domain_obj.get(key)):
                errors.append(f"Platform '{platform_id}': 'workflow_commands.{key}' must be a non-empty string")
        if not isinstance(domain_obj.get("supports_subagents"), bool):
            errors.append(f"Platform '{platform_id}': 'workflow_commands.supports_subagents' must be a boolean")

    elif domain_name == "hooks_support":
        if not _is_non_empty_str(domain_obj.get("schema_family")):
            errors.append(f"Platform '{platform_id}': 'hooks_support.schema_family' must be a non-empty string")
        target_file = domain_obj.get("target_file")
        if target_file is not None and not _is_non_empty_str(target_file):
            errors.append(f"Platform '{platform_id}': 'hooks_support.target_file' must be string or null")

    return errors


def validate_capability_data(data: object) -> List[str]:
    """Validate parsed capability JSON data and return actionable error strings."""
    if not isinstance(data, dict):
        return ["Platform capabilities root must be a JSON object"]

    errors: List[str] = []
    missing_top = REQUIRED_TOP_LEVEL_KEYS - set(data.keys())
    if missing_top:
        errors.append(f"Missing required top-level keys: {sorted(missing_top)}")

    for key in ("schema_version", "framework_version", "description"):
        if key in data and not _is_non_empty_str(data.get(key)):
            errors.append(f"Top-level '{key}' must be a non-empty string")

    platforms = data.get("platforms")
    if not isinstance(platforms, list) or not platforms:
        errors.append("Top-level 'platforms' must be a non-empty list of platform objects")
        return errors

    seen_ids: Set[str] = set()
    for index, entry in enumerate(platforms):
        if not isinstance(entry, dict):
            errors.append(f"platforms[{index}] must be an object")
            continue

        raw_id = entry.get("id")
        platform_id = raw_id if _is_non_empty_str(raw_id) else f"<index:{index}>"
        if not _is_non_empty_str(raw_id):
            errors.append(f"platforms[{index}]: 'id' must be a non-empty string")
        elif raw_id in seen_ids:
            errors.append(f"Duplicate platform identifier detected: '{raw_id}'")
        else:
            seen_ids.add(raw_id)

        missing_keys = REQUIRED_PLATFORM_KEYS - set(entry.keys())
        if missing_keys:
            errors.append(f"Platform '{platform_id}': missing required keys {sorted(missing_keys)}")

        if "display_name" in entry and not _is_non_empty_str(entry.get("display_name")):
            errors.append(f"Platform '{platform_id}': 'display_name' must be a non-empty string")

        runtime_status = entry.get("runtime_status")
        if runtime_status not in VALID_RUNTIME_STATUSES:
            errors.append(
                f"Platform '{platform_id}': invalid runtime_status '{runtime_status}'. "
                f"Allowed: {sorted(VALID_RUNTIME_STATUSES)}"
            )

        for domain_name in REQUIRED_CAPABILITY_DOMAINS:
            if domain_name in entry:
                errors.extend(_validate_domain_state(platform_id, domain_name, entry[domain_name]))

        constraints = entry.get("runtime_constraints")
        if "runtime_constraints" in entry:
            if not isinstance(constraints, dict):
                errors.append(f"Platform '{platform_id}': 'runtime_constraints' must be an object")
            else:
                for list_key in ("verified_facts", "known_blocks"):
                    val = constraints.get(list_key)
                    if not isinstance(val, list) or not all(isinstance(x, str) for x in val):
                        errors.append(
                            f"Platform '{platform_id}': 'runtime_constraints.{list_key}' must be a list of strings"
                        )

    return errors


def load_platform_capabilities(path: Path = DEFAULT_CAPABILITIES_PATH) -> Dict[str, object]:
    """Load, validate, and deterministically index core/platform-capabilities.json."""
    if not path.exists():
        raise CapabilityModelError(f"Platform capability file not found: {path}")

    try:
        raw_data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise CapabilityModelError(f"Invalid JSON in {path}: {exc}") from exc

    errors = validate_capability_data(raw_data)
    if errors:
        raise CapabilityModelError("Platform capability validation failed:\n  - " + "\n  - ".join(errors))

    by_id: Dict[str, Dict[str, object]] = {}
    platform_ids: List[str] = []
    for entry in raw_data["platforms"]:
        pid = str(entry["id"])
        platform_ids.append(pid)
        by_id[pid] = entry

    return {
        "schema_version": raw_data["schema_version"],
        "framework_version": raw_data["framework_version"],
        "platform_ids": platform_ids,
        "by_id": by_id,
        "raw": raw_data,
    }


def get_platform(model: Dict[str, object], platform_id: str) -> Dict[str, object]:
    """Return deterministic capability definition for platform_id or raise CapabilityModelError."""
    by_id = model.get("by_id")
    if not isinstance(by_id, dict):
        raise CapabilityModelError("Invalid capability model object passed to get_platform()")
    if platform_id not in by_id:
        raise CapabilityModelError(
            f"Unknown platform identifier '{platform_id}'. Known platforms: {sorted(by_id.keys())}"
        )
    return by_id[platform_id]
