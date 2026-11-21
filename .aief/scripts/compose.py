#!/usr/bin/env python3
"""Consumer composition engine for AI Engineering Framework.

Composes active framework rules, granular feature toggles (disabled skills, agents,
phases, gates, mechanisms), and project-owned customizations (.framework-custom/)
into platform-native inline instructions and skill projections across all 5 platforms.

Can be executed standalone inside any bootstrapped consumer repository (`python scripts/compose.py`)
or imported directly by `scripts/bootstrap.py`. Pure Python standard library.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import posixpath
import re
import stat
import sys
from typing import Dict, Iterable, List, Set, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import platform_capabilities  # noqa: E402

def _default_repo_root() -> Path:
    parent = SCRIPT_DIR.parent
    return parent.parent if parent.name == ".aief" else parent


AIEF_DIR = ".aief"
DEFAULT_OVERLAY_DIR = ".aief/custom"
ISOLATED_CONFIG_REL = ".aief/config.json"
ISOLATED_LOCK_REL = ".aief/lock.json"
ISOLATED_STATE_REL = ".aief/state"
LEGACY_OVERLAY_DIR = ".framework-custom"
LEGACY_CONFIG_REL = "project.framework.json"
LEGACY_LOCK_REL = ".framework-lock.json"
LEGACY_STATE_REL = ".framework-state"
FRAMEWORK_ASSET_SUBDIRS: Tuple[str, ...] = (
    "core/",
    "agents/",
    "skills/",
    "workflows/",
    "templates/",
    "quality/",
    "security/",
    "integrations/",
    "scripts/",
)
DEFAULT_INJECTION_MODE = "inline"
DEFAULT_INLINE_MAX_BYTES = 16384
MAX_INLINE_BYTES_CAP = 65536
LOCKFILE_NAME = ISOLATED_LOCK_REL
LOCKFILE_SCHEMA_VERSION = "2.0.0"


def resolve_consumer_layout(root: Path, force_layout: str | None = None) -> Dict[str, str]:
    """Resolve isolated (.aief/) vs legacy root consumer paths."""
    is_legacy = force_layout == "legacy" or (
        force_layout != "isolated"
        and not (root / AIEF_DIR).is_dir()
        and ((root / LEGACY_LOCK_REL).exists() or (root / LEGACY_CONFIG_REL).exists())
    )
    if is_legacy:
        return {
            "mode": "legacy",
            "fw_prefix": "",
            "config_rel": LEGACY_CONFIG_REL,
            "lock_rel": LEGACY_LOCK_REL,
            "state_rel": LEGACY_STATE_REL,
            "overlay_default": LEGACY_OVERLAY_DIR,
            "hooks_rel": "adapters/antigravity/hooks.json",
            "agy_skills_rel": "adapters/antigravity/skills.json",
            "agy_mcp_rel": "adapters/antigravity/mcp_config.json",
            "compose_cmd": "python scripts/compose.py",
            "validate_cmd": "python scripts/validate.py --mode consumer",
        }
    return {
        "mode": "isolated",
        "fw_prefix": f"{AIEF_DIR}/",
        "config_rel": ISOLATED_CONFIG_REL,
        "lock_rel": ISOLATED_LOCK_REL,
        "state_rel": ISOLATED_STATE_REL,
        "overlay_default": DEFAULT_OVERLAY_DIR,
        "hooks_rel": f"{AIEF_DIR}/adapters/antigravity/hooks.json",
        "agy_skills_rel": f"{AIEF_DIR}/adapters/antigravity/skills.json",
        "agy_mcp_rel": f"{AIEF_DIR}/adapters/antigravity/mcp_config.json",
        "compose_cmd": f"python {AIEF_DIR}/scripts/compose.py",
        "validate_cmd": f"python {AIEF_DIR}/scripts/validate.py --mode consumer",
    }

SUPPORTED_PROJECTION_ROOTS: Set[str] = {".agents/skills", ".claude/skills"}
TEXT_SUFFIXES: Set[str] = {
    ".md",
    ".json",
    ".py",
    ".csv",
    ".cjs",
    ".js",
    ".ts",
    ".txt",
    ".yaml",
    ".yml",
    ".toml",
    ".gitignore",
}

VALID_OWNERSHIP_CLASSES: Set[str] = {
    "framework_managed",
    "platform_projected_skill",
    "consumer_owned",
    "consumer_customized_generated",
    "consumer_custom_skill",
    "consumer_custom_agent",
    "consumer_custom_prompt",
    "consumer_custom_mcp",
    "obsolete_framework_managed",
    "unknown_untracked",
}

RESERVED_PROMPT_SLUGS: Set[str] = {"grill-me", "validate-framework", "workflow"}
MCP_SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
MCP_SECRET_PATTERNS: Tuple[Tuple[str, re.Pattern[str]], ...] = (
    ("PRIVATE_KEY_HEADER", re.compile(r"-----BEGIN (?:RSA|OPENSSH|EC|DSA) PRIVATE KEY-----")),
    ("GITHUB_PAT", re.compile(r"ghp_[A-Za-z0-9]{36}")),
    ("GITHUB_FINE_PAT", re.compile(r"github_pat_[A-Za-z0-9_]{82}")),
    ("OPENAI_KEY", re.compile(r"sk-proj-[A-Za-z0-9_-]{40,}")),
    ("ANTHROPIC_KEY", re.compile(r"sk-ant-api03-[A-Za-z0-9_-]{80,}")),
    ("AWS_ACCESS_KEY", re.compile(r"AKIA[0-9A-Z]{16}")),
)

VALID_GATES: Tuple[str, ...] = (
    "Gate-01a",
    "Gate-01b",
    "Gate-02",
    "Gate-03",
    "Gate-Sec",
    "Gate-04",
    "Gate-05",
)
VALID_MECHANISMS: Set[str] = {"tdd", "handoffs", "graphify", "code-review"}

FENCED_CODE_RE = re.compile(r"```.*?```", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
REQUIRED_SKILLS_LINE_RE = re.compile(r"^(required_skills:\s*\[)([^\]]*)(\]\s*)$", re.MULTILINE)
SHA256_HEX_RE = re.compile(r"^[0-9a-fA-F]{64}$")
WINDOWS_DRIVE_RE = re.compile(r"^[A-Za-z]:")

DEFAULT_CUSTOM_INSTRUCTIONS_TEMPLATE = """# Project-Specific AI Instructions (Consumer-Owned)

<!--
  Add architecture notes, build/test commands, database rules, naming conventions,
  and domain constraints specific to this repository below.
  Run `python .aief/scripts/compose.py` after editing to refresh platform entry files.
  This custom folder is NEVER overwritten by `bootstrap.py --update` or `aief update`.
-->
"""

OPTIONAL_PACK_DIRS: Dict[str, str] = {
    "communication": "skills/optional/communication",
    "context-engineering": "skills/optional/context-engineering",
    "agent-architecture": "skills/optional/agent-architecture",
    "frontend-design": "skills/optional/frontend-design",
    "growth-media": "skills/optional/growth-media",
}


class BootstrapSecurityError(ValueError):
    """Raised when a target path attempts traversal, symlink escape, or case collision."""


class LockfileError(ValueError):
    """Raised when .framework-lock.json is corrupted or ambiguous (fail-closed)."""


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def validate_safe_rel_path(rel_path: str, label: str = "path") -> str:
    """Reject traversal, absolute paths, drive prefixes, and NUL bytes; return POSIX rel path."""
    if not isinstance(rel_path, str) or not rel_path.strip():
        raise BootstrapSecurityError(f"Unsafe empty {label}")
    if "\x00" in rel_path:
        raise BootstrapSecurityError(f"NUL byte rejected in {label}: {rel_path!r}")
    normalized_raw = rel_path.replace("\\", "/")
    if normalized_raw.startswith("/") or WINDOWS_DRIVE_RE.match(normalized_raw):
        raise BootstrapSecurityError(f"Absolute or drive-qualified {label} rejected: {rel_path}")
    parts = [p for p in normalized_raw.split("/") if p != ""]
    if not parts or any(part in {".", ".."} for part in parts):
        raise BootstrapSecurityError(f"Path traversal or dot segment rejected in {label}: {rel_path}")
    return "/".join(parts)


def is_reparse_or_symlink(path: Path) -> bool:
    """Return True if path is a symlink or Windows junction/reparse point without following it."""
    if path.is_symlink():
        return True
    try:
        st = os.lstat(path)
    except OSError:
        return False
    attrs = getattr(st, "st_file_attributes", 0)
    reparse_flag = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x0400)
    return bool(attrs & reparse_flag)


def assert_safe_target_path(base_root: Path, rel_path: str, label: str = "destination") -> Path:
    """Validate rel_path stays inside base_root and traverses no symlinks or Windows junctions."""
    safe_rel = validate_safe_rel_path(rel_path, label=label)
    base_resolved = base_root.resolve()
    current = base_root
    for segment in safe_rel.split("/"):
        current = current / segment
        if current.exists() or is_reparse_or_symlink(current):
            if is_reparse_or_symlink(current):
                raise BootstrapSecurityError(
                    f"Symlink or reparse point rejected at {current.relative_to(base_root).as_posix()}"
                )
    dst = base_root / Path(safe_rel)
    resolved = dst.resolve(strict=False)
    if not resolved.is_relative_to(base_resolved):
        raise BootstrapSecurityError(f"Resolved {label} escapes target root: {rel_path}")
    return dst


def check_case_collisions(rel_paths: Iterable[str]) -> None:
    """Reject distinct relative paths that collide case-insensitively on Windows."""
    seen: Dict[str, str] = {}
    for rel in rel_paths:
        key = rel.casefold()
        if key in seen and seen[key] != rel:
            raise BootstrapSecurityError(
                f"Case-insensitive path collision detected: '{seen[key]}' vs '{rel}'"
            )
        seen[key] = rel


def atomic_write_bytes(target_path: Path, data: bytes) -> None:
    """Atomically write data using a same-directory temp file and os.replace."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = target_path.with_name(f".{target_path.name}.{os.getpid()}.tmp")
    try:
        with tmp_path.open("wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_path, target_path)
    except Exception:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass
        raise


def read_normalized_text_bytes(src: Path) -> bytes:
    if src.suffix.lower() in TEXT_SUFFIXES:
        try:
            return src.read_text(encoding="utf-8").replace("\r\n", "\n").encode("utf-8")
        except UnicodeDecodeError:
            return src.read_bytes()
    return src.read_bytes()


def parse_simple_frontmatter(markdown_text: str) -> Tuple[Dict[str, object], str]:
    """Parse canonical YAML frontmatter and return (metadata_dict, body_without_frontmatter)."""
    normalized = markdown_text.replace("\r\n", "\n")
    match = FRONTMATTER_RE.match(normalized)
    if not match:
        return {}, normalized
    raw_block = match.group(1)
    body = normalized[match.end() :]
    result: Dict[str, object] = {}
    for raw_line in raw_block.split("\n"):
        line = raw_line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.strip()
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            if not inner:
                result[key] = []
            else:
                items: List[object] = []
                for part in inner.split(","):
                    cleaned = part.strip().strip('"').strip("'")
                    items.append(int(cleaned) if cleaned.isdigit() else cleaned)
                result[key] = items
        elif (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            result[key] = val[1:-1]
        elif val.lower() in ("true", "false"):
            result[key] = val.lower() == "true"
        elif val.isdigit():
            result[key] = int(val)
        else:
            result[key] = val
    return result, body


def rewrite_markdown_relative_links(
    markdown_text: str,
    src_rel_path: str,
    dst_rel_path: str,
    fw_prefix: str = "",
    skill_dir_map: Dict[str, str] | None = None,
    strip_upstream_snapshot_links: bool = False,
) -> str:
    """Rewrite Markdown relative link targets when moving a file across directory depths."""
    normalized = markdown_text.replace("\r\n", "\n")
    src_dir = posixpath.dirname(src_rel_path.replace("\\", "/"))
    dst_dir = posixpath.dirname(dst_rel_path.replace("\\", "/"))
    if src_dir == dst_dir and not strip_upstream_snapshot_links:
        return normalized

    fenced_blocks: List[str] = []

    def _mask_fenced(match: re.Match[str]) -> str:
        idx = len(fenced_blocks)
        fenced_blocks.append(match.group(0))
        return f"\x00FENCED_{idx}\x00"

    masked = FENCED_CODE_RE.sub(_mask_fenced, normalized)

    inline_spans: List[str] = []

    def _mask_inline(match: re.Match[str]) -> str:
        idx = len(inline_spans)
        inline_spans.append(match.group(0))
        return f"\x00INLINE_{idx}\x00"

    masked = INLINE_CODE_RE.sub(_mask_inline, masked)

    sorted_skill_prefixes = (
        sorted(skill_dir_map.keys(), key=len, reverse=True) if skill_dir_map else []
    )

    def _repl(match: re.Match[str]) -> str:
        label = match.group(1)
        raw_target = match.group(2).strip()
        if (
            not raw_target
            or raw_target.startswith(("http://", "https://", "mailto:", "#", "/", "file://", "customization://", "conversation://"))
            or re.match(r"^[A-Za-z]:[/\\]", raw_target)
        ):
            return match.group(0)
        path_part, sep, fragment = raw_target.partition("#")
        path_part = path_part.strip()
        if not path_part:
            return match.group(0)
        repo_rel_target = posixpath.normpath(
            posixpath.join(src_dir, path_part) if src_dir else path_part
        )
        if strip_upstream_snapshot_links and posixpath.basename(repo_rel_target) == "UPSTREAM_SKILL.md":
            return label

        mapped_skill_target: str | None = None
        for canon_sdir in sorted_skill_prefixes:
            if repo_rel_target == canon_sdir or repo_rel_target.startswith(f"{canon_sdir}/"):
                suffix = repo_rel_target[len(canon_sdir) :]
                mapped_skill_target = f"{skill_dir_map[canon_sdir]}{suffix}"  # type: ignore[index]
                break

        if mapped_skill_target is not None:
            repo_rel_target = mapped_skill_target
        elif (
            fw_prefix
            and not repo_rel_target.startswith(fw_prefix)
            and any(repo_rel_target.startswith(pref) or repo_rel_target == pref.rstrip("/") for pref in FRAMEWORK_ASSET_SUBDIRS)
        ):
            repo_rel_target = f"{fw_prefix}{repo_rel_target}"
        new_rel = posixpath.relpath(repo_rel_target, dst_dir if dst_dir else ".")
        if dst_dir == "" and path_part.startswith("./") and not new_rel.startswith("."):
            new_rel = f"./{new_rel}"
        rebuilt_target = f"{new_rel}{sep}{fragment}" if sep else new_rel
        return f"[{label}]({rebuilt_target})"

    rewritten = MD_LINK_RE.sub(_repl, masked)
    for idx, span in enumerate(inline_spans):
        rewritten = rewritten.replace(f"\x00INLINE_{idx}\x00", span)
    for idx, block in enumerate(fenced_blocks):
        rewritten = rewritten.replace(f"\x00FENCED_{idx}\x00", block)
    return rewritten


def verify_projected_markdown_links(dst_rel_path: str, markdown_text: str, available_targets: Set[str]) -> None:
    """Verify relative links inside projected Markdown remain inside consumer root."""
    stripped = FENCED_CODE_RE.sub("", markdown_text)
    stripped = INLINE_CODE_RE.sub("", stripped)
    dst_dir = posixpath.dirname(dst_rel_path) or "."
    for match in MD_LINK_RE.finditer(stripped):
        raw_target = match.group(2).strip()
        if not raw_target or raw_target.startswith(("http://", "https://", "mailto:", "#", "file://")):
            continue
        target_clean = raw_target.split("#", 1)[0].strip()
        if not target_clean:
            continue
        joined = posixpath.normpath(posixpath.join(dst_dir, target_clean))
        if joined == ".." or joined.startswith("../"):
            raise BootstrapSecurityError(f"Projected file '{dst_rel_path}' link escapes consumer root: '{raw_target}'")
        if joined not in available_targets:
            raise BootstrapSecurityError(
                f"Projected file '{dst_rel_path}' references missing target '{joined}' (from '{raw_target}')"
            )


def resolve_platform_projection_roots(
    source_root: Path,
    platforms: List[str],
) -> Tuple[Dict[str, List[str]], Dict[str, str]]:
    """Derive {projection_root: [platform_ids]} and {platform_id: projection_root} from capabilities."""
    cap_path = source_root / "core" / "platform-capabilities.json"
    model = platform_capabilities.load_platform_capabilities(cap_path)
    root_to_platforms: Dict[str, List[str]] = {}
    platform_to_root: Dict[str, str] = {}
    for pid in platforms:
        cap = platform_capabilities.get_platform(model, pid)
        native_paths = cap.get("native_skill_dirs", {}).get("paths", [])
        chosen_root = ""
        for pattern in native_paths:
            prefix = str(pattern).split("/<name>/", 1)[0].rstrip("/")
            if prefix in SUPPORTED_PROJECTION_ROOTS:
                chosen_root = prefix
                break
        if chosen_root:
            platform_to_root[pid] = chosen_root
            root_to_platforms.setdefault(chosen_root, [])
            if pid not in root_to_platforms[chosen_root]:
                root_to_platforms[chosen_root].append(pid)
    return root_to_platforms, platform_to_root


def normalize_project_controls(
    config_data: Dict[str, object] | None,
    default_overlay_dir: str = DEFAULT_OVERLAY_DIR,
) -> Dict[str, object]:
    """Normalize optional disabled.* and customizations.* settings with safe v0.3/v0.4/v0.5 defaults."""
    cfg = config_data if isinstance(config_data, dict) else {}
    raw_disabled = cfg.get("disabled")
    disabled_obj = raw_disabled if isinstance(raw_disabled, dict) else {}

    disabled_skills = {str(x).strip() for x in disabled_obj.get("skills", []) if str(x).strip()}
    disabled_agents = {str(x).strip() for x in disabled_obj.get("agents", []) if str(x).strip()}
    disabled_phases = {int(x) for x in disabled_obj.get("phases", []) if isinstance(x, int)}
    disabled_gates = {str(x).strip() for x in disabled_obj.get("gates", []) if str(x).strip()}
    disabled_mechanisms = {
        str(x).strip().lower()
        for x in disabled_obj.get("mechanisms", [])
        if str(x).strip().lower() in VALID_MECHANISMS
    }

    # Honor legacy qualityGates booleans as implicit mechanism toggles when explicitly False
    q_gates = cfg.get("qualityGates")
    if isinstance(q_gates, dict):
        if q_gates.get("requireTddRedGreen") is False:
            disabled_mechanisms.add("tdd")
        if q_gates.get("requireIndependentCodeReview") is False:
            disabled_mechanisms.add("code-review")
        if q_gates.get("requireGraphifyCheck") is False:
            disabled_mechanisms.add("graphify")

    raw_custom = cfg.get("customizations")
    custom_obj = raw_custom if isinstance(raw_custom, dict) else {}
    raw_overlay = str(custom_obj.get("overlayDir") or default_overlay_dir).strip() or default_overlay_dir
    overlay_dir = validate_safe_rel_path(raw_overlay, label="customizations.overlayDir")
    mode = str(custom_obj.get("promptInjectionMode") or DEFAULT_INJECTION_MODE).strip().lower()
    if mode not in {"inline", "reference"}:
        mode = DEFAULT_INJECTION_MODE
    raw_budget = custom_obj.get("inlineMaxBytes", DEFAULT_INLINE_MAX_BYTES)
    inline_max_bytes = (
        max(1024, min(MAX_INLINE_BYTES_CAP, int(raw_budget)))
        if isinstance(raw_budget, int)
        else DEFAULT_INLINE_MAX_BYTES
    )

    return {
        "disabled": {
            "skills": disabled_skills,
            "agents": disabled_agents,
            "phases": disabled_phases,
            "gates": disabled_gates,
            "mechanisms": disabled_mechanisms,
        },
        "customizations": {
            "overlayDir": overlay_dir,
            "promptInjectionMode": mode,
            "inlineMaxBytes": inline_max_bytes,
        },
    }


def _strip_html_comments(markdown_text: str) -> str:
    return re.sub(r"<!--.*?-->", "", markdown_text, flags=re.DOTALL).strip()


def _is_placeholder_instructions(markdown_text: str) -> bool:
    stripped = _strip_html_comments(markdown_text)
    default_stripped = _strip_html_comments(DEFAULT_CUSTOM_INSTRUCTIONS_TEMPLATE)
    return not stripped or stripped == default_stripped


def _scan_for_secrets(text: str, source_label: str) -> None:
    """Reject literal secrets matching framework patterns inside custom MCP/overlay files."""
    for rule_id, regex in MCP_SECRET_PATTERNS:
        if regex.search(text):
            raise BootstrapSecurityError(
                f"Literal secret rejected in {source_label} matching rule '{rule_id}'; use ${{ENV_VAR}} placeholders instead"
            )


def _toml_str(value: str) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def _toml_key(key: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]+", key):
        return key
    return json.dumps(key, ensure_ascii=False)


def _toml_value(val: object) -> str:
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, int):
        return str(val)
    if isinstance(val, float):
        return repr(val)
    if isinstance(val, list):
        return "[" + ", ".join(_toml_value(item) for item in val) + "]"
    return _toml_str(str(val))


def _build_codex_config_toml(digest: str, mcp_servers: Dict[str, Dict[str, object]]) -> str:
    lines = [
        f"# AUTO-GENERATED CONSUMER ADAPTER | Canonical Digest: {digest}",
        "# OpenAI Codex workspace configuration (.codex/config.toml)",
        "",
        'approval_policy = "on-request"',
        'sandbox_mode = "workspace-write"',
    ]
    for srv_name in sorted(mcp_servers.keys()):
        cfg = mcp_servers[srv_name]
        lines.append("")
        tkey = _toml_key(srv_name)
        lines.append(f"[mcp_servers.{tkey}]")
        for scalar_key in ("command", "args", "url", "cwd", "type", "enabled"):
            if scalar_key in cfg and cfg[scalar_key] is not None:
                lines.append(f"{scalar_key} = {_toml_value(cfg[scalar_key])}")
        for table_key in ("env", "headers"):
            tbl = cfg.get(table_key)
            if isinstance(tbl, dict) and tbl:
                lines.append("")
                lines.append(f"[mcp_servers.{tkey}.{table_key}]")
                for k in sorted(tbl.keys()):
                    lines.append(f"{_toml_key(str(k))} = {_toml_value(tbl[k])}")
    return "\n".join(lines).rstrip() + "\n"


def _build_copilot_mcp_json(mcp_servers: Dict[str, Dict[str, object]]) -> str:
    servers: Dict[str, Dict[str, object]] = {}
    for srv_name in sorted(mcp_servers.keys()):
        raw_cfg = mcp_servers[srv_name]
        entry = dict(raw_cfg)
        if "type" not in entry:
            entry["type"] = "stdio" if "command" in entry else ("http" if "url" in entry else "stdio")
        servers[srv_name] = entry
    return json.dumps({"servers": servers}, indent=2) + "\n"


def _build_standard_mcp_json(mcp_servers: Dict[str, Dict[str, object]]) -> str:
    ordered = {k: dict(mcp_servers[k]) for k in sorted(mcp_servers.keys())}
    return json.dumps({"mcpServers": ordered}, indent=2) + "\n"


def load_project_overlay(target_dir: Path, overlay_rel: str) -> Dict[str, object]:
    """Load consumer-owned rules, skills, agents, prompts, and MCP servers from overlay_rel."""
    overlay_root = target_dir / Path(overlay_rel)
    if overlay_root.exists() and is_reparse_or_symlink(overlay_root):
        raise BootstrapSecurityError(f"Symlink or reparse point rejected at {overlay_rel}")

    instruction_sections: List[Tuple[str, str]] = []
    if overlay_root.exists():
        main_inst = overlay_root / "instructions.md"
        if is_reparse_or_symlink(main_inst):
            raise BootstrapSecurityError(f"Symlink or reparse point rejected at {overlay_rel}/instructions.md")
        if main_inst.exists():
            raw_inst = main_inst.read_text(encoding="utf-8").replace("\r\n", "\n")
            if not _is_placeholder_instructions(raw_inst):
                instruction_sections.append((f"{overlay_rel}/instructions.md", raw_inst.strip()))

        for sub_name in ("imported", "rules"):
            sub_dir = overlay_root / sub_name
            if sub_dir.exists() and is_reparse_or_symlink(sub_dir):
                raise BootstrapSecurityError(f"Symlink or reparse point rejected at {sub_dir.relative_to(target_dir).as_posix()}")
            if sub_dir.exists() and sub_dir.is_dir():
                for md in sorted(sub_dir.glob("*.md")):
                    if is_reparse_or_symlink(md):
                        raise BootstrapSecurityError(f"Symlink or reparse point rejected at {md.relative_to(target_dir).as_posix()}")
                    if md.is_file():
                        txt = md.read_text(encoding="utf-8").replace("\r\n", "\n").strip()
                        if txt and not _is_placeholder_instructions(txt):
                            instruction_sections.append((md.relative_to(target_dir).as_posix(), txt))

    custom_skills: Dict[str, Dict[str, object]] = {}
    skills_dir = overlay_root / "skills"
    if skills_dir.exists() and is_reparse_or_symlink(skills_dir):
        raise BootstrapSecurityError(f"Symlink or reparse point rejected at {skills_dir.relative_to(target_dir).as_posix()}")
    if skills_dir.exists() and skills_dir.is_dir():
        for child in sorted(skills_dir.iterdir()):
            if is_reparse_or_symlink(child):
                raise BootstrapSecurityError(f"Symlink or reparse point rejected at {child.relative_to(target_dir).as_posix()}")
            if not child.is_dir():
                continue
            skill_md = child / "SKILL.md"
            if is_reparse_or_symlink(skill_md):
                raise BootstrapSecurityError(f"Symlink or reparse point rejected at {skill_md.relative_to(target_dir).as_posix()}")
            if not skill_md.is_file():
                continue
            skill_folder = validate_safe_rel_path(child.name, label="custom skill folder")
            raw_md = skill_md.read_text(encoding="utf-8").replace("\r\n", "\n")
            meta, _ = parse_simple_frontmatter(raw_md)
            skill_name = validate_safe_rel_path(str(meta.get("name") or skill_folder), label="custom skill name")
            if "/" in skill_name:
                raise BootstrapSecurityError(f"Nested custom skill name rejected: {skill_name}")
            desc = str(meta.get("description") or "Project-specific custom skill").strip()
            files: List[Tuple[str, Path]] = []
            for item in sorted(child.rglob("*")):
                if is_reparse_or_symlink(item):
                    raise BootstrapSecurityError(
                        f"Symlink/reparse rejected inside custom skill: {item.relative_to(target_dir).as_posix()}"
                    )
                if item.is_file() and "__pycache__" not in item.parts and item.suffix != ".pyc":
                    files.append((item.relative_to(child).as_posix(), item))
            custom_skills[skill_name] = {
                "name": skill_name,
                "description": desc,
                "source_dir": child,
                "rel_dir": child.relative_to(target_dir).as_posix(),
                "files": files,
                "meta": meta,
            }

    agent_overrides: Dict[str, Dict[str, object]] = {}
    agent_appends: Dict[str, str] = {}
    agents_dir = overlay_root / "agents"
    if agents_dir.exists() and is_reparse_or_symlink(agents_dir):
        raise BootstrapSecurityError(f"Symlink or reparse point rejected at {agents_dir.relative_to(target_dir).as_posix()}")
    if agents_dir.exists() and agents_dir.is_dir():
        for md in sorted(agents_dir.glob("*.md")):
            if is_reparse_or_symlink(md):
                raise BootstrapSecurityError(f"Symlink or reparse point rejected at {md.relative_to(target_dir).as_posix()}")
            if not md.is_file():
                continue
            raw_txt = md.read_text(encoding="utf-8").replace("\r\n", "\n")
            if md.name.endswith(".append.md"):
                role_name = validate_safe_rel_path(md.name[: -len(".append.md")], label="custom agent name")
                if raw_txt.strip():
                    agent_appends[role_name] = raw_txt.strip()
            else:
                meta, body = parse_simple_frontmatter(raw_txt)
                role_name = validate_safe_rel_path(str(meta.get("name") or md.stem), label="custom agent name")
                if "/" in role_name:
                    raise BootstrapSecurityError(f"Nested custom agent name rejected: {role_name}")
                agent_overrides[role_name] = {
                    "name": role_name,
                    "title": str(meta.get("title") or role_name.replace("-", " ").title()),
                    "description": str(meta.get("description") or f"Custom project role ({role_name})"),
                    "phases": meta.get("phases", [9]),
                    "allowed_tools": meta.get("allowed_tools", ["read_file", "write_file", "edit_file", "run_command"]),
                    "required_skills": meta.get("required_skills", []),
                    "raw_text": raw_txt,
                    "body": body.strip(),
                    "rel_path": md.relative_to(target_dir).as_posix(),
                }

    custom_prompts: Dict[str, Dict[str, object]] = {}
    prompts_dir = overlay_root / "prompts"
    if prompts_dir.exists() and is_reparse_or_symlink(prompts_dir):
        raise BootstrapSecurityError(f"Symlink or reparse point rejected at {prompts_dir.relative_to(target_dir).as_posix()}")
    if prompts_dir.exists() and prompts_dir.is_dir():
        for md in sorted(prompts_dir.glob("*.md")):
            if is_reparse_or_symlink(md):
                raise BootstrapSecurityError(f"Symlink or reparse point rejected at {md.relative_to(target_dir).as_posix()}")
            if not md.is_file():
                continue
            slug = validate_safe_rel_path(md.stem, label="custom prompt slug")
            if "/" in slug or not MCP_SAFE_NAME_RE.match(slug):
                raise BootstrapSecurityError(f"Invalid custom prompt slug: {slug}")
            if slug in RESERVED_PROMPT_SLUGS:
                raise BootstrapSecurityError(f"Custom prompt slug collides with built-in framework command: {slug}")
            raw_txt = md.read_text(encoding="utf-8").replace("\r\n", "\n")
            _scan_for_secrets(raw_txt, md.relative_to(target_dir).as_posix())
            meta, body = parse_simple_frontmatter(raw_txt)
            prompt_body = body.strip() if meta else raw_txt.strip()
            if not prompt_body:
                continue
            desc = str(meta.get("description") or f"Custom project prompt ({slug})").strip()
            custom_prompts[slug] = {
                "slug": slug,
                "description": desc,
                "body": prompt_body,
                "rel_path": md.relative_to(target_dir).as_posix(),
            }

    custom_mcp: Dict[str, Dict[str, object]] = {}
    mcp_path = overlay_root / "mcp.json"
    if mcp_path.exists() and is_reparse_or_symlink(mcp_path):
        raise BootstrapSecurityError(f"Symlink or reparse point rejected at {mcp_path.relative_to(target_dir).as_posix()}")
    if mcp_path.exists() and mcp_path.is_file():
        mcp_rel = mcp_path.relative_to(target_dir).as_posix()
        raw_mcp_text = mcp_path.read_text(encoding="utf-8").replace("\r\n", "\n")
        _scan_for_secrets(raw_mcp_text, mcp_rel)
        try:
            mcp_payload = json.loads(raw_mcp_text)
        except Exception as exc:
            raise ValueError(f"Invalid JSON in {mcp_rel}: {exc}") from exc
        if not isinstance(mcp_payload, dict):
            raise ValueError(f"{mcp_rel} root must be a JSON object")
        raw_servers = mcp_payload.get("mcpServers", {})
        if not isinstance(raw_servers, dict):
            raise ValueError(f"{mcp_rel} 'mcpServers' must be a JSON object")
        for srv_name_raw, srv_cfg in sorted(raw_servers.items()):
            srv_name = str(srv_name_raw).strip()
            if not srv_name or not MCP_SAFE_NAME_RE.match(srv_name):
                raise BootstrapSecurityError(f"Unsafe or invalid MCP server name in {mcp_rel}: {srv_name_raw!r}")
            if not isinstance(srv_cfg, dict):
                raise ValueError(f"{mcp_rel} mcpServers['{srv_name}'] must be an object")
            if srv_cfg.get("disabled") is True:
                continue
            clean_cfg: Dict[str, object] = {}
            for key in ("command", "args", "env", "url", "headers", "cwd", "type"):
                if key in srv_cfg and srv_cfg[key] is not None:
                    clean_cfg[key] = srv_cfg[key]
            if "command" not in clean_cfg and "url" not in clean_cfg:
                raise ValueError(f"{mcp_rel} mcpServers['{srv_name}'] requires either 'command' or 'url'")
            custom_mcp[srv_name] = clean_cfg

    return {
        "overlay_rel": overlay_rel,
        "instruction_sections": instruction_sections,
        "custom_skills": custom_skills,
        "agent_overrides": agent_overrides,
        "agent_appends": agent_appends,
        "custom_prompts": custom_prompts,
        "custom_mcp": custom_mcp,
    }


def _format_overlay_section(overlay: Dict[str, object], mode: str, inline_max_bytes: int) -> str:
    sections: List[Tuple[str, str]] = overlay["instruction_sections"]  # type: ignore[assignment]
    overlay_rel = str(overlay["overlay_rel"])
    if not sections:
        return (
            f"## Project Custom Instructions (`{overlay_rel}/`)\n"
            f"- No project-specific instructions added yet. Edit `{overlay_rel}/instructions.md` "
            f"or add `{overlay_rel}/rules/*.md`, then run `python scripts/compose.py`."
        )

    if mode == "reference":
        lines = [f"## Project Custom Instructions (`{overlay_rel}/`)"]
        for rel_src, _ in sections:
            lines.append(f"- Read `{rel_src}` before executing project changes.")
        return "\n".join(lines)

    chunks: List[str] = []
    used = 0
    truncated = False
    for rel_src, content in sections:
        block = f"### Source: `{rel_src}`\n{content}"
        encoded_len = len(block.encode("utf-8"))
        if used + encoded_len > inline_max_bytes:
            remaining = max(0, inline_max_bytes - used)
            if remaining > 120:
                clipped = block.encode("utf-8")[:remaining].decode("utf-8", errors="ignore").rsplit("\n", 1)[0]
                chunks.append(clipped)
            truncated = True
            break
        chunks.append(block)
        used += encoded_len

    header = f"## Project Custom Instructions (Loaded Inline from `{overlay_rel}/`)"
    body = "\n\n".join(chunks)
    if truncated:
        body += f"\n\n*(Inline budget `{inline_max_bytes}` bytes reached; read remaining files directly under `{overlay_rel}/`.)*"
    return f"{header}\n\n{body}"


def filter_agent_required_skills(agent_markdown: str, active_skills: Set[str]) -> str:
    """Filter YAML frontmatter required_skills so agents only reference active installed skills."""

    def _replace(match: re.Match[str]) -> str:
        prefix, inner, suffix = match.group(1), match.group(2), match.group(3)
        items = [part.strip().strip('"').strip("'") for part in inner.split(",") if part.strip()]
        kept = [item for item in items if item in active_skills]
        return f"{prefix}{', '.join(kept)}{suffix}"

    return REQUIRED_SKILLS_LINE_RE.sub(_replace, agent_markdown, count=1)


def _compute_local_digest(root: Path) -> str:
    hasher = hashlib.sha256()
    for pattern in ("core/rules/*.md", "agents/*.md", "workflows/*.md", "skills/registry.json"):
        for path in sorted(root.glob(pattern)):
            rel = path.relative_to(root).as_posix()
            content = path.read_text(encoding="utf-8").replace("\r\n", "\n")
            if rel.startswith("agents/") and rel.endswith(".md"):
                content = re.sub(
                    r"\n+## Project-Specific Rules \([^\n]+\)\n.*\Z",
                    "",
                    content,
                    flags=re.DOTALL,
                ).rstrip() + "\n"
            hasher.update(f"{rel}:{len(content)}\n".encode("utf-8"))
            hasher.update(content.encode("utf-8"))
    return hasher.hexdigest()[:16]


def _translate_tools_for_claude(raw_tools: object) -> str:
    """Translate canonical tool IDs into Claude Code subagent frontmatter tools."""
    mapping = {
        "read_file": "Read, Glob, Grep",
        "write_file": "Write",
        "edit_file": "Edit",
        "run_command": "Bash",
        "search_web": "WebSearch",
        "invoke_subagent": "Agent",
    }
    ignored_meta = {"ask_question", "manage_task", "run_workflow", "swarm"}
    tools = raw_tools if isinstance(raw_tools, list) else []
    ordered: List[str] = []
    for t in tools:
        key = str(t).strip()
        if not key or key in ignored_meta:
            continue
        mapped = mapping.get(key, key)
        for part in [p.strip() for p in mapped.split(",") if p.strip()]:
            if part not in ordered:
                ordered.append(part)
    return ", ".join(ordered) if ordered else "Read, Glob, Grep"


def _translate_tools_for_copilot(raw_tools: object) -> List[str]:
    """Translate canonical tool IDs into GitHub Copilot .agent.md frontmatter tools."""
    mapping = {
        "read_file": ["read", "search"],
        "write_file": ["edit"],
        "edit_file": ["edit"],
        "run_command": ["terminal"],
        "search_web": ["fetch"],
    }
    ignored_meta = {"ask_question", "manage_task", "invoke_subagent", "run_workflow", "swarm"}
    tools = raw_tools if isinstance(raw_tools, list) else []
    ordered: List[str] = []
    for t in tools:
        key = str(t).strip()
        if not key or key in ignored_meta:
            continue
        for item in mapping.get(key, [key]):
            if item not in ordered:
                ordered.append(item)
    return ordered or ["read", "search"]


def render_platform_agent_files(
    role_name: str,
    title: str,
    description: str,
    allowed_tools: object,
    phases: object = None,
    fw_prefix: str = "",
    append_rules: str = "",
) -> Tuple[str, str, str, str]:
    """Render (claude_subpath, claude_md, copilot_subpath, copilot_md) for a canonical agent role."""
    safe_desc = str(description or title or role_name).replace('"', "'").strip()
    append_block = f"\n\nProject-Specific Role Rules ({role_name}):\n{append_rules.strip()}" if append_rules.strip() else ""
    if role_name == "code-reviewer":
        claude_md = (
            "---\n"
            "name: framework-code-reviewer\n"
            'description: "Independent Phase 10 Code Reviewer enforcing spec traceability, ADRs, and anti-slop rules"\n'
            "tools: Read, Glob, Grep\n"
            "disallowedTools: Write, Edit, Bash\n"
            "---\n"
            f"Follow `{fw_prefix}agents/code-reviewer.md` and `{fw_prefix}quality/code-review-rubric.md`.\n"
            "Inspect changes read-only without modifying production source files."
            f"{append_block}\n"
        )
        copilot_md = (
            "---\n"
            'description: "Independent Phase 10 Code & Architecture Reviewer"\n'
            'tools: ["read", "search"]\n'
            "---\n"
            f"Act as `code-reviewer` defined in `{fw_prefix}agents/code-reviewer.md`.\n"
            f"Review changes read-only against `docs/specs/03-specification.md`, `docs/adr/`, and `{fw_prefix}quality/code-review-rubric.md`.\n"
            "Return findings without modifying production source files."
            f"{append_block}\n"
        )
        return "code-reviewer.md", claude_md, "code-reviewer.agent.md", copilot_md

    phases_list = [str(p) for p in phases] if isinstance(phases, list) else []
    phase_note = f" (Phases {', '.join(phases_list)})" if phases_list else ""
    claude_tools = _translate_tools_for_claude(allowed_tools)
    copilot_tools = json.dumps(_translate_tools_for_copilot(allowed_tools))
    claude_md = (
        "---\n"
        f"name: {role_name}\n"
        f'description: "{safe_desc}"\n'
        f"tools: {claude_tools}\n"
        "---\n"
        f"Act as `{role_name}`{phase_note} per `{fw_prefix}agents/{role_name}.md` and `{fw_prefix}core/rules/engineering-principles.md`.\n"
        "Execute strictly within assigned task scope, spec acceptance criteria, and disjoint file ownership."
        f"{append_block}\n"
    )
    copilot_md = (
        "---\n"
        f'description: "{safe_desc}"\n'
        f"tools: {copilot_tools}\n"
        "---\n"
        f"Act as `{role_name}`{phase_note} defined in `{fw_prefix}agents/{role_name}.md`.\n"
        f"Follow `{fw_prefix}core/rules/engineering-principles.md` within assigned task scope and disjoint file ownership."
        f"{append_block}\n"
    )
    return f"{role_name}.md", claude_md, f"{role_name}.agent.md", copilot_md


def _active_gates(disabled_gates: Set[str]) -> List[str]:
    return [g for g in VALID_GATES if g not in disabled_gates]


def _active_stage_lines(disabled_phases: Set[int], fw_prefix: str = "") -> List[Tuple[str, str]]:
    stages = [
        ((1, 2, 3), "Stage 1 (Phases 1-3)", f"{fw_prefix}workflows/01-discovery-and-grill-me.md"),
        ((4, 5), "Stage 2 (Phases 4-5)", f"{fw_prefix}workflows/02-specification-and-adr.md"),
        ((6, 7, 8), "Stage 3 (Phases 6-8)", f"{fw_prefix}workflows/03-planning-and-decomposition.md"),
        ((9,), "Stage 4 (Phase 9)", f"{fw_prefix}workflows/04-tdd-and-implementation.md"),
        ((10, 11, 12), "Stage 5 (Phases 10-12)", f"{fw_prefix}workflows/05-review-qa-and-security.md"),
        ((13, 14, 15), "Stage 6 (Phases 13-15)", f"{fw_prefix}workflows/06-release-and-retrospective.md"),
    ]
    out: List[Tuple[str, str]] = []
    for phase_nums, label, rel_path in stages:
        remaining = [p for p in phase_nums if p not in disabled_phases]
        if remaining:
            out.append((f"{label} [active: {','.join(str(p) for p in remaining)}]", rel_path))
    return out


def _render_inline_rules_bullets(
    profile: str,
    disabled: Dict[str, object],
    prefix_rel: str = ".",
    fw_prefix: str = "",
    config_rel: str = ISOLATED_CONFIG_REL,
    state_rel: str = ISOLATED_STATE_REL,
    validate_cmd: str = "python .aief/scripts/validate.py --mode consumer",
) -> List[str]:
    disabled_mechs: Set[str] = disabled["mechanisms"]  # type: ignore[assignment]
    disabled_phases: Set[int] = disabled["phases"]  # type: ignore[assignment]
    disabled_gates: Set[str] = disabled["gates"]  # type: ignore[assignment]
    fw_link_base = f"{prefix_rel}/{fw_prefix.rstrip('/')}" if fw_prefix else prefix_rel

    bullets = [f"- **Workflow Profile:** `{profile}`"]
    if 2 not in disabled_phases and 3 not in disabled_phases:
        bullets.append(
            f"- **Spec First ([`{fw_prefix}core/rules/engineering-principles.md`]({fw_link_base}/core/rules/engineering-principles.md)):** "
            "Clarify edge cases and lock testable acceptance criteria before production code."
        )
    if "tdd" not in disabled_mechs and 9 not in disabled_phases:
        bullets.append("- **TDD Discipline:** Write failing tests first (Red -> Green -> Refactor) before implementation.")
    else:
        bullets.append(f"- **TDD Requirement:** Disabled by `{config_rel}` (`disabled.mechanisms: tdd`).")

    if "graphify" not in disabled_mechs:
        bullets.append(
            "- **Graphify First:** Query `graphify-out/graph.json` (`graphify query`) before broad directory greps; "
            "if missing on repos with >=15 files, run `graphify .` or report to the user if `graphify` CLI is not installed."
        )

    if "handoffs" not in disabled_mechs:
        bullets.append(
            f"- **Filesystem Handoffs ([`{fw_prefix}core/rules/context-handoff-protocol.md`]({fw_link_base}/core/rules/context-handoff-protocol.md)):** "
            f"Persist phase artifacts under `docs/` and handoff JSON under `{state_rel}/handoffs/`."
        )
    else:
        bullets.append(f"- **Filesystem Handoffs:** Disabled by `{config_rel}` (`disabled.mechanisms: handoffs`).")

    if "code-review" not in disabled_mechs and 10 not in disabled_phases:
        bullets.append("- **Independent Code Review:** Evaluate git diff against specs and quality rubrics before release.")

    bullets.append(
        "- **Subagent-First Delegation (`Category B/C`):** Spawn fresh specialist subagents from Section 3 "
        "(design/DB-BigData/BE/FE/AI/DevOps/QA/review/security) with disjoint `target_files` rather than executing every phase in one bloated context."
    )

    active_gates = _active_gates(disabled_gates)
    gates_str = ", ".join(f"`{g}`" for g in active_gates) if active_gates else f"None (explicitly disabled in `{config_rel}`)"
    bullets.append(
        f"- **Active Approval Gates ([`{fw_prefix}core/rules/human-approval-gates.md`]({fw_link_base}/core/rules/human-approval-gates.md)):** {gates_str}."
    )
    bullets.append(
        f"- **Security Guardrails ([`{fw_prefix}core/rules/security-guardrails.md`]({fw_link_base}/core/rules/security-guardrails.md)):** "
        f"Never commit or echo secrets/tokens/keys; run `{validate_cmd}` before finishing."
    )
    return bullets


def _resolve_skill_source_dir(
    skill_entry: Dict[str, object],
    assets_root: Path,
    target_dir: Path,
    canon_source_rel: str,
    proj_roots: List[str],
    external_source_root: Path | None = None,
) -> Path:
    """Resolve canonical or projected skill directory without duplicating skills inside .aief/skills/."""
    candidate = assets_root / Path(canon_source_rel)
    if candidate.is_file():
        return candidate.parent

    if external_source_root is not None:
        ext_cand = external_source_root / Path(canon_source_rel)
        if ext_cand.is_file():
            return ext_cand.parent

    env_fw = os.environ.get("AIEF_FRAMEWORK_ROOT", "").strip()
    if env_fw:
        env_cand = Path(env_fw) / Path(canon_source_rel)
        if env_cand.is_file():
            return env_cand.parent

    if (SCRIPT_DIR.parent / "skills" / "core").is_dir():
        repo_cand = SCRIPT_DIR.parent / Path(canon_source_rel)
        if repo_cand.is_file():
            return repo_cand.parent

    cache_root = Path.home() / ".cache" / "aief"
    if cache_root.is_dir():
        for bundle_dir in sorted(cache_root.iterdir(), reverse=True):
            if bundle_dir.is_dir() and not bundle_dir.name.startswith(".tmp-"):
                cache_cand = bundle_dir / Path(canon_source_rel)
                if cache_cand.is_file():
                    return cache_cand.parent

    skill_name = str(skill_entry.get("name", ""))
    cur_rel = str(skill_entry.get("path", "")).replace("\\", "/")
    if cur_rel:
        cur_path = target_dir / Path(cur_rel)
        if cur_path.is_file():
            return cur_path.parent
    for proot in proj_roots:
        proj_cand = target_dir / Path(proot) / skill_name / "SKILL.md"
        if proj_cand.is_file():
            return proj_cand.parent

    raise FileNotFoundError(
        f"Skill directory missing for '{skill_name}' ({canon_source_rel}); "
        "run 'aief compose .' or 'aief update .' to restore disabled skills from bundle cache."
    )


def compose_consumer_artifacts(
    source_root: Path,
    target_dir: Path,
    platforms: List[str],
    profile: str,
    optional_packs: List[str],
    config_data: Dict[str, object],
    overlay: Dict[str, object],
    digest: str | None = None,
    layout: Dict[str, str] | None = None,
) -> Dict[str, object]:
    """Compose all filtered/customized consumer files without upstream-only references."""
    active_layout = layout or resolve_consumer_layout(target_dir)
    fw_prefix = active_layout["fw_prefix"]
    is_isolated = active_layout["mode"] == "isolated"
    config_rel = active_layout["config_rel"]
    state_rel = active_layout["state_rel"]
    hooks_rel = active_layout["hooks_rel"]
    agy_skills_rel = active_layout["agy_skills_rel"]
    agy_mcp_rel = active_layout["agy_mcp_rel"]
    compose_cmd = active_layout["compose_cmd"]
    validate_cmd = active_layout["validate_cmd"]

    assets_root = (
        source_root / AIEF_DIR
        if (is_isolated and (source_root / AIEF_DIR / "skills" / "registry.json").exists())
        else source_root
    )
    external_source_root = source_root if (source_root / "skills" / "core").is_dir() else None

    controls = normalize_project_controls(config_data, default_overlay_dir=active_layout["overlay_default"])
    disabled = controls["disabled"]
    customizations = controls["customizations"]
    disabled_skills: Set[str] = disabled["skills"]  # type: ignore[assignment]
    disabled_agents: Set[str] = disabled["agents"]  # type: ignore[assignment]
    disabled_phases: Set[int] = disabled["phases"]  # type: ignore[assignment]
    disabled_mechs: Set[str] = disabled["mechanisms"]  # type: ignore[assignment]

    resolved_digest = digest or _compute_local_digest(assets_root)
    root_to_platforms, platform_to_root = resolve_platform_projection_roots(assets_root, platforms)
    sorted_proj_roots = sorted(root_to_platforms.keys())
    primary_proj_root = (
        ".agents/skills"
        if ".agents/skills" in root_to_platforms
        else (sorted_proj_roots[0] if sorted_proj_roots else ".agents/skills")
    )

    # 1. Load source registry (preserve pack set in consumer registry.json without duplicating skill dirs under .aief/skills/)
    full_reg = json.loads((assets_root / "skills" / "registry.json").read_text(encoding="utf-8"))
    allowed_prefixes = ["skills/core/"] + [f"{OPTIONAL_PACK_DIRS[p]}/" for p in optional_packs if p in OPTIONAL_PACK_DIRS]

    registry_skills: List[Dict[str, object]] = []
    active_framework_skills: List[Dict[str, object]] = []
    custom_skills_map: Dict[str, Dict[str, object]] = overlay["custom_skills"]  # type: ignore[assignment]

    for skill in full_reg.get("skills", []):
        raw_src_path = str(skill.get("source_path") or skill.get("path") or "").replace("\\", "/")
        canon_rel = (
            raw_src_path[len(fw_prefix) :]
            if (fw_prefix and raw_src_path.startswith(fw_prefix))
            else raw_src_path
        )
        if not any(canon_rel.startswith(pref) for pref in allowed_prefixes):
            continue
        skill_copy = dict(skill)
        sname = str(skill_copy["name"])
        skill_copy["source_path"] = canon_rel
        if is_isolated:
            skill_copy["path"] = f"{primary_proj_root}/{sname}/SKILL.md"
            skill_copy["upstream_preserved_path"] = None
        else:
            skill_copy["path"] = canon_rel
        is_enabled = (sname not in disabled_skills) and (sname not in custom_skills_map)
        if not is_enabled:
            skill_copy["enabled"] = False
        else:
            skill_copy.pop("enabled", None)
            active_framework_skills.append(skill_copy)
        registry_skills.append(skill_copy)

    consumer_registry = {
        "schema_version": full_reg.get("schema_version", "2.0.0"),
        "framework_version": full_reg.get("framework_version", "0.5.0"),
        "description": "Filtered consumer skill registry generated by AI Engineering Framework",
        "total_skills": len(registry_skills),
        "skills": registry_skills,
    }

    active_skill_names: Set[str] = {str(s["name"]) for s in active_framework_skills} | set(custom_skills_map.keys())

    # 2. Compose active & custom agents
    agent_overrides: Dict[str, Dict[str, object]] = overlay["agent_overrides"]  # type: ignore[assignment]
    agent_appends: Dict[str, str] = overlay["agent_appends"]  # type: ignore[assignment]

    composed_agents_meta: List[Dict[str, object]] = []
    composed_agent_files: Dict[str, bytes] = {}
    canonical_agent_names: Set[str] = set()

    for agent_path in sorted((assets_root / "agents").glob("*.md")):
        raw_text = agent_path.read_text(encoding="utf-8").replace("\r\n", "\n")
        meta, _ = parse_simple_frontmatter(raw_text)
        name = str(meta.get("name") or agent_path.stem)
        canonical_agent_names.add(name)
        is_disabled = name in disabled_agents
        if name in agent_overrides:
            ov = agent_overrides[name]
            if not is_disabled:
                composed_agents_meta.append(
                    {
                        "name": name,
                        "title": ov["title"],
                        "phases": ov["phases"],
                        "path": ov["rel_path"],
                        "source_type": "custom_override",
                        "meta": ov,
                    }
                )
            composed_agent_files[f"{fw_prefix}agents/{agent_path.name}"] = str(ov["raw_text"]).rstrip() + "\n"
            continue

        append_pattern = re.compile(rf"\n+## Project-Specific Rules \({re.escape(name)}\)\n.*\Z", re.DOTALL)
        base_text = append_pattern.sub("", raw_text).rstrip()
        filtered_text = filter_agent_required_skills(base_text, active_skill_names) + "\n"
        if name in agent_appends:
            filtered_text = filtered_text.rstrip() + f"\n\n## Project-Specific Rules ({name})\n{agent_appends[name]}\n"
        if not is_disabled:
            composed_agents_meta.append(
                {
                    "name": name,
                    "title": meta.get("title", name),
                    "phases": meta.get("phases", []),
                    "path": f"{fw_prefix}agents/{agent_path.name}",
                    "source_type": "framework",
                    "meta": meta,
                }
            )
        composed_agent_files[f"{fw_prefix}agents/{agent_path.name}"] = filtered_text.encode("utf-8")

    # Convert byte entries to bytes uniformly
    for key, val in list(composed_agent_files.items()):
        if isinstance(val, str):
            composed_agent_files[key] = val.encode("utf-8")

    # Add purely custom agents from overlay
    pure_custom_agents: List[Dict[str, object]] = []
    for role_name, ov in sorted(agent_overrides.items()):
        if role_name not in canonical_agent_names and role_name not in disabled_agents:
            pure_custom_agents.append(ov)
            composed_agents_meta.append(
                {
                    "name": role_name,
                    "title": ov["title"],
                    "phases": ov["phases"],
                    "path": ov["rel_path"],
                    "source_type": "custom",
                    "meta": ov,
                }
            )

    # 3. Compose tables & inline custom block
    agents_table_lines = [
        "| Role ID | Title | Workflow Phases | Specification |",
        "| :--- | :--- | :--- | :--- |",
    ]
    for a in composed_agents_meta:
        p_val = a["phases"]
        p_str = ", ".join(str(x) for x in p_val) if isinstance(p_val, list) else str(p_val)
        agents_table_lines.append(f"| `{a['name']}` | {a['title']} | {p_str} | [`{a['path']}`](./{a['path']}) |")
    agents_table = "\n".join(agents_table_lines)

    skills_table_lines = [
        "| Skill Name | Tier | Origin | Path |",
        "| :--- | :--- | :--- | :--- |",
    ]
    for sk in active_framework_skills:
        sk_rel = str(sk["path"]).replace("\\", "/")
        skills_table_lines.append(
            f"| `{sk['name']}` | `{sk['tier']}` | `framework` | [`{sk_rel}`](./{sk_rel}) |"
        )
    for cname in sorted(custom_skills_map.keys()):
        if cname in disabled_skills:
            continue
        csk = custom_skills_map[cname]
        rel_sk = f"{csk['rel_dir']}/SKILL.md"
        skills_table_lines.append(f"| `{cname}` | `custom` | `project` | [`{rel_sk}`](./{rel_sk}) |")
    skills_table = "\n".join(skills_table_lines)

    inj_mode = str(customizations["promptInjectionMode"])
    max_bytes = int(customizations["inlineMaxBytes"])
    overlay_rel_eff = str(customizations["overlayDir"])
    overlay_section = _format_overlay_section(overlay, inj_mode, max_bytes)
    stage_lines = _active_stage_lines(disabled_phases, fw_prefix=fw_prefix)
    stages_md = "\n".join(f"- **{lbl}:** [`{p}`](./{p})" for lbl, p in stage_lines) or f"- *All workflow stages disabled in `{config_rel}`.*"

    custom_prompts_map: Dict[str, Dict[str, object]] = dict(overlay.get("custom_prompts") or {})  # type: ignore[arg-type]
    custom_mcp_map: Dict[str, Dict[str, object]] = dict(overlay.get("custom_mcp") or {})  # type: ignore[arg-type]

    custom_extras_parts: List[str] = []
    if custom_prompts_map:
        prompt_rows = [
            "| Prompt Slug | Description | Source |",
            "| :--- | :--- | :--- |",
        ]
        for slug in sorted(custom_prompts_map.keys()):
            pr = custom_prompts_map[slug]
            prompt_rows.append(f"| `/{slug}` | {pr['description']} | [`{pr['rel_path']}`](./{pr['rel_path']}) |")
        custom_extras_parts.append(f"## Custom Prompts (`{overlay_rel_eff}/prompts/`)\n" + "\n".join(prompt_rows))
    if custom_mcp_map:
        mcp_list = ", ".join(f"`{k}`" for k in sorted(custom_mcp_map.keys()))
        custom_extras_parts.append(
            f"## Custom MCP Servers (`{overlay_rel_eff}/mcp.json`)\n"
            f"- Active MCP servers: {mcp_list} (projected to `.mcp.json`, `.vscode/mcp.json`, `.codex/config.toml`, `.gemini/settings.json`, and `{agy_mcp_rel}`)."
        )
    custom_extras_md = ("\n\n" + "\n\n".join(custom_extras_parts)) if custom_extras_parts else ""

    root_rules = "\n".join(
        _render_inline_rules_bullets(
            profile,
            disabled,
            prefix_rel=".",
            fw_prefix=fw_prefix,
            config_rel=config_rel,
            state_rel=state_rel,
            validate_cmd=validate_cmd,
        )
    )
    agents_md_text = (
        f"<!-- AUTO-GENERATED CONSUMER ADAPTER | Canonical Digest: {resolved_digest} -->\n"
        "# AI Engineering Framework — Universal Agent Instructions (`AGENTS.md`)\n\n"
        "This repository is governed by the **AI Engineering Framework** and project-specific rules.\n"
        "Follow these active instructions automatically without requiring per-turn file reminders.\n\n"
        "## 1. Active Engineering Rules & Gates\n"
        f"{root_rules}\n"
        f"- **Self-Maintained Customizations:** Whenever you or the user modify `{overlay_rel_eff}/` or `{config_rel}`, "
        f"automatically run `{compose_cmd}` (which re-composes and validates consumer integrity in one step).\n\n"
        f"{overlay_section}{custom_extras_md}\n\n"
        f"## 2. Active Stage Runbooks (`{fw_prefix}workflows/`)\n"
        f"{stages_md}\n\n"
        "## 3. Active Agent Roles\n"
        f"{agents_table}\n\n"
        "## 4. Active Skills\n"
        f"{skills_table}\n\n"
        "## 5. Consumer Command\n"
        "```bash\n"
        f"{compose_cmd}   # Re-compose inline instructions + validate consumer workspace in one command\n"
        "```\n"
    )

    # Active skill pack entries for Antigravity .agents/skills.json
    agy_entries: List[Dict[str, str]] = []
    seen_agy_dirs: Set[str] = set()
    if is_isolated:
        if (active_framework_skills or any(c not in disabled_skills for c in custom_skills_map)) and ".agents/skills" in sorted_proj_roots:
            agy_entries.append({"path": ".agents/skills"})
            seen_agy_dirs.add(".agents/skills")
    else:
        for sk in active_framework_skills:
            raw_sk = str(sk["path"]).replace("\\", "/")
            canon_sk = raw_sk[len(fw_prefix) :] if (fw_prefix and raw_sk.startswith(fw_prefix)) else raw_sk
            p_dir = posixpath.dirname(posixpath.dirname(canon_sk))
            mapped_dir = f"{fw_prefix}{p_dir}" if p_dir else ""
            if mapped_dir and mapped_dir not in seen_agy_dirs:
                seen_agy_dirs.add(mapped_dir)
                agy_entries.append({"path": mapped_dir})
        for cname in sorted(custom_skills_map.keys()):
            if cname not in disabled_skills and ".agents/skills" not in seen_agy_dirs:
                seen_agy_dirs.add(".agents/skills")
                agy_entries.append({"path": ".agents/skills"})
                break

    fw_rel_from_dot = fw_prefix.rstrip("/") if fw_prefix else "."
    fw_rel_from_one = f"../{fw_prefix.rstrip('/')}" if fw_prefix else ".."
    fw_rel_from_two = f"../../{fw_prefix.rstrip('/')}" if fw_prefix else "../.."
    compose_cmd_script = f"{fw_prefix}scripts/compose.py"
    validate_cmd_script = f"{fw_prefix}scripts/validate.py"

    # Build platform-specific entry files without duplicating AGENTS.md inline body on Antigravity/Gemini/Copilot
    platform_files: Dict[str, str] = {
        "AGENTS.md": agents_md_text,
        ".agents/skills.json": json.dumps({"entries": agy_entries}, indent=2) + "\n",
        agy_skills_rel: json.dumps({"entries": agy_entries}, indent=2) + "\n",
        "CLAUDE.md": (
            f"<!-- AUTO-GENERATED CONSUMER ADAPTER (AI Engineering Framework) | Canonical Digest: {resolved_digest} -->\n"
            "# Claude Code Instructions (`CLAUDE.md`)\n\n"
            "Apply all active framework and project rules automatically at session start.\n\n"
            "## Active Rules & Gates\n"
            f"{root_rules}\n\n"
            f"{overlay_section}\n\n"
            "## Claude Code Workspace Layout\n"
            "- **Active Skills:** Projected automatically into `.claude/skills/`\n"
            "- **Subagents:** `.claude/agents/`\n"
            "- **Slash Commands:** `.claude/commands/`\n"
            "- **Full Index:** [`AGENTS.md`](./AGENTS.md)\n"
            f"- **Auto-Sync Rule:** Run `{compose_cmd}` automatically after editing `{overlay_rel_eff}/` or `{config_rel}` (composes + validates in one command).\n"
        ),
        "GEMINI.md": (
            f"<!-- AUTO-GENERATED CONSUMER ADAPTER (AI Engineering Framework) | Canonical Digest: {resolved_digest} -->\n"
            "# Google Antigravity & Gemini CLI Instructions (`GEMINI.md`)\n\n"
            "Follow [`AGENTS.md`](./AGENTS.md) for all active framework rules, gates, stage runbooks, and project customizations.\n\n"
            "## Platform Integration Notes\n"
            "- **Google Antigravity:** Skills indexed in `.agents/skills.json` and projected into `.agents/skills/`; "
            "delegate isolated research to `research` and UI checks to `browser` (`Model=\"flash\"`).\n"
            "- **Gemini CLI:** Stage commands in `.gemini/commands/workflow.toml` and skills in `.agents/skills/`.\n"
            f"- **Auto-Sync Rule:** Run `{compose_cmd}` automatically after editing `{overlay_rel_eff}/` or `{config_rel}`.\n"
        ),
        ".github/copilot-instructions.md": (
            f"<!-- AUTO-GENERATED CONSUMER ADAPTER (AI Engineering Framework) | Canonical Digest: {resolved_digest} -->\n"
            "# GitHub Copilot Workspace Instructions\n\n"
            "Follow [`AGENTS.md`](../AGENTS.md) for all active framework rules, gates, stage runbooks, and project customizations.\n\n"
            f"- **Validation & Compose:** Run `{validate_cmd}` (or `{compose_cmd}` after editing `{overlay_rel_eff}/` or `{config_rel}`).\n"
        ),
        ".github/instructions/framework.instructions.md": (
            "---\n"
            'applyTo: "**/*"\n'
            'description: "AI Engineering Framework active rules and project customizations for GitHub Copilot"\n'
            "---\n"
            f"<!-- AUTO-GENERATED CONSUMER ADAPTER (AI Engineering Framework) | Canonical Digest: {resolved_digest} -->\n"
            f"Follow [`AGENTS.md`](../../AGENTS.md), [`{fw_prefix}core/rules/engineering-principles.md`]({fw_rel_from_two}/core/rules/engineering-principles.md), "
            f"and [`{fw_prefix}core/rules/security-guardrails.md`]({fw_rel_from_two}/core/rules/security-guardrails.md).\n"
        ),
        ".agents/rules/framework-core.md": (
            "---\n"
            "trigger: always_on\n"
            "---\n"
            f"<!-- AUTO-GENERATED CONSUMER ADAPTER (AI Engineering Framework) | Canonical Digest: {resolved_digest} -->\n"
            "# Antigravity Workspace Rule — AI Engineering Framework\n\n"
            f"Follow [`AGENTS.md`](../../AGENTS.md) and [`{fw_prefix}core/rules/engineering-principles.md`]({fw_rel_from_two}/core/rules/engineering-principles.md).\n"
            f"- Run `{compose_cmd}` after editing `{overlay_rel_eff}/` or `{config_rel}`.\n"
            f"- Run `{validate_cmd}` before finishing implementation or release steps.\n"
        ),
        ".claude/settings.json": json.dumps(
            {
                "permissions": {
                    "allow": [
                        f"Bash(python {validate_cmd_script}*)",
                        f"Bash(python {compose_cmd_script}*)",
                        "Bash(graphify *)",
                    ],
                    "deny": [
                        "Bash(git push --force*)",
                        "Bash(rm -rf /*)",
                    ],
                },
            },
            indent=2,
        )
        + "\n",
        hooks_rel: json.dumps(
            {
                "framework-validation-reminder": {
                    "enabled": False,
                    "Stop": [
                        {
                            "type": "command",
                            "command": f"{validate_cmd} --json",
                            "timeout": 30,
                        }
                    ],
                }
            },
            indent=2,
        )
        + "\n",
        ".claude/commands/validate-framework.md": (
            "---\n"
            'description: "Run AI Engineering Framework consumer workspace validation"\n'
            "---\n"
            f"Execute `{validate_cmd}`. Report the exact exit code and validation results.\n"
        ),
        ".gemini/commands/workflow.toml": (
            f"# AUTO-GENERATED CONSUMER ADAPTER | Canonical Digest: {resolved_digest}\n"
            'description = "Execute active AI Engineering Framework workflow stage"\n'
            'prompt = """\n'
            f"Read AGENTS.md, follow active {fw_prefix}workflows/ stage runbooks, and check {state_rel}/manifest.json (handoffs disabled: {'handoffs' in disabled_mechs}).\n"
            f"Respect active gates: {', '.join(_active_gates(disabled['gates'])) or 'None'}.\n"  # type: ignore[arg-type]
            '"""\n'
        ),
        ".codex/config.toml": _build_codex_config_toml(resolved_digest, custom_mcp_map),
        ".gemini/settings.json": (
            json.dumps(
                {
                    "contextFileName": ["GEMINI.md", "AGENTS.md"],
                    **({"mcpServers": {k: dict(custom_mcp_map[k]) for k in sorted(custom_mcp_map.keys())}} if custom_mcp_map else {}),
                },
                indent=2,
            )
            + "\n"
        ),
    }

    # Custom prompts (.framework-custom/prompts/*.md) -> Copilot, Claude Code, Gemini CLI
    copilot_prompt_entries: Dict[str, Tuple[bytes, str]] = {}
    claude_prompt_entries: Dict[str, Tuple[bytes, str]] = {}
    gemini_prompt_entries: Dict[str, Tuple[bytes, str]] = {}
    for slug in sorted(custom_prompts_map.keys()):
        pr = custom_prompts_map[slug]
        desc_safe = str(pr["description"]).replace('"', "'")
        body_txt = str(pr["body"])
        copilot_prompt_entries[f".github/prompts/{slug}.prompt.md"] = (
            f"---\ndescription: \"{desc_safe}\"\n---\n{body_txt}\n".encode("utf-8"),
            "consumer_custom_prompt",
        )
        claude_prompt_entries[f".claude/commands/{slug}.md"] = (
            f"---\ndescription: \"{desc_safe}\"\n---\n{body_txt}\n".encode("utf-8"),
            "consumer_custom_prompt",
        )
        gemini_prompt_entries[f".gemini/commands/{slug}.toml"] = (
            (
                f"# AUTO-GENERATED CONSUMER CUSTOM PROMPT | Canonical Digest: {resolved_digest}\n"
                f"description = {_toml_str(str(pr['description']))}\n"
                f"prompt = {_toml_str(body_txt)}\n"
            ).encode("utf-8"),
            "consumer_custom_prompt",
        )

    # Custom MCP servers (.framework-custom/mcp.json) -> Claude Code, Copilot, Antigravity (+ .codex/config.toml & .gemini/settings.json above)
    mcp_entries: Dict[str, Tuple[bytes, str, List[str]]] = {}
    if custom_mcp_map:
        mcp_entries[".mcp.json"] = (
            _build_standard_mcp_json(custom_mcp_map).encode("utf-8"),
            "consumer_custom_mcp",
            ["claude-code"],
        )
        mcp_entries[".vscode/mcp.json"] = (
            _build_copilot_mcp_json(custom_mcp_map).encode("utf-8"),
            "consumer_custom_mcp",
            ["copilot"],
        )
        mcp_entries[agy_mcp_rel] = (
            _build_standard_mcp_json(custom_mcp_map).encode("utf-8"),
            "consumer_custom_mcp",
            ["antigravity"],
        )

    # Project every active canonical/overridden role into .claude/agents/ & .github/agents/
    claude_agent_entries: Dict[str, Tuple[bytes, str]] = {}
    copilot_agent_entries: Dict[str, Tuple[bytes, str]] = {}
    for agent_meta_row in composed_agents_meta:
        src_type = str(agent_meta_row.get("source_type", ""))
        if src_type not in {"framework", "custom_override"}:
            continue
        rname = str(agent_meta_row["name"])
        if rname == "code-reviewer" and (("code-review" in disabled_mechs) or (10 in disabled_phases)):
            continue
        rmeta: Dict[str, object] = dict(agent_meta_row.get("meta") or {})  # type: ignore[arg-type]
        claude_sub, claude_md, copilot_sub, copilot_md = render_platform_agent_files(
            role_name=rname,
            title=str(agent_meta_row.get("title", rname)),
            description=str(rmeta.get("description", agent_meta_row.get("title", rname))),
            allowed_tools=rmeta.get("allowed_tools", []),
            phases=agent_meta_row.get("phases", []),
            fw_prefix=fw_prefix,
            append_rules=agent_appends.get(rname, ""),
        )
        claude_dst = ".claude/agents/framework-code-reviewer.md" if rname == "code-reviewer" else f".claude/agents/{claude_sub}"
        ownership = "consumer_custom_agent" if src_type == "custom_override" else "framework_managed"
        claude_agent_entries[claude_dst] = (claude_md.encode("utf-8"), ownership)
        copilot_agent_entries[f".github/agents/{copilot_sub}"] = (copilot_md.encode("utf-8"), ownership)

    for ca in pure_custom_agents:
        cname = str(ca["name"])
        c_desc = str(ca["description"]).replace('"', "'")
        c_body = str(ca["body"]) or f"Follow {ca['rel_path']}."
        claude_tools = _translate_tools_for_claude(ca.get("allowed_tools"))
        copilot_tools = json.dumps(_translate_tools_for_copilot(ca.get("allowed_tools")))
        if "reviewer" in cname:
            claude_tools = "Read, Glob, Grep"
            copilot_tools = '["read", "search"]'
            disallowed = "disallowedTools: Write, Edit, Bash\n"
        else:
            disallowed = ""
        claude_agent_entries[f".claude/agents/{cname}.md"] = (
            f"---\nname: {cname}\ndescription: \"{c_desc}\"\ntools: {claude_tools}\n{disallowed}---\n{c_body}\n".encode("utf-8"),
            "consumer_custom_agent",
        )
        copilot_agent_entries[f".github/agents/{cname}.agent.md"] = (
            f"---\ndescription: \"{c_desc}\"\ntools: {copilot_tools}\n---\n{c_body}\n".encode("utf-8"),
            "consumer_custom_agent",
        )

    # 4. Native projections (active framework skills + consumer custom skills)
    projected_skills_summary: Dict[str, Dict[str, object]] = {}
    all_projected_names = sorted(
        {str(s["name"]) for s in active_framework_skills}
        | {k for k in custom_skills_map if k not in disabled_skills}
    )
    for pid in sorted(platform_to_root.keys()):
        projected_skills_summary[pid] = {
            "projection_root": platform_to_root[pid],
            "skills": list(all_projected_names),
        }

    projected_files: Dict[str, Dict[str, object]] = {}
    projected_md_checks: List[Tuple[str, str]] = []
    skill_dir_map: Dict[str, str] = {}
    if is_isolated:
        for sk in active_framework_skills:
            sname_m = str(sk["name"])
            canon_src_m = str(sk.get("source_path") or sk["path"]).replace("\\", "/")
            if fw_prefix and canon_src_m.startswith(fw_prefix):
                canon_src_m = canon_src_m[len(fw_prefix) :]
            skill_dir_map[posixpath.dirname(canon_src_m)] = f"{primary_proj_root}/{sname_m}"

    for proj_root, owner_pids in sorted(root_to_platforms.items()):
        # Framework active skills
        for sk in active_framework_skills:
            skill_name = validate_safe_rel_path(str(sk["name"]), label="skill name")
            if "/" in skill_name:
                raise BootstrapSecurityError(f"Nested skill name rejected: {skill_name}")
            canon_source_rel = validate_safe_rel_path(
                str(sk.get("source_path") or sk["path"]), label="skill source path"
            )
            if fw_prefix and canon_source_rel.startswith(fw_prefix):
                canon_source_rel = canon_source_rel[len(fw_prefix) :]
            canon_skill_dir = posixpath.dirname(canon_source_rel)
            per_skill_map = dict(skill_dir_map)
            per_skill_map[canon_skill_dir] = f"{proj_root}/{skill_name}"
            skill_src_dir = _resolve_skill_source_dir(
                sk,
                assets_root,
                target_dir,
                canon_source_rel,
                sorted_proj_roots,
                external_source_root=external_source_root,
            )
            using_existing_projection = (
                skill_src_dir.is_relative_to(target_dir)
                and not skill_src_dir.is_relative_to(target_dir / AIEF_DIR)
            )
            for src in sorted(skill_src_dir.rglob("*")):
                if not src.is_file() or "__pycache__" in src.parts or src.suffix == ".pyc" or src.name == "UPSTREAM_SKILL.md":
                    continue
                rel_inside = src.relative_to(skill_src_dir).as_posix()
                src_rel_canon = f"{canon_skill_dir}/{rel_inside}"
                consumer_src_rel = str(sk["path"]) if rel_inside == "SKILL.md" else f"{posixpath.dirname(str(sk['path']))}/{rel_inside}"
                dst_rel = validate_safe_rel_path(f"{proj_root}/{skill_name}/{rel_inside}", label="projection")
                if src.suffix.lower() == ".md":
                    raw_src_md = src.read_text(encoding="utf-8")
                    if using_existing_projection:
                        src_cur_rel = src.relative_to(target_dir).as_posix()
                        src_skill_root_rel = skill_src_dir.relative_to(target_dir).as_posix()
                        rewritten = rewrite_markdown_relative_links(
                            raw_src_md,
                            src_cur_rel,
                            dst_rel,
                            fw_prefix="",
                            skill_dir_map={src_skill_root_rel: f"{proj_root}/{skill_name}"},
                            strip_upstream_snapshot_links=is_isolated,
                        )
                    else:
                        rewritten = rewrite_markdown_relative_links(
                            raw_src_md,
                            src_rel_canon,
                            dst_rel,
                            fw_prefix=fw_prefix,
                            skill_dir_map=per_skill_map if is_isolated else None,
                            strip_upstream_snapshot_links=is_isolated,
                        )
                    data = rewritten.encode("utf-8")
                    projected_md_checks.append((dst_rel, rewritten))
                else:
                    data = read_normalized_text_bytes(src)
                projected_files[dst_rel] = {
                    "bytes": data,
                    "ownership": "platform_projected_skill",
                    "source": consumer_src_rel,
                    "skill": skill_name,
                    "platforms": sorted(owner_pids),
                }

        # Consumer custom skills (.framework-custom/skills/<name>/)
        for cname in sorted(custom_skills_map.keys()):
            if cname in disabled_skills:
                continue
            csk = custom_skills_map[cname]
            src_dir: Path = csk["source_dir"]  # type: ignore[assignment]
            for rel_inside, src in csk["files"]:  # type: ignore[attr-defined]
                src_rel = src.relative_to(target_dir).as_posix()
                dst_rel = validate_safe_rel_path(f"{proj_root}/{cname}/{rel_inside}", label="custom projection")
                if src.suffix.lower() == ".md":
                    rewritten = rewrite_markdown_relative_links(src.read_text(encoding="utf-8"), src_rel, dst_rel)
                    data = rewritten.encode("utf-8")
                else:
                    data = read_normalized_text_bytes(src)
                projected_files[dst_rel] = {
                    "bytes": data,
                    "ownership": "consumer_custom_skill",
                    "source": src_rel,
                    "skill": cname,
                    "platforms": sorted(owner_pids),
                }

    return {
        "digest": resolved_digest,
        "consumer_registry": consumer_registry,
        "composed_agent_files": composed_agent_files,
        "platform_files": platform_files,
        "claude_agent_entries": claude_agent_entries,
        "copilot_agent_entries": copilot_agent_entries,
        "copilot_prompt_entries": copilot_prompt_entries,
        "claude_prompt_entries": claude_prompt_entries,
        "gemini_prompt_entries": gemini_prompt_entries,
        "mcp_entries": mcp_entries,
        "projected_files": projected_files,
        "projected_skills_summary": projected_skills_summary,
        "projected_md_checks": projected_md_checks,
        "skill_dir_map": skill_dir_map,
        "active_custom_skills": sorted(k for k in custom_skills_map if k not in disabled_skills),
        "active_custom_prompts": sorted(custom_prompts_map.keys()),
        "active_custom_mcp": sorted(custom_mcp_map.keys()),
        "disabled": disabled,
        "customizations": customizations,
    }


def _collect_composed_plan_entries(
    target_dir: Path,
    platforms: List[str],
    optional_packs: List[str],
    cfg: Dict[str, object],
    digest: str | None = None,
    layout: Dict[str, str] | None = None,
) -> Tuple[Dict[str, Dict[str, object]], Dict[str, Dict[str, object]], List[str], List[str], List[str], str]:
    active_layout = layout or resolve_consumer_layout(target_dir)
    fw_prefix = active_layout["fw_prefix"]
    hooks_rel = active_layout["hooks_rel"]
    reg_rel = f"{fw_prefix}skills/registry.json"

    controls = normalize_project_controls(cfg, default_overlay_dir=active_layout["overlay_default"])
    overlay_rel = str(customizations_dir := controls["customizations"]["overlayDir"])  # noqa: F841
    overlay = load_project_overlay(target_dir, overlay_rel)
    comp = compose_consumer_artifacts(
        source_root=target_dir,
        target_dir=target_dir,
        platforms=platforms,
        profile=str(cfg.get("workflowProfile", "standard")),
        optional_packs=optional_packs,
        config_data=cfg,
        overlay=overlay,
        digest=digest,
        layout=active_layout,
    )

    entries: Dict[str, Dict[str, object]] = {}

    def _put(rel: str, data: bytes, ownership: str, source: str | None, owners: List[str], skill: str | None = None) -> None:
        safe_rel = validate_safe_rel_path(rel, label="composed destination")
        if safe_rel in entries:
            entries[safe_rel]["platforms"] = sorted(set(entries[safe_rel]["platforms"]) | set(owners))  # type: ignore[arg-type]
            entries[safe_rel]["bytes"] = data
            return
        entries[safe_rel] = {
            "bytes": data,
            "ownership": ownership,
            "source": source,
            "skill": skill,
            "platforms": sorted(set(owners)),
        }

    _put(
        reg_rel,
        (json.dumps(comp["consumer_registry"], indent=2) + "\n").encode("utf-8"),
        "framework_managed",
        reg_rel,
        ["core"],
    )
    for rel, data in comp["composed_agent_files"].items():  # type: ignore[attr-defined]
        _put(rel, data, "framework_managed", rel, ["core"])

    pfiles: Dict[str, str] = comp["platform_files"]  # type: ignore[assignment]
    if "antigravity" in platforms:
        for rel in ("GEMINI.md", "AGENTS.md", ".agents/rules/framework-core.md", ".agents/skills.json", hooks_rel):
            _put(rel, pfiles[rel].encode("utf-8"), "framework_managed", rel, ["antigravity"])
    if "copilot" in platforms:
        for rel in ("AGENTS.md", ".github/copilot-instructions.md", ".github/instructions/framework.instructions.md"):
            _put(rel, pfiles[rel].encode("utf-8"), "framework_managed", rel, ["copilot"])
        for rel, (data, own) in comp["copilot_agent_entries"].items():  # type: ignore[attr-defined]
            _put(rel, data, own, rel, ["copilot"])
        for rel, (data, own) in comp["copilot_prompt_entries"].items():  # type: ignore[attr-defined]
            _put(rel, data, own, rel, ["copilot"])
    if "claude-code" in platforms:
        for rel in ("CLAUDE.md", "AGENTS.md", ".claude/settings.json", ".claude/commands/validate-framework.md"):
            _put(rel, pfiles[rel].encode("utf-8"), "framework_managed", rel, ["claude-code"])
        for rel, (data, own) in comp["claude_agent_entries"].items():  # type: ignore[attr-defined]
            _put(rel, data, own, rel, ["claude-code"])
        for rel, (data, own) in comp["claude_prompt_entries"].items():  # type: ignore[attr-defined]
            _put(rel, data, own, rel, ["claude-code"])
    if "codex" in platforms:
        for rel in ("AGENTS.md", ".codex/config.toml"):
            _put(rel, pfiles[rel].encode("utf-8"), "framework_managed", rel, ["codex"])
    if "gemini-cli" in platforms:
        for rel in ("GEMINI.md", "AGENTS.md", ".gemini/settings.json", ".gemini/commands/workflow.toml"):
            _put(rel, pfiles[rel].encode("utf-8"), "framework_managed", rel, ["gemini-cli"])
        for rel, (data, own) in comp["gemini_prompt_entries"].items():  # type: ignore[attr-defined]
            _put(rel, data, own, rel, ["gemini-cli"])
    for rel, (data, own, owners) in comp["mcp_entries"].items():  # type: ignore[attr-defined]
        active_owners = [p for p in owners if p in platforms]
        if active_owners:
            _put(rel, data, own, rel, active_owners)

    for dst_rel, meta in comp["projected_files"].items():  # type: ignore[attr-defined]
        entries[dst_rel] = meta

    check_case_collisions(entries.keys())
    return (
        entries,
        comp["projected_skills_summary"],
        comp["active_custom_skills"],
        comp["active_custom_prompts"],
        comp["active_custom_mcp"],
        str(comp["digest"]),
    )  # type: ignore[return-value]


def compose_consumer(target_dir: Path, dry_run: bool = False) -> Dict[str, object]:
    """Re-compose a bootstrapped consumer workspace standalone from config + overlay."""
    target_dir = target_dir.resolve()
    layout = resolve_consumer_layout(target_dir)
    cfg_path = target_dir / layout["config_rel"]
    lock_path = target_dir / layout["lock_rel"]
    if not cfg_path.exists():
        raise FileNotFoundError(f"Missing {layout['config_rel']} in {target_dir}")
    if not lock_path.exists():
        raise LockfileError(f"Missing {layout['lock_rel']} in {target_dir}; run bootstrap.py / aief init first.")

    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    raw_lock = json.loads(lock_path.read_text(encoding="utf-8"))
    if raw_lock.get("schema_version") != LOCKFILE_SCHEMA_VERSION:
        raise LockfileError("compose.py requires Lockfile v2.0.0; migrate via bootstrap.py --update first.")

    platforms = [str(p) for p in cfg.get("enabledPlatforms", raw_lock.get("enabled_platforms", []))]
    optional_packs = [str(p) for p in raw_lock.get("optional_packs", [])]
    stacks = [str(s) for s in cfg.get("stacks", raw_lock.get("stacks", []))]
    prev_managed: Dict[str, Dict[str, object]] = dict(raw_lock.get("managed_files", {}))
    locked_digest = str((raw_lock.get("projection_state") or {}).get("canonical_digest") or "").strip() or None

    desired_entries, projected_skills_summary, custom_skills, custom_prompts, custom_mcp, resolved_digest = _collect_composed_plan_entries(
        target_dir, platforms, optional_packs, cfg, digest=locked_digest, layout=layout
    )

    # Preserve non-composed framework_managed entries (core/, workflows/, templates/, scripts/, skills/*)
    new_managed_files: Dict[str, Dict[str, object]] = {}
    prunable_prefixes = (".agents/skills/", ".claude/skills/", ".claude/agents/", ".github/agents/")
    agy_mcp_rel = layout["agy_mcp_rel"]
    created: List[str] = []
    updated: List[str] = []
    unchanged: List[str] = []
    skipped_modified: List[str] = []
    pruned: List[str] = []
    writes: List[Tuple[str, bytes]] = []
    prunes: List[str] = []

    for old_rel, old_meta in sorted(prev_managed.items()):
        if old_rel in desired_entries:
            continue
        old_path = assert_safe_target_path(target_dir, old_rel, label="locked compose path")
        own = str(old_meta.get("ownership", ""))
        is_dynamic_agent_or_proj = (
            old_rel.startswith(prunable_prefixes)
            and own
            in {
                "platform_projected_skill",
                "consumer_custom_skill",
                "framework_managed",
                "consumer_custom_agent",
            }
        ) or (
            old_rel.startswith((".github/prompts/", ".claude/commands/", ".gemini/commands/"))
            and own == "consumer_custom_prompt"
        ) or (
            old_rel in {".mcp.json", ".vscode/mcp.json", "adapters/antigravity/mcp_config.json", agy_mcp_rel}
            and own == "consumer_custom_mcp"
        )
        if is_dynamic_agent_or_proj and old_path.exists():
            if sha256_file(old_path) == old_meta.get("sha256"):
                pruned.append(old_rel)
                prunes.append(old_rel)
            else:
                skipped_modified.append(old_rel)
                preserved = dict(old_meta)
                preserved["ownership"] = "consumer_customized_generated"
                new_managed_files[old_rel] = preserved
        else:
            new_managed_files[old_rel] = dict(old_meta)

    for rel, meta in sorted(desired_entries.items()):
        dst = assert_safe_target_path(target_dir, rel, label="compose write path")
        src_bytes = bytes(meta["bytes"])
        src_hash = sha256_bytes(src_bytes)
        entry = {
            "ownership": meta["ownership"],
            "source": meta.get("source"),
            "sha256": src_hash,
            "platforms": sorted(str(p) for p in meta.get("platforms", [])),
        }
        if meta.get("skill") is not None:
            entry["skill"] = str(meta["skill"])

        if not dst.exists():
            created.append(rel)
            writes.append((rel, src_bytes))
            new_managed_files[rel] = entry
        else:
            cur_hash = sha256_file(dst)
            prev_meta = prev_managed.get(rel)
            if cur_hash == src_hash:
                unchanged.append(rel)
                new_managed_files[rel] = entry
            elif prev_meta and cur_hash == prev_meta.get("sha256"):
                updated.append(rel)
                writes.append((rel, src_bytes))
                new_managed_files[rel] = entry
            else:
                skipped_modified.append(rel)
                new_managed_files[rel] = dict(prev_meta) if prev_meta else entry

    if not dry_run:
        for rel, data in writes:
            dst = assert_safe_target_path(target_dir, rel, label="compose write")
            atomic_write_bytes(dst, data)
        for old_rel in prunes:
            old_path = assert_safe_target_path(target_dir, old_rel, label="compose prune")
            if old_path.exists() and not is_reparse_or_symlink(old_path):
                old_path.unlink()
        for base_rel in (".agents/skills", ".claude/skills"):
            base = target_dir / Path(base_rel)
            if base.exists() and not is_reparse_or_symlink(base):
                for sub in sorted(base.rglob("*"), key=lambda p: len(p.parts), reverse=True):
                    if sub.is_dir() and not is_reparse_or_symlink(sub):
                        try:
                            next(sub.iterdir())
                        except StopIteration:
                            sub.rmdir()

        skill_names: Set[str] = set()
        for pdata in projected_skills_summary.values():
            skill_names.update(str(s) for s in pdata.get("skills", []))
        proj_file_count = sum(
            1 for v in new_managed_files.values() if v.get("ownership") in {"platform_projected_skill", "consumer_custom_skill"}
        )
        new_lock = dict(raw_lock)
        new_lock["enabled_platforms"] = sorted(set(platforms))
        new_lock["stacks"] = stacks
        new_lock["projected_skills"] = {k: projected_skills_summary[k] for k in sorted(projected_skills_summary.keys())}
        new_lock["managed_files"] = {k: new_managed_files[k] for k in sorted(new_managed_files.keys())}
        new_lock["projection_state"] = {
            "status": "completed",
            "canonical_digest": resolved_digest,
            "last_successful_projection": {
                "framework_version": str(cfg.get("frameworkVersion", raw_lock.get("framework_version", "0.5.0"))),
                "enabled_platforms": sorted(set(platforms)),
                "projected_skill_count": len(skill_names),
                "projected_file_count": proj_file_count,
            },
            "pending_entries": {},
        }
        atomic_write_bytes(lock_path, (json.dumps(new_lock, indent=2) + "\n").encode("utf-8"))

    return {
        "created": created,
        "updated": updated,
        "unchanged": unchanged,
        "pruned": pruned,
        "skipped_modified": skipped_modified,
        "custom_skills": custom_skills,
        "custom_prompts": custom_prompts,
        "custom_mcp": custom_mcp,
    }


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Re-compose consumer instructions, toggles, and custom skills, then validate automatically."
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=_default_repo_root(),
        help="Consumer repository root (defaults to consumer root when invoked from .aief/scripts/)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview composition changes without writing")
    parser.add_argument("--no-validate", action="store_true", help="Skip automatic post-compose consumer validation")
    args = parser.parse_args(argv)

    try:
        summary = compose_consumer(args.root, dry_run=args.dry_run)
    except (ValueError, LockfileError, FileNotFoundError) as exc:
        print(f"COMPOSE_ERROR: {exc}", file=sys.stderr)
        return 2

    mode_lbl = "COMPOSE DRY-RUN" if args.dry_run else "COMPOSE"
    print(f"=== AI Engineering Framework {mode_lbl} ({args.root.resolve()}) ===")
    print(f"  Created:          {len(summary['created'])}")
    print(f"  Updated:          {len(summary['updated'])}")
    print(f"  Unchanged:        {len(summary['unchanged'])}")
    print(f"  Pruned:           {len(summary['pruned'])}")
    print(f"  Skipped/Modified: {len(summary['skipped_modified'])}")
    print(f"  Custom Skills:    {', '.join(summary['custom_skills']) if summary['custom_skills'] else 'none'}")
    print(f"  Custom Prompts:   {', '.join(summary['custom_prompts']) if summary['custom_prompts'] else 'none'}")
    print(f"  Custom MCP:       {', '.join(summary['custom_mcp']) if summary['custom_mcp'] else 'none'}")

    if not args.dry_run and not args.no_validate and (SCRIPT_DIR / "validate.py").exists():
        import validate  # noqa: E402

        passed, report, warnings, _ = validate.run_validation_full(args.root.resolve(), mode="consumer")
        total_errors = sum(len(v) for v in report.values())
        print(f"  Validation:       {'PASS' if passed else 'FAIL'} ({total_errors} error(s), {len(warnings)} warning(s))")
        if not passed:
            for check_name, errs in report.items():
                for err in errs:
                    print(f"      - [{check_name}] {err}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
