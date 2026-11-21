#!/usr/bin/env python3
"""Validate AI Engineering Framework integrity in 'framework', 'consumer', or 'auto' mode.

Modes:
- framework: Validates the upstream AI Engineering Framework authoring repository.
- consumer:  Validates an installed consumer project bootstrapped by scripts/bootstrap.py.
- auto:      Detects repository type via reliable markers (PROJECT_CHARTER.md + scripts/bootstrap.py
             vs project.framework.json / .framework-lock.json / .framework-state/manifest.json).

Usage:
    python scripts/validate.py
    python scripts/validate.py --mode consumer --root /path/to/consumer
    python scripts/validate.py --mode framework --json
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from typing import Dict, List, Set, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent


def _default_repo_root() -> Path:
    parent = SCRIPT_DIR.parent
    if parent.name == ".aief":
        return parent.parent
    return parent


REPO_ROOT = _default_repo_root()

REQUIRED_FOUNDATION_FILES = [
    "PROJECT_CHARTER.md",
    "README.md",
    "LICENSE",
    ".gitignore",
    ".gitattributes",
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
    ".github/copilot-instructions.md",
    "docs/ARCHITECTURE.md",
    "docs/WORKFLOW.md",
    "docs/GETTING_STARTED.md",
    "docs/CUSTOMIZATION_GUIDE.md",
    "docs/INSTALLATION.md",
    "docs/CONFIGURATION.md",
    "docs/CONTRIBUTING.md",
    "docs/SECURITY.md",
    "docs/ROADMAP.md",
    "docs/README.md",
    "docs/SKILL_COMPATIBILITY_MATRIX.md",
    "docs/TOKEN_OPTIMIZATION.md",
    "core/rules/engineering-principles.md",
    "core/rules/context-handoff-protocol.md",
    "core/rules/human-approval-gates.md",
    "core/rules/security-guardrails.md",
    "core/schemas/agent-role.schema.json",
    "core/schemas/skill-frontmatter.schema.json",
    "core/schemas/handoff-packet.schema.json",
    "core/schemas/framework-config.schema.json",
    "skills/registry.json",
    "core/platform-capabilities.json",
    "scripts/bootstrap.py",
    "scripts/compose.py",
    "scripts/validate.py",
    "scripts/sync_adapters.py",
    "scripts/preflight.py",
    "scripts/platform_capabilities.py",
    "scripts/readiness.py",
    "scripts/run_tests.py",
]

REQUIRED_CONSUMER_FILES = [
    "project.framework.json",
    ".framework-lock.json",
    ".framework-state/manifest.json",
    "core/rules/engineering-principles.md",
    "core/rules/context-handoff-protocol.md",
    "core/rules/human-approval-gates.md",
    "core/rules/security-guardrails.md",
    "core/schemas/agent-role.schema.json",
    "core/schemas/skill-frontmatter.schema.json",
    "core/schemas/handoff-packet.schema.json",
    "core/schemas/framework-config.schema.json",
    "skills/registry.json",
    "scripts/validate.py",
]

CONSUMER_PLATFORM_FILES: Dict[str, List[str]] = {
    "antigravity": [
        "GEMINI.md",
        "AGENTS.md",
        ".agents/rules/framework-core.md",
        ".agents/skills.json",
        "adapters/antigravity/hooks.json",
    ],
    "copilot": [
        "AGENTS.md",
        ".github/copilot-instructions.md",
        ".github/instructions/framework.instructions.md",
        ".github/prompts/grill-me.prompt.md",
        ".github/agents/code-reviewer.agent.md",
    ],
    "claude-code": [
        "CLAUDE.md",
        "AGENTS.md",
        ".claude/settings.json",
        ".claude/commands/grill-me.md",
        ".claude/commands/validate-framework.md",
        ".claude/agents/framework-code-reviewer.md",
    ],
    "codex": [
        "AGENTS.md",
        ".codex/config.toml",
    ],
    "gemini-cli": [
        "GEMINI.md",
        "AGENTS.md",
        ".gemini/settings.json",
        ".gemini/commands/workflow.toml",
    ],
}

REQUIRED_AGENT_KEYS = {
    "name",
    "title",
    "description",
    "version",
    "phases",
    "allowed_tools",
    "required_skills",
    "delegation_targets",
    "approval_gates",
}

REQUIRED_SKILL_KEYS = {
    "name",
    "description",
    "version",
    "source",
    "license",
    "category",
    "tier",
    "platforms",
    "requires_tools",
    "dependencies",
    "security_scope",
}

REQUIRED_MANIFEST_KEYS = {
    "schema_version",
    "project_name",
    "framework_version",
    "workflow_profile",
    "current_phase",
    "status",
    "completed_phases",
}

REQUIRED_HANDOFF_KEYS = {
    "schema_version",
    "phase_number",
    "phase_slug",
    "status",
    "producer_role",
    "next_role",
    "input_artifacts",
    "output_artifacts",
}

REQUIRED_CONSUMER_CONFIG_KEYS = {
    "frameworkVersion",
    "projectName",
    "workflowProfile",
    "enabledPlatforms",
    "optionalSkillPacks",
    "qualityGates",
    "security",
    "paths",
}

VALID_SKILL_TIERS = {
    "core",
    "optional-communication",
    "optional-context",
    "optional-agent-architecture",
    "optional-frontend",
    "optional-growth",
}

VALID_SKILL_CATEGORIES = {
    "core-sdlc",
    "token-optimization",
    "context-engineering",
    "ui-ux-design",
    "agent-architecture",
    "codebase-intelligence",
    "seo-growth",
}

VALID_LICENSES = {
    "Apache-2.0",
    "MIT",
    "BSD-3-Clause",
}

VALID_PLATFORMS = {
    "antigravity",
    "copilot",
    "claude-code",
    "codex",
    "gemini-cli",
}

VALID_SECURITY_SCOPES = {
    "read-only",
    "workspace-write",
    "network-external",
}

SECRET_PATTERNS = [
    ("RSA_PRIVATE_KEY", re.compile(r"-----BEGIN RSA PRIVATE KEY-----")),
    ("OPENSSH_PRIVATE_KEY", re.compile(r"-----BEGIN OPENSSH PRIVATE KEY-----")),
    ("GITHUB_PAT", re.compile(r"ghp_[A-Za-z0-9]{36}")),
    ("GITHUB_FINE_PAT", re.compile(r"github_pat_[A-Za-z0-9_]{82}")),
    ("OPENAI_KEY", re.compile(r"sk-proj-[A-Za-z0-9_-]{40,}")),
    ("ANTHROPIC_KEY", re.compile(r"sk-ant-api03-[A-Za-z0-9_-]{80,}")),
    ("AWS_ACCESS_KEY", re.compile(r"AKIA[0-9A-Z]{16}")),
]

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
MD_LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
FENCED_CODE_RE = re.compile(r"```.*?```", re.DOTALL)
AGENTS_MD_SKILL_ROW_RE = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*`[^`]+`\s*\|\s*`[^`]+`\s*\|\s*\[`([^`]+)`\]", re.MULTILINE)
SHA256_HEX_RE = re.compile(r"^[0-9a-fA-F]{64}$")
VALID_OWNERSHIP_CLASSES = {
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
BANNED_CONSUMER_UPSTREAM_TOKENS = (
    "docs/WORKFLOW.md",
    "scripts/sync_adapters.py",
    "scripts/bootstrap.py",
    "python -m unittest",
)


def parse_simple_frontmatter(markdown_text: str) -> Dict[str, object]:
    """Parse canonical YAML frontmatter using only the Python standard library."""
    match = FRONTMATTER_RE.match(markdown_text.replace("\r\n", "\n"))
    if not match:
        return {}
    raw_block = match.group(1)
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
                    if cleaned.isdigit():
                        items.append(int(cleaned))
                    else:
                        items.append(cleaned)
                result[key] = items
        elif val.startswith('"') and val.endswith('"'):
            result[key] = val[1:-1]
        elif val.startswith("'") and val.endswith("'"):
            result[key] = val[1:-1]
        elif val.lower() in ("true", "false"):
            result[key] = val.lower() == "true"
        elif val.isdigit():
            result[key] = int(val)
        else:
            result[key] = val
    return result


def resolve_consumer_layout_paths(root: Path) -> Dict[str, str]:
    """Return consumer layout paths, supporting both isolated (.aief/) and legacy (root) installs."""
    root = root.resolve()
    if (root / ".aief").is_dir() or not (
        (root / ".framework-lock.json").exists()
        or (root / "project.framework.json").exists()
        or (root / ".framework-state" / "manifest.json").exists()
    ):
        return {
            "mode": "isolated",
            "fw_prefix": ".aief/",
            "config_rel": ".aief/config.json",
            "lock_rel": ".aief/lock.json",
            "state_rel": ".aief/state",
            "overlay_rel": ".aief/custom",
            "skills_rel": ".aief/skills",
            "agents_rel": ".aief/agents",
            "core_rel": ".aief/core",
            "scripts_rel": ".aief/scripts",
            "hooks_rel": ".aief/adapters/antigravity/hooks.json",
            "workflows_rel": ".aief/workflows",
        }
    return {
        "mode": "legacy",
        "fw_prefix": "",
        "config_rel": "project.framework.json",
        "lock_rel": ".framework-lock.json",
        "state_rel": ".framework-state",
        "overlay_rel": ".framework-custom",
        "skills_rel": "skills",
        "agents_rel": "agents",
        "core_rel": "core",
        "scripts_rel": "scripts",
        "hooks_rel": "adapters/antigravity/hooks.json",
        "workflows_rel": "workflows",
    }


def detect_validation_mode(root: Path) -> str:
    """Detect whether root is the upstream 'framework' repository or a 'consumer' project."""
    root = root.resolve()
    if (root / "PROJECT_CHARTER.md").exists() and (root / "scripts" / "bootstrap.py").exists():
        return "framework"
    if (
        (root / ".aief" / "config.json").exists()
        or (root / ".aief" / "lock.json").exists()
        or (root / ".aief" / "state" / "manifest.json").exists()
        or (root / "project.framework.json").exists()
        or (root / ".framework-lock.json").exists()
        or (root / ".framework-state" / "manifest.json").exists()
    ):
        return "consumer"
    return "framework"


def check_required_files(root: Path, mode: str = "framework") -> List[str]:
    errors: List[str] = []
    if mode == "framework":
        for rel in REQUIRED_FOUNDATION_FILES:
            if not (root / Path(rel)).exists():
                errors.append(f"Missing required file: {rel}")
        return errors

    lp = resolve_consumer_layout_paths(root)
    req_consumer = [
        lp["config_rel"],
        lp["lock_rel"],
        f"{lp['state_rel']}/manifest.json",
        f"{lp['core_rel']}/rules/engineering-principles.md",
        f"{lp['core_rel']}/rules/context-handoff-protocol.md",
        f"{lp['core_rel']}/rules/human-approval-gates.md",
        f"{lp['core_rel']}/rules/security-guardrails.md",
        f"{lp['core_rel']}/schemas/agent-role.schema.json",
        f"{lp['core_rel']}/schemas/skill-frontmatter.schema.json",
        f"{lp['core_rel']}/schemas/handoff-packet.schema.json",
        f"{lp['core_rel']}/schemas/framework-config.schema.json",
        f"{lp['skills_rel']}/registry.json",
        f"{lp['scripts_rel']}/validate.py",
    ]
    for rel in req_consumer:
        if not (root / Path(rel)).exists():
            errors.append(f"Missing required file: {rel}")
    handoffs_rel = f"{lp['state_rel']}/handoffs"
    if not (root / Path(handoffs_rel)).is_dir():
        errors.append(f"Missing required directory: {handoffs_rel}")
    return errors


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _resolve_expected_consumer_projections(
    root: Path,
    enabled_platforms: List[str],
    core_rel: str = "core",
) -> Dict[str, str]:
    """Return {platform_id: projection_root} using core/platform-capabilities.json when available."""
    cap_path = root / Path(core_rel) / "platform-capabilities.json"
    supported_roots = {".agents/skills", ".claude/skills"}
    out: Dict[str, str] = {}
    if cap_path.exists():
        try:
            if str(SCRIPT_DIR) not in sys.path:
                sys.path.insert(0, str(SCRIPT_DIR))
            import platform_capabilities  # noqa: E402

            model = platform_capabilities.load_platform_capabilities(cap_path)
            for pid in enabled_platforms:
                if pid in model.get("by_id", {}):
                    cap = platform_capabilities.get_platform(model, pid)
                    for pat in cap.get("native_skill_dirs", {}).get("paths", []):
                        prefix = str(pat).split("/<name>/", 1)[0].rstrip("/")
                        if prefix in supported_roots:
                            out[pid] = prefix
                            break
            return out
        except Exception:
            pass
    for pid in enabled_platforms:
        if pid == "claude-code":
            out[pid] = ".claude/skills"
        elif pid in {"antigravity", "copilot", "codex", "gemini-cli"}:
            out[pid] = ".agents/skills"
    return out


HOST_GLOBAL_SKILL_LOCATIONS: Tuple[Tuple[str, str, str], ...] = (
    (".agents/skills", "antigravity, codex, gemini-cli", "Host-global shared Agent Skills directory"),
    (".claude/skills", "claude-code", "Host-global Claude Code user skills directory"),
    (".gemini/config/skills", "antigravity", "Host-global Antigravity user skills directory"),
    (".codex/skills", "codex", "Host-global Codex CLI skills directory"),
)


def inspect_host_global_skill_visibility(home_dir: Path | None = None) -> List[str]:
    """Read-only visibility report of host-global skill folders without inspecting/modifying contents."""
    effective_home = home_dir if home_dir is not None else Path.home()
    info_msgs: List[str] = []
    observed_any = False

    for rel_sub, runtimes, label in HOST_GLOBAL_SKILL_LOCATIONS:
        candidate = effective_home / Path(rel_sub)
        if candidate.exists() and candidate.is_dir():
            observed_any = True
            try:
                dir_count = sum(1 for entry in candidate.iterdir() if entry.is_dir())
            except OSError:
                dir_count = 0
            info_msgs.append(
                f"{label} detected (~/{rel_sub}, {dir_count} top-level folder(s)); visible to {runtimes} outside framework workspace control."
            )

    if not observed_any:
        info_msgs.append(
            "No host-global skill directories detected under user home; runtime discovery depends on host defaults."
        )
    return info_msgs


def _is_unsafe_lockfile_path(raw_rel: object) -> bool:
    if not isinstance(raw_rel, str) or not raw_rel.strip():
        return True
    if "\x00" in raw_rel:
        return True
    norm = raw_rel.replace("\\", "/")
    if norm.startswith("/") or re.match(r"^[A-Za-z]:", norm):
        return True
    parts = [p for p in norm.split("/") if p != ""]
    return not parts or any(p in {".", ".."} for p in parts)


def _load_consumer_overlay_controls(root: Path) -> Tuple[Dict[str, object], Set[str], List[str]]:
    """Load consumer controls (disabled.*, customizations.*) and custom skill names safely."""
    errors: List[str] = []
    lp = resolve_consumer_layout_paths(root)
    cfg_data: Dict[str, object] = {}
    cfg_path = root / Path(lp["config_rel"])
    if cfg_path.exists():
        try:
            loaded = json.loads(cfg_path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                cfg_data = loaded
        except Exception:
            cfg_data = {}

    if str(SCRIPT_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPT_DIR))
    try:
        import compose  # noqa: E402

        controls = compose.normalize_project_controls(cfg_data, default_overlay_dir=lp["overlay_rel"])
        overlay_rel = str(controls["customizations"]["overlayDir"])
        overlay = compose.load_project_overlay(root, overlay_rel)
        custom_skills = set(overlay.get("custom_skills", {}).keys())  # type: ignore[union-attr]
        return controls, custom_skills, errors
    except Exception as exc:
        errors.append(f"Consumer customization overlay/config error: {exc}")
        fallback = {
            "disabled": {
                "skills": set(),
                "agents": set(),
                "phases": set(),
                "gates": set(),
                "mechanisms": set(),
            },
            "customizations": {
                "overlayDir": lp["overlay_rel"],
                "promptInjectionMode": "inline",
                "inlineMaxBytes": 16384,
            },
        }
        return fallback, set(), errors


def check_consumer_state(
    root: Path,
    warnings: List[str] | None = None,
    info: List[str] | None = None,
    home_dir: Path | None = None,
) -> List[str]:
    """Validate consumer project configuration, Lockfile v2 / projections, manifest, and handoffs."""
    errors: List[str] = []
    warn_list = warnings if warnings is not None else []
    info_list = info if info is not None else []
    enabled_platforms: List[str] = []

    lp = resolve_consumer_layout_paths(root)
    cfg_rel = lp["config_rel"]
    lock_rel = lp["lock_rel"]
    state_rel = lp["state_rel"]
    reg_rel = f"{lp['skills_rel']}/registry.json"

    controls, custom_skills_names, overlay_errs = _load_consumer_overlay_controls(root)
    errors.extend(overlay_errs)
    disabled_ctrl: Dict[str, object] = controls["disabled"]  # type: ignore[assignment]
    disabled_skills: Set[str] = set(disabled_ctrl.get("skills", set()))  # type: ignore[arg-type]
    disabled_mechs: Set[str] = set(disabled_ctrl.get("mechanisms", set()))  # type: ignore[arg-type]

    # 1. Consumer config (.aief/config.json or legacy project.framework.json)
    cfg_path = root / Path(cfg_rel)
    if cfg_path.exists():
        try:
            cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            missing_cfg = REQUIRED_CONSUMER_CONFIG_KEYS - set(cfg.keys())
            if missing_cfg:
                errors.append(f"{cfg_rel}: Missing required keys: {sorted(missing_cfg)}")
            if isinstance(cfg.get("enabledPlatforms"), list):
                enabled_platforms = [str(p) for p in cfg["enabledPlatforms"]]
        except Exception as exc:
            errors.append(f"{cfg_rel}: Invalid JSON ({exc})")

    # 2. Consumer lockfile (.aief/lock.json or legacy .framework-lock.json)
    lock_path = root / Path(lock_rel)
    if lock_path.exists():
        try:
            lock = json.loads(lock_path.read_text(encoding="utf-8"))
            if not isinstance(lock, dict):
                errors.append(f"{lock_rel}: Root must be a JSON object")
            elif lock.get("schema_version") is None:
                for k in ("framework_version", "platforms", "optional_packs", "managed_files"):
                    if k not in lock:
                        errors.append(f"{lock_rel}: Missing key '{k}'")
                warn_list.append(
                    f"Legacy v0.3.0 {lock_rel} detected without native skill projections; "
                    "run 'python scripts/bootstrap.py --target . --update' to migrate to lockfile schema 2.0.0."
                )
                info_list.extend(inspect_host_global_skill_visibility(home_dir))
            elif lock.get("schema_version") != "2.0.0":
                errors.append(
                    f"{lock_rel}: Unsupported schema_version '{lock.get('schema_version')}'"
                )
            else:
                req_v2 = {
                    "schema_version",
                    "framework_version",
                    "enabled_platforms",
                    "optional_packs",
                    "projection_state",
                    "projected_skills",
                    "managed_files",
                }
                missing_v2 = sorted(req_v2 - set(lock.keys()))
                if missing_v2:
                    errors.append(f"{lock_rel}: Missing v2 required keys: {missing_v2}")
                else:
                    proj_state = lock.get("projection_state", {})
                    if not isinstance(proj_state, dict) or proj_state.get("status") != "completed":
                        errors.append(
                            f"{lock_rel}: projection_state.status is '{proj_state.get('status')}' "
                            "(interrupted bootstrap; re-run bootstrap.py to recover)."
                        )

                    lock_platforms = lock.get("enabled_platforms", [])
                    if not isinstance(lock_platforms, list):
                        errors.append(f"{lock_rel}: 'enabled_platforms' must be a list")
                    elif enabled_platforms and sorted(set(lock_platforms)) != sorted(set(enabled_platforms)):
                        errors.append(
                            f"{lock_rel} enabled_platforms {sorted(lock_platforms)} does not match "
                            f"{cfg_rel} enabledPlatforms {sorted(enabled_platforms)}"
                        )

                    managed = lock.get("managed_files", {})
                    projected_skills = lock.get("projected_skills", {})
                    if not isinstance(managed, dict) or not isinstance(projected_skills, dict):
                        errors.append(f"{lock_rel}: 'managed_files' and 'projected_skills' must be objects")
                    else:
                        installed_skills: Set[str] = set()
                        reg_path = root / Path(reg_rel)
                        if reg_path.exists():
                            try:
                                reg_data = json.loads(reg_path.read_text(encoding="utf-8"))
                                installed_skills = {
                                    str(s.get("name", ""))
                                    for s in reg_data.get("skills", [])
                                    if s.get("name") and s.get("enabled", True)
                                }
                            except Exception:
                                pass

                        expected_projected_skills = (installed_skills - disabled_skills) | (
                            custom_skills_names - disabled_skills
                        )

                        expected_proj_roots = _resolve_expected_consumer_projections(
                            root, [str(p) for p in lock_platforms], core_rel=lp["core_rel"]
                        )
                        for pid, exp_root in expected_proj_roots.items():
                            pdata = projected_skills.get(pid)
                            if not isinstance(pdata, dict):
                                errors.append(f"{lock_rel}: missing projected_skills entry for '{pid}'")
                                continue
                            if pdata.get("projection_root") != exp_root:
                                errors.append(
                                    f"{lock_rel}: projected_skills['{pid}'].projection_root "
                                    f"'{pdata.get('projection_root')}' != expected '{exp_root}'"
                                )
                            listed_skills = pdata.get("skills", [])
                            if not isinstance(listed_skills, list):
                                errors.append(f"{lock_rel}: projected_skills['{pid}'].skills must be a list")
                            elif expected_projected_skills and set(listed_skills) != expected_projected_skills:
                                missing_sk = sorted(expected_projected_skills - set(listed_skills))
                                stale_sk = sorted(set(listed_skills) - expected_projected_skills)
                                if missing_sk:
                                    errors.append(
                                        f"{lock_rel} projected_skills['{pid}'] missing installed skills: {missing_sk}"
                                    )
                                if stale_sk:
                                    errors.append(
                                        f"{lock_rel} projected_skills['{pid}'] contains stale skills: {stale_sk}"
                                    )
                            for sk_name in sorted(expected_projected_skills):
                                skill_md = root / Path(exp_root) / sk_name / "SKILL.md"
                                if not skill_md.exists():
                                    errors.append(
                                        f"Missing native projected skill file for '{pid}': {exp_root}/{sk_name}/SKILL.md"
                                    )

                        extra_proj_plats = set(projected_skills.keys()) - set(expected_proj_roots.keys())
                        if extra_proj_plats:
                            errors.append(
                                f"{lock_rel} contains stale projected_skills platforms: {sorted(extra_proj_plats)}"
                            )

                        # Case-insensitive skill name collision check across installed and custom skills
                        seen_skill_fold: Dict[str, str] = {}
                        for sk_raw in sorted(installed_skills | custom_skills_names):
                            fold_key = sk_raw.casefold()
                            if fold_key in seen_skill_fold and seen_skill_fold[fold_key] != sk_raw:
                                errors.append(
                                    f"{reg_rel}: case-insensitive skill name collision '{seen_skill_fold[fold_key]}' vs '{sk_raw}'"
                                )
                            seen_skill_fold[fold_key] = sk_raw

                        # Check managed_files ownership, hashes, case collisions, unsafe paths, and active platform consistency
                        enabled_set = set(str(p) for p in lock_platforms)
                        seen_managed_fold: Dict[str, str] = {}
                        for rel, meta in sorted(managed.items()):
                            if _is_unsafe_lockfile_path(rel):
                                errors.append(f"{lock_rel}: unsafe path rejected '{rel}'")
                                continue
                            rel_fold = rel.casefold()
                            if rel_fold in seen_managed_fold and seen_managed_fold[rel_fold] != rel:
                                errors.append(
                                    f"{lock_rel}: case-insensitive path collision '{seen_managed_fold[rel_fold]}' vs '{rel}'"
                                )
                            seen_managed_fold[rel_fold] = rel

                            if not isinstance(meta, dict):
                                errors.append(f"{lock_rel}: entry for '{rel}' must be an object")
                                continue
                            ownership = meta.get("ownership")
                            sha_val = meta.get("sha256")
                            plats = meta.get("platforms")
                            if ownership not in VALID_OWNERSHIP_CLASSES:
                                errors.append(f"{lock_rel}: invalid ownership '{ownership}' for '{rel}'")
                            if not isinstance(sha_val, str) or not SHA256_HEX_RE.match(sha_val):
                                errors.append(f"{lock_rel}: invalid sha256 for '{rel}'")
                            if not isinstance(plats, list):
                                errors.append(f"{lock_rel}: invalid platforms list for '{rel}'")
                            elif any(str(p) not in (VALID_PLATFORMS | {"core"}) for p in plats):
                                unknown_p = sorted({str(p) for p in plats} - (VALID_PLATFORMS | {"core"}))
                                errors.append(f"{lock_rel}: unknown platform(s) {unknown_p} for '{rel}'")

                            disk_file = root / Path(rel)
                            if ownership in {"platform_projected_skill", "consumer_custom_skill"}:
                                src_rel = meta.get("source")
                                if not src_rel or _is_unsafe_lockfile_path(src_rel):
                                    errors.append(f"{lock_rel}: projected entry '{rel}' invalid or missing 'source'")
                                skill_ref = str(meta.get("skill", ""))
                                valid_refs = (
                                    expected_projected_skills
                                    if ownership == "platform_projected_skill"
                                    else (custom_skills_names - disabled_skills)
                                )
                                if valid_refs and (not skill_ref or skill_ref not in valid_refs):
                                    errors.append(
                                        f"{lock_rel}: projected entry '{rel}' references unregistered/stale skill '{skill_ref}'"
                                    )
                                if not plats or not set(str(p) for p in plats).issubset(enabled_set):
                                    errors.append(
                                        f"{lock_rel}: projected entry '{rel}' platforms {plats} inconsistent with {sorted(enabled_set)}"
                                    )
                            if ownership in {
                                "framework_managed",
                                "platform_projected_skill",
                                "consumer_custom_skill",
                                "consumer_custom_agent",
                            }:
                                if not disk_file.exists():
                                    errors.append(f"Missing lockfile-tracked file on disk: {rel}")
                                elif isinstance(sha_val, str) and _sha256_file(disk_file) != sha_val.lower():
                                    warn_list.append(
                                        f"Locally customized {ownership} file differs from locked hash (preserved on update): {rel}"
                                    )
                            elif ownership == "consumer_customized_generated" and disk_file.exists():
                                warn_list.append(f"Preserved consumer-customized file outside active plan: {rel}")

                        # Scan projection directories for unexpected untracked files (WARNING) or stale/colliding items (ERROR)
                        active_roots = set(expected_proj_roots.values())
                        for proj_root in (".agents/skills", ".claude/skills"):
                            proj_dir = root / Path(proj_root)
                            if not proj_dir.exists():
                                continue
                            seen_dir_fold: Dict[str, str] = {}
                            for child_dir in sorted(proj_dir.iterdir()):
                                if child_dir.is_dir():
                                    cf = child_dir.name.casefold()
                                    if cf in seen_dir_fold and seen_dir_fold[cf] != child_dir.name:
                                        errors.append(
                                            f"Case-insensitive skill folder collision in '{proj_root}': '{seen_dir_fold[cf]}' vs '{child_dir.name}'"
                                        )
                                    seen_dir_fold[cf] = child_dir.name

                            for disk_item in sorted(proj_dir.rglob("*")):
                                if not disk_item.is_file():
                                    continue
                                rel_item = disk_item.relative_to(root).as_posix()
                                if rel_item not in managed:
                                    warn_list.append(
                                        f"Unexpected untracked file inside projection directory (preserved): {rel_item}"
                                    )
                                elif proj_root not in active_roots:
                                    entry_own = managed[rel_item].get("ownership")
                                    if entry_own != "consumer_customized_generated":
                                        errors.append(
                                            f"Stale projection file on disk for disabled platform root '{proj_root}': {rel_item}"
                                        )

                        info_list.extend(inspect_host_global_skill_visibility(home_dir))
                        if "graphify" not in disabled_mechs and not (root / "graphify-out" / "graph.json").exists():
                            if shutil.which("graphify") is None:
                                info_list.append(
                                    "Graphify CLI not installed on this host (optional AST/concept graph skipped; "
                                    "install via 'pipx install graphifyy' or 'pip install graphifyy')."
                                )
                            else:
                                info_list.append(
                                    "Graphify CLI is available, and graphify-out/graph.json is not yet generated "
                                    "(run `graphify .` or let Phase 1 generate it if repository has >=15 files)."
                                )
        except Exception as exc:
            errors.append(f"{lock_rel}: Invalid JSON ({exc})")

    # 3. Consumer state manifest
    manifest_rel = f"{state_rel}/manifest.json"
    manifest_path = root / Path(manifest_rel)
    if not manifest_path.exists():
        errors.append(f"Missing required consumer state file: {manifest_rel}")
    else:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            missing_man = REQUIRED_MANIFEST_KEYS - set(manifest.keys())
            if missing_man:
                errors.append(f"{manifest_rel}: Missing required keys: {sorted(missing_man)}")
            completed = manifest.get("completed_phases", [])
            if not isinstance(completed, list):
                errors.append(f"{manifest_rel}: 'completed_phases' must be a list")
            else:
                for entry in completed:
                    if isinstance(entry, dict) and entry.get("handoff_file"):
                        hf_rel = str(entry["handoff_file"])
                        if not (root / Path(hf_rel)).exists():
                            errors.append(
                                f"{manifest_rel} references missing handoff file: {hf_rel}"
                            )
        except Exception as exc:
            errors.append(f"{manifest_rel}: Invalid JSON ({exc})")

    # 4. Consumer handoffs/*.json
    handoffs_dir = root / Path(state_rel) / "handoffs"
    if handoffs_dir.is_dir():
        for hf_path in sorted(handoffs_dir.glob("*.json")):
            rel = hf_path.relative_to(root).as_posix()
            try:
                hf = json.loads(hf_path.read_text(encoding="utf-8"))
                missing_hf = REQUIRED_HANDOFF_KEYS - set(hf.keys())
                if missing_hf:
                    errors.append(f"{rel}: Missing required handoff keys: {sorted(missing_hf)}")
            except Exception as exc:
                errors.append(f"{rel}: Invalid JSON ({exc})")

    return errors


def _strip_jsonc(raw_text: str) -> str:
    """Strip // line comments, /* block comments */, and trailing commas outside strings."""
    out: List[str] = []
    i = 0
    n = len(raw_text)
    in_string = False
    escape = False
    while i < n:
        ch = raw_text[i]
        if in_string:
            out.append(ch)
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < n and raw_text[i + 1] == "/":
            i += 2
            while i < n and raw_text[i] != "\n":
                i += 1
            continue
        if ch == "/" and i + 1 < n and raw_text[i + 1] == "*":
            i += 2
            while i + 1 < n and not (raw_text[i] == "*" and raw_text[i + 1] == "/"):
                i += 1
            i += 2
            continue
        out.append(ch)
        i += 1
    no_comments = "".join(out)
    return re.sub(r",(\s*[}\]])", r"\1", no_comments)


def _is_jsonc_config(rel_path: str) -> bool:
    norm = rel_path.replace("\\", "/")
    parts = [p for p in norm.split("/") if p]
    name = parts[-1] if parts else ""
    return (
        ".vscode" in parts[:-1]
        or ".devcontainer" in parts[:-1]
        or name == "jsconfig.json"
        or (name.startswith("tsconfig") and name.endswith(".json"))
    )


def check_json_files(root: Path) -> List[str]:
    errors: List[str] = []
    skip_dirs = {".git", "node_modules", "graphify-out", "dist", ".angular", "bin", "obj", "__pycache__"}
    for json_path in sorted(root.rglob("*.json")):
        if any(part in skip_dirs for part in json_path.parts):
            continue
        rel = json_path.relative_to(root).as_posix()
        try:
            raw = json_path.read_text(encoding="utf-8")
            text = _strip_jsonc(raw) if _is_jsonc_config(rel) else raw
            json.loads(text)
        except Exception as exc:
            errors.append(f"Invalid JSON in {rel}: {exc}")
    return errors


def check_agents_frontmatter(root: Path, mode: str = "framework") -> List[str]:
    errors: List[str] = []
    lp = resolve_consumer_layout_paths(root) if mode == "consumer" else None
    agents_rel = lp["agents_rel"] if lp else "agents"
    skills_rel = lp["skills_rel"] if lp else "skills"
    agents_dir = root / Path(agents_rel)
    if not agents_dir.exists():
        return [f"Missing {agents_rel}/ directory"]
    agent_files = sorted(agents_dir.glob("*.md"))
    disabled_agents: Set[str] = set()
    custom_skills_names: Set[str] = set()
    canonical_agent_names = {
        "product-analyst",
        "software-architect",
        "ui-ux-designer",
        "data-engineer",
        "planner-orchestrator",
        "backend-engineer",
        "frontend-engineer",
        "ai-engineer",
        "implementation-engineer",
        "code-reviewer",
        "qa-engineer",
        "security-engineer",
        "devops-release-engineer",
    }
    if mode == "consumer":
        controls, custom_skills_names, _ = _load_consumer_overlay_controls(root)
        disabled_agents = set(controls["disabled"]["agents"])  # type: ignore[index, arg-type]
    if not agent_files:
        if mode == "consumer" and disabled_agents:
            return []
        return [f"No agent role definitions found in {agents_rel}/"]

    known_agent_names = {p.stem for p in agent_files}
    if mode == "consumer":
        known_agent_names |= (canonical_agent_names & disabled_agents)
    registered_skills: Set[str] = set()
    reg_path = root / Path(skills_rel) / "registry.json"
    if reg_path.exists():
        try:
            reg_data = json.loads(reg_path.read_text(encoding="utf-8"))
            registered_skills = {str(s.get("name", "")) for s in reg_data.get("skills", [])}
        except Exception:
            pass
    valid_skills = registered_skills | custom_skills_names

    for path in agent_files:
        rel = path.relative_to(root).as_posix()
        meta = parse_simple_frontmatter(path.read_text(encoding="utf-8"))
        if not meta:
            errors.append(f"{rel}: Missing YAML frontmatter")
            continue
        missing = REQUIRED_AGENT_KEYS - set(meta.keys())
        if missing:
            errors.append(f"{rel}: Missing frontmatter keys: {sorted(missing)}")
        expected_name = path.stem
        if meta.get("name") != expected_name:
            errors.append(f"{rel}: frontmatter name '{meta.get('name')}' does not match filename '{expected_name}'")
        phases = meta.get("phases")
        if not isinstance(phases, list) or not phases or not all(isinstance(p, int) and 1 <= p <= 15 for p in phases):
            errors.append(f"{rel}: 'phases' must be a non-empty list of integers between 1 and 15")

        req_skills = meta.get("required_skills", [])
        if isinstance(req_skills, list) and valid_skills:
            for sk in req_skills:
                if str(sk) not in valid_skills:
                    errors.append(f"{rel}: required_skills references uninstalled/unregistered skill '{sk}'")

        targets = meta.get("delegation_targets", [])
        if isinstance(targets, list):
            for tgt in targets:
                if str(tgt) not in known_agent_names:
                    errors.append(f"{rel}: delegation_targets references unknown agent '{tgt}'")

    return errors


def check_skills_and_registry(root: Path, mode: str = "auto") -> List[str]:
    errors: List[str] = []
    effective_mode = detect_validation_mode(root) if mode == "auto" else mode
    lp = resolve_consumer_layout_paths(root) if effective_mode == "consumer" else None
    skills_rel = lp["skills_rel"] if lp else "skills"
    reg_rel = f"{skills_rel}/registry.json"
    skills_dir = root / Path(skills_rel)
    registry_path = skills_dir / "registry.json"
    if not registry_path.exists():
        return [f"Missing {reg_rel}"]

    try:
        registry = json.loads(registry_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [f"{reg_rel} parse error: {exc}"]

    skills_list = registry.get("skills", [])
    declared_total = registry.get("total_skills")
    if isinstance(declared_total, int) and declared_total != len(skills_list):
        errors.append(
            f"{reg_rel} total_skills ({declared_total}) does not match skills count ({len(skills_list)})"
        )

    registered_by_name: Dict[str, Dict[str, object]] = {}
    for entry in skills_list:
        name = str(entry.get("name", ""))
        skill_rel = str(entry.get("path", ""))
        registered_by_name[name] = entry
        is_enabled = entry.get("enabled", True) is not False
        skill_path = root / Path(skill_rel)
        if not (effective_mode == "consumer" and not is_enabled):
            if not skill_path.exists():
                errors.append(f"{reg_rel} references non-existent path: {skill_rel}")
        upstream_rel = entry.get("upstream_preserved_path")
        if upstream_rel and not (root / Path(str(upstream_rel))).exists():
            errors.append(f"{reg_rel} references missing upstream snapshot: {upstream_rel}")

    if effective_mode == "consumer":
        discovered_skills = []
        for bucket in ("core", "optional"):
            bucket_dir = skills_dir / bucket
            if bucket_dir.exists():
                discovered_skills.extend(sorted(bucket_dir.rglob("SKILL.md")))
        if not discovered_skills and lp and lp["mode"] == "isolated":
            for entry in skills_list:
                if entry.get("enabled", True) is False:
                    continue
                cand = root / Path(str(entry.get("path", "")))
                if cand.is_file():
                    discovered_skills.append(cand)
    else:
        discovered_skills = sorted(skills_dir.rglob("SKILL.md")) if skills_dir.exists() else []
    if not discovered_skills and not (effective_mode == "consumer" and skills_list):
        errors.append(f"No SKILL.md files found under {skills_rel}/")

    for skill_file in discovered_skills:
        rel = skill_file.relative_to(root).as_posix()
        folder_name = skill_file.parent.name
        meta = parse_simple_frontmatter(skill_file.read_text(encoding="utf-8"))
        if not meta:
            errors.append(f"{rel}: Missing YAML frontmatter")
            continue
        missing = REQUIRED_SKILL_KEYS - set(meta.keys())
        if missing:
            errors.append(f"{rel}: Missing frontmatter keys: {sorted(missing)}")
        if meta.get("name") != folder_name:
            errors.append(f"{rel}: frontmatter name '{meta.get('name')}' does not match folder '{folder_name}'")
        if meta.get("tier") not in VALID_SKILL_TIERS:
            errors.append(f"{rel}: invalid tier '{meta.get('tier')}'")
        if meta.get("category") not in VALID_SKILL_CATEGORIES:
            errors.append(f"{rel}: invalid category '{meta.get('category')}'")
        if meta.get("license") not in VALID_LICENSES:
            errors.append(f"{rel}: invalid license '{meta.get('license')}'")
        platforms = meta.get("platforms")
        if not isinstance(platforms, list) or not platforms or not set(platforms).issubset(VALID_PLATFORMS):
            errors.append(f"{rel}: invalid platforms list '{platforms}'")
        if meta.get("security_scope") not in VALID_SECURITY_SCOPES:
            errors.append(f"{rel}: invalid security_scope '{meta.get('security_scope')}'")
        if folder_name not in registered_by_name:
            errors.append(f"{rel}: skill '{folder_name}' is not listed in {reg_rel}")

    # Verify AGENTS.md skill routing table consistency (if AGENTS.md exists and has standard table)
    agents_md_path = root / "AGENTS.md"
    if agents_md_path.exists():
        agents_md_text = agents_md_path.read_text(encoding="utf-8")
        if "## 4. Registered Skills" in agents_md_text:
            table_skills = {m.group(1) for m in AGENTS_MD_SKILL_ROW_RE.finditer(agents_md_text)}
            uninstalled_in_table = table_skills - set(registered_by_name.keys())
            if uninstalled_in_table:
                errors.append(
                    f"AGENTS.md references skills not in skills/registry.json: {sorted(uninstalled_in_table)}"
                )

    # Verify .agents/skills.json entries exist on disk and cover every registered skill
    agy_skills_path = root / ".agents" / "skills.json"
    if agy_skills_path.exists():
        try:
            agy_data = json.loads(agy_skills_path.read_text(encoding="utf-8"))
            entry_dirs: List[str] = []
            for item in agy_data.get("entries", []):
                entry_rel = str(item.get("path", "")).replace("\\", "/").rstrip("/")
                if entry_rel:
                    entry_dirs.append(entry_rel)
                    if not (root / Path(entry_rel)).exists():
                        errors.append(f".agents/skills.json references missing directory: {entry_rel}")

            if entry_dirs:
                for skill_name, skill_entry in registered_by_name.items():
                    if not skill_entry.get("enabled", True):
                        continue
                    skill_rel = str(skill_entry.get("path", "")).replace("\\", "/")
                    if not any(skill_rel.startswith(f"{edir}/") for edir in entry_dirs):
                        errors.append(
                            f".agents/skills.json omits registered skill '{skill_name}' directory ({skill_rel})"
                        )
        except Exception as exc:
            errors.append(f".agents/skills.json parse error: {exc}")

    return errors


def check_platform_capabilities(root: Path) -> List[str]:
    """Validate core/platform-capabilities.json schema, states, and platform coverage."""
    cap_path = root / "core" / "platform-capabilities.json"
    if not cap_path.exists():
        return ["Missing required capability model: core/platform-capabilities.json"]

    if str(SCRIPT_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPT_DIR))
    import platform_capabilities  # noqa: E402

    try:
        model = platform_capabilities.load_platform_capabilities(cap_path)
    except platform_capabilities.CapabilityModelError as exc:
        return [str(exc)]

    defined_ids = set(model.get("platform_ids", []))
    missing_platforms = sorted(VALID_PLATFORMS - defined_ids)
    extra_platforms = sorted(defined_ids - VALID_PLATFORMS)
    errors: List[str] = []
    if missing_platforms:
        errors.append(f"core/platform-capabilities.json missing required platforms: {missing_platforms}")
    if extra_platforms:
        errors.append(f"core/platform-capabilities.json defines unknown platforms: {extra_platforms}")
    return errors


def check_consumer_adapter_references(root: Path, warnings: List[str] | None = None) -> List[str]:
    """Verify consumer adapters do not retain upstream-only paths or commands (GAP-01)."""
    errors: List[str] = []
    warn_list = warnings if warnings is not None else []
    lp = resolve_consumer_layout_paths(root)
    lock_is_v2 = False
    lock_path = root / Path(lp["lock_rel"])
    if lock_path.exists():
        try:
            lock_data = json.loads(lock_path.read_text(encoding="utf-8"))
            lock_is_v2 = isinstance(lock_data, dict) and lock_data.get("schema_version") == "2.0.0"
        except Exception:
            lock_is_v2 = False

    adapter_targets: List[Path] = [
        root / "CLAUDE.md",
        root / "GEMINI.md",
        root / ".agents" / "rules" / "framework-core.md",
        root / ".github" / "copilot-instructions.md",
        root / ".claude" / "settings.json",
    ]
    for folder, glob_pat in (
        (".github/instructions", "*.md"),
        (".github/prompts", "*.md"),
        (".claude/commands", "*.md"),
        (".gemini/commands", "*.toml"),
    ):
        d = root / Path(folder)
        if d.exists():
            adapter_targets.extend(sorted(d.glob(glob_pat)))

    for target in adapter_targets:
        if not target.exists():
            continue
        rel = target.relative_to(root).as_posix()
        text = target.read_text(encoding="utf-8")
        for banned in BANNED_CONSUMER_UPSTREAM_TOKENS:
            if banned in text:
                msg = f"Consumer adapter '{rel}' contains upstream-only reference '{banned}'"
                if lock_is_v2:
                    errors.append(msg)
                else:
                    warn_list.append(f"Legacy consumer adapter warning: {msg}")
    return errors


CANONICAL_TOOL_IDS = {"read_file", "write_file", "edit_file", "run_command"}
CLAUDE_READONLY_TOOLS = {"Read", "Glob", "Grep"}
CLAUDE_WRITE_TOOLS = {"Write", "Edit", "Bash"}
COPILOT_READONLY_TOOLS = {"read", "search"}
COPILOT_WRITE_TOOLS = {"edit", "terminal"}
CLAUDE_SETTINGS_ALLOWED_KEYS = {
    "$schema",
    "permissions",
    "hooks",
    "env",
    "model",
    "modelSettings",
    "editorMode",
    "theme",
    "statusLine",
}
ANTIGRAVITY_VALID_HOOK_EVENTS = {
    "SessionStart",
    "PreToolUse",
    "PostToolUse",
    "PreInvocation",
    "PostInvocation",
    "Stop",
}


def _parse_tools_field(raw_tools: object) -> List[str]:
    if isinstance(raw_tools, list):
        return [str(t).strip() for t in raw_tools if str(t).strip()]
    if isinstance(raw_tools, str):
        return [t.strip() for t in raw_tools.split(",") if t.strip()]
    return []


def check_m9_agent_and_settings_contracts(
    root: Path,
    mode: str = "framework",
    warnings: List[str] | None = None,
) -> List[str]:
    """Validate Claude/Copilot agent tool schemas, Antigravity hooks.json, and settings schemas."""
    errors: List[str] = []
    warn_list = warnings if warnings is not None else []
    strict = True
    lp = resolve_consumer_layout_paths(root) if mode == "consumer" else None
    if mode == "consumer" and lp:
        lock_path = root / Path(lp["lock_rel"])
        if lock_path.exists():
            try:
                lock_data = json.loads(lock_path.read_text(encoding="utf-8"))
                strict = isinstance(lock_data, dict) and lock_data.get("schema_version") == "2.0.0"
            except Exception:
                strict = False

    def _emit(msg: str) -> None:
        if strict:
            errors.append(msg)
        else:
            warn_list.append(f"Legacy consumer contract warning: {msg}")

    # 1. Claude Code agent definitions
    claude_agents_dir = (
        root / "adapters" / "claude-code" / "agents" if mode == "framework" else root / ".claude" / "agents"
    )
    if claude_agents_dir.exists():
        for agent_md in sorted(claude_agents_dir.glob("*.md")):
            rel = agent_md.relative_to(root).as_posix()
            meta = parse_simple_frontmatter(agent_md.read_text(encoding="utf-8"))
            if not meta.get("name") or not meta.get("description"):
                _emit(f"{rel}: Claude agent frontmatter missing required 'name' or 'description'")
            for bad_key in ("subagent", "mainAgent"):
                if bad_key in meta:
                    _emit(f"{rel}: unsupported Claude agent frontmatter key '{bad_key}'")
            tools_list = _parse_tools_field(meta.get("tools"))
            for tool_id in tools_list:
                if tool_id in CANONICAL_TOOL_IDS:
                    _emit(f"{rel}: unmapped canonical tool '{tool_id}' in Claude agent")
            if "reviewer" in agent_md.stem:
                if any(t in CLAUDE_WRITE_TOOLS for t in tools_list) or not set(tools_list).issubset(
                    CLAUDE_READONLY_TOOLS
                ):
                    _emit(f"{rel}: reviewer agent must restrict tools to read-only {sorted(CLAUDE_READONLY_TOOLS)}")

    # 2. Copilot custom agent definitions
    copilot_agents_dir = (
        root / "adapters" / "copilot" if mode == "framework" else root / ".github" / "agents"
    )
    if copilot_agents_dir.exists():
        for agent_md in sorted(copilot_agents_dir.glob("*.agent.md")):
            rel = agent_md.relative_to(root).as_posix()
            meta = parse_simple_frontmatter(agent_md.read_text(encoding="utf-8"))
            if not meta.get("description"):
                _emit(f"{rel}: Copilot agent frontmatter missing 'description'")
            tools_list = _parse_tools_field(meta.get("tools"))
            for tool_id in tools_list:
                if tool_id in CANONICAL_TOOL_IDS:
                    _emit(f"{rel}: unmapped canonical tool '{tool_id}' in Copilot agent")
            if "reviewer" in agent_md.stem:
                if any(t in COPILOT_WRITE_TOOLS for t in tools_list) or not set(tools_list).issubset(
                    COPILOT_READONLY_TOOLS
                ):
                    _emit(f"{rel}: reviewer agent must restrict tools to read-only {sorted(COPILOT_READONLY_TOOLS)}")

    # 3. Antigravity hooks contract
    hooks_rel = lp["hooks_rel"] if (mode == "consumer" and lp) else "adapters/antigravity/hooks.json"
    hooks_path = root / Path(hooks_rel)
    if hooks_path.exists():
        try:
            hooks_data = json.loads(hooks_path.read_text(encoding="utf-8"))
            if not isinstance(hooks_data, dict) or not hooks_data:
                _emit(f"{hooks_rel}: root must be a non-empty object of named hooks")
            else:
                if "description" in hooks_data or "hooks" in hooks_data:
                    _emit(
                        f"{hooks_rel}: top-level 'description'/'hooks' keys do not match Antigravity hooks contract"
                    )
                for hook_name, hook_cfg in hooks_data.items():
                    if not isinstance(hook_cfg, dict):
                        _emit(f"{hooks_rel}: hook '{hook_name}' must be an object")
                        continue
                    if "enabled" in hook_cfg and not isinstance(hook_cfg["enabled"], bool):
                        _emit(f"{hooks_rel}: '{hook_name}.enabled' must be a boolean")
                    for ev_key, ev_val in hook_cfg.items():
                        if ev_key == "enabled":
                            continue
                        if ev_key not in ANTIGRAVITY_VALID_HOOK_EVENTS:
                            _emit(f"{hooks_rel}: unsupported hook event '{ev_key}' in '{hook_name}'")
                            continue
                        if not isinstance(ev_val, list):
                            _emit(f"{hooks_rel}: '{hook_name}.{ev_key}' must be a list")
                            continue
                        if ev_key in {"PreToolUse", "PostToolUse"}:
                            for grp in ev_val:
                                if not isinstance(grp, dict) or not isinstance(grp.get("hooks"), list):
                                    _emit(
                                        f"{hooks_rel}: grouped event '{hook_name}.{ev_key}' requires object with 'hooks' list"
                                    )
                        else:
                            for h in ev_val:
                                if not isinstance(h, dict) or h.get("type") != "command" or not isinstance(h.get("command"), str):
                                    _emit(
                                        f"{hooks_rel}: handler in '{hook_name}.{ev_key}' requires type='command' and command string"
                                    )
        except Exception as exc:
            _emit(f"{hooks_rel}: invalid JSON ({exc})")

    # 4. Claude & Gemini settings schemas
    claude_settings_path = (
        root / "adapters" / "claude-code" / "settings.json" if mode == "framework" else root / ".claude" / "settings.json"
    )
    if claude_settings_path.exists():
        rel_cs = claude_settings_path.relative_to(root).as_posix()
        try:
            cs_data = json.loads(claude_settings_path.read_text(encoding="utf-8"))
            if not isinstance(cs_data, dict):
                _emit(f"{rel_cs}: root must be a JSON object")
            else:
                if "description" in cs_data:
                    _emit(f"{rel_cs}: unsupported top-level 'description' metadata key")
                extra_cs = set(cs_data.keys()) - CLAUDE_SETTINGS_ALLOWED_KEYS
                if extra_cs:
                    _emit(f"{rel_cs}: unsupported top-level Claude settings key(s): {sorted(extra_cs)}")
                perms = cs_data.get("permissions")
                if perms is not None and (
                    not isinstance(perms, dict)
                    or any(not isinstance(perms[k], list) for k in perms if k in {"allow", "deny", "ask"})
                ):
                    _emit(f"{rel_cs}: malformed 'permissions' object")
        except Exception as exc:
            _emit(f"{rel_cs}: invalid JSON ({exc})")

    gemini_settings_path = (
        root / "adapters" / "gemini-cli" / "settings.json" if mode == "framework" else root / ".gemini" / "settings.json"
    )
    if gemini_settings_path.exists():
        rel_gs = gemini_settings_path.relative_to(root).as_posix()
        try:
            gs_data = json.loads(gemini_settings_path.read_text(encoding="utf-8"))
            if not isinstance(gs_data, dict):
                _emit(f"{rel_gs}: root must be a JSON object")
            else:
                if "description" in gs_data:
                    _emit(f"{rel_gs}: unsupported top-level 'description' metadata key")
                ctx_names = gs_data.get("contextFileName")
                if ctx_names is not None and not (
                    isinstance(ctx_names, str)
                    or (isinstance(ctx_names, list) and all(isinstance(x, str) for x in ctx_names))
                ):
                    _emit(f"{rel_gs}: 'contextFileName' must be a string or list of strings")
        except Exception as exc:
            _emit(f"{rel_gs}: invalid JSON ({exc})")

    # 5. Codex TOML & Gemini command TOML syntax verification
    try:
        import tomllib
    except ModuleNotFoundError:
        tomllib = None  # type: ignore[assignment]

    if tomllib is not None:
        codex_toml = (
            root / "adapters" / "codex" / "config.toml" if mode == "framework" else root / ".codex" / "config.toml"
        )
        if codex_toml.exists():
            rel_ct = codex_toml.relative_to(root).as_posix()
            try:
                tomllib.loads(codex_toml.read_text(encoding="utf-8"))
            except Exception as exc:
                _emit(f"{rel_ct}: invalid TOML ({exc})")

        gemini_cmd_dir = (
            root / "adapters" / "gemini-cli" / "commands"
            if mode == "framework"
            else root / ".gemini" / "commands"
        )
        if gemini_cmd_dir.exists():
            for toml_path in sorted(gemini_cmd_dir.glob("*.toml")):
                rel_gc = toml_path.relative_to(root).as_posix()
                try:
                    parsed_toml = tomllib.loads(toml_path.read_text(encoding="utf-8"))
                    if not isinstance(parsed_toml.get("prompt"), str) or not parsed_toml["prompt"].strip():
                        _emit(f"{rel_gc}: Gemini command TOML missing non-empty 'prompt'")
                except Exception as exc:
                    _emit(f"{rel_gc}: invalid TOML ({exc})")

    return errors


def check_adapter_sync(
    root: Path,
    mode: str = "framework",
    warnings: List[str] | None = None,
) -> List[str]:
    if mode == "framework":
        if str(SCRIPT_DIR) not in sys.path:
            sys.path.insert(0, str(SCRIPT_DIR))
        import sync_adapters  # noqa: E402

        ok, drifted = sync_adapters.sync_adapters(root, check_only=True)
        errs = [f"Platform adapter out of sync with canonical source: {p}" for p in drifted] if not ok else []
        errs.extend(check_m9_agent_and_settings_contracts(root, mode="framework", warnings=warnings))
        return errs

    # Consumer mode: check enabled platforms in consumer config
    errors: List[str] = []
    lp = resolve_consumer_layout_paths(root)
    cfg_path = root / Path(lp["config_rel"])
    enabled_platforms = ["antigravity"]
    if cfg_path.exists():
        try:
            cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            if isinstance(cfg.get("enabledPlatforms"), list):
                enabled_platforms = [str(p) for p in cfg["enabledPlatforms"]]
        except Exception:
            pass

    controls, _, _ = _load_consumer_overlay_controls(root)
    disabled_ctrl: Dict[str, object] = controls["disabled"]  # type: ignore[assignment]
    disabled_agents = set(disabled_ctrl.get("agents", set()))  # type: ignore[arg-type]
    disabled_mechs = set(disabled_ctrl.get("mechanisms", set()))  # type: ignore[arg-type]
    disabled_phases = set(disabled_ctrl.get("phases", set()))  # type: ignore[arg-type]
    reviewer_disabled = (
        ("code-reviewer" in disabled_agents)
        or ("code-review" in disabled_mechs)
        or (10 in disabled_phases)
    )

    for plat in enabled_platforms:
        for req_rel in CONSUMER_PLATFORM_FILES.get(plat, []):
            effective_req = lp["hooks_rel"] if req_rel == "adapters/antigravity/hooks.json" else req_rel
            if reviewer_disabled and effective_req in {
                ".github/agents/code-reviewer.agent.md",
                ".claude/agents/framework-code-reviewer.md",
            }:
                continue
            if not (root / Path(effective_req)).exists():
                errors.append(f"Missing consumer adapter file for platform '{plat}': {effective_req}")

    errors.extend(check_consumer_adapter_references(root, warnings=warnings))
    errors.extend(check_m9_agent_and_settings_contracts(root, mode="consumer", warnings=warnings))
    return errors


def check_markdown_links(root: Path, mode: str = "auto") -> List[str]:
    errors: List[str] = []
    root_resolved = root.resolve()
    effective_mode = detect_validation_mode(root) if mode == "auto" else mode

    md_files: List[Path] = [
        root / "AGENTS.md",
        root / "CLAUDE.md",
        root / "GEMINI.md",
    ]
    if effective_mode == "framework":
        md_files.extend([root / "README.md", root / "PROJECT_CHARTER.md"])
        scan_subdirs = ("docs", "workflows", ".agents", ".github", ".claude", "adapters")
    else:
        lp = resolve_consumer_layout_paths(root)
        if lp["mode"] == "isolated":
            scan_subdirs = (
                lp["workflows_rel"],
                ".agents",
                ".github",
                ".claude",
                ".aief/adapters",
                lp["core_rel"],
                lp["agents_rel"],
                f"{lp['skills_rel']}/core",
                f"{lp['skills_rel']}/optional",
            )
        else:
            scan_subdirs = ("docs", "workflows", ".agents", ".github", ".claude", "adapters")
    for sub in scan_subdirs:
        sub_dir = root / Path(sub)
        if sub_dir.exists():
            md_files.extend(sorted(sub_dir.rglob("*.md")))

    seen: Set[Path] = set()
    for md_path in md_files:
        if not md_path.exists() or md_path in seen:
            continue
        seen.add(md_path)
        rel_source = md_path.relative_to(root).as_posix()
        text_no_code = FENCED_CODE_RE.sub("", md_path.read_text(encoding="utf-8"))
        for match in MD_LINK_RE.finditer(text_no_code):
            target_raw = match.group(1).strip()
            if (
                not target_raw
                or target_raw.startswith("http://")
                or target_raw.startswith("https://")
                or target_raw.startswith("mailto:")
                or target_raw.startswith("#")
                or target_raw.startswith("file://")
                or target_raw.startswith("customization://")
                or target_raw.startswith("conversation://")
            ):
                continue
            target_clean = target_raw.split("#", 1)[0].strip()
            if not target_clean:
                continue
            resolved = (md_path.parent / target_clean).resolve()
            if not resolved.is_relative_to(root_resolved):
                errors.append(
                    f"{rel_source}: Relative link escapes repository root -> '{target_raw}'"
                )
            elif not resolved.exists():
                errors.append(f"{rel_source}: Broken relative link -> '{target_raw}'")
    return errors


def check_secrets(root: Path) -> List[str]:
    errors: List[str] = []
    exempt_rel_paths = {
        "security/pre-commit-secrets.md",
        "scripts/validate.py",
        ".aief/security/pre-commit-secrets.md",
        ".aief/scripts/validate.py",
        "tests/test_framework.py",
    }
    skip_dirs = {".git", "node_modules", "graphify-out", "dist", ".angular", "bin", "obj", "__pycache__"}
    for file_path in sorted(root.rglob("*")):
        if not file_path.is_file():
            continue
        if any(part in skip_dirs for part in file_path.parts):
            continue
        rel = file_path.relative_to(root).as_posix()
        if rel in exempt_rel_paths:
            continue
        try:
            content = file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for rule_id, regex in SECRET_PATTERNS:
            if regex.search(content):
                errors.append(f"{rel}: Potential leaked secret detected matching rule '{rule_id}'")
    return errors


def run_validation_full(
    root: Path,
    mode: str = "auto",
    home_dir: Path | None = None,
) -> Tuple[bool, Dict[str, List[str]], List[str], List[str]]:
    effective_mode = detect_validation_mode(root) if mode == "auto" else mode
    if effective_mode not in {"framework", "consumer"}:
        raise ValueError(f"Unsupported validation mode '{mode}'. Choose from: auto, framework, consumer")

    warnings: List[str] = []
    info: List[str] = []
    report: Dict[str, List[str]] = {
        "required_files": check_required_files(root, mode=effective_mode),
        "json_syntax": check_json_files(root),
        "agents_frontmatter": check_agents_frontmatter(root, mode=effective_mode),
        "skills_and_registry": check_skills_and_registry(root, mode=effective_mode),
        "adapter_sync": check_adapter_sync(root, mode=effective_mode, warnings=warnings),
        "markdown_links": check_markdown_links(root, mode=effective_mode),
        "secret_scan": check_secrets(root),
    }
    if effective_mode == "framework":
        report["platform_capabilities"] = check_platform_capabilities(root)
    if effective_mode == "consumer":
        report["consumer_state"] = check_consumer_state(
            root, warnings=warnings, info=info, home_dir=home_dir
        )

    all_passed = all(len(errs) == 0 for errs in report.values())
    return all_passed, report, warnings, info


def run_validation_with_warnings(
    root: Path,
    mode: str = "auto",
) -> Tuple[bool, Dict[str, List[str]], List[str]]:
    passed, report, warnings, _ = run_validation_full(root, mode=mode)
    return passed, report, warnings


def run_validation(root: Path, mode: str = "auto") -> Tuple[bool, Dict[str, List[str]]]:
    passed, report, _, _ = run_validation_full(root, mode=mode)
    return passed, report


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate AI Engineering Framework integrity.")
    parser.add_argument("--root", type=Path, default=REPO_ROOT, help="Repository root path")
    parser.add_argument(
        "--mode",
        type=str,
        choices=["auto", "framework", "consumer"],
        default="auto",
        help="Validation mode: framework (upstream repo), consumer (bootstrapped project), or auto",
    )
    parser.add_argument("--json", action="store_true", help="Emit validation report as JSON")
    args = parser.parse_args(argv)

    root = args.root.resolve()
    effective_mode = detect_validation_mode(root) if args.mode == "auto" else args.mode
    passed, report, warnings, info = run_validation_full(root, mode=effective_mode)
    total_errors = sum(len(v) for v in report.values())

    if args.json:
        print(
            json.dumps(
                {
                    "mode": effective_mode,
                    "status": "PASS" if passed else "FAIL",
                    "total_errors": total_errors,
                    "total_warnings": len(warnings),
                    "total_info": len(info),
                    "checks": report,
                    "warnings": warnings,
                    "info": info,
                },
                indent=2,
            )
        )
        return 0 if passed else 1

    print(f"=== AI Engineering Framework Validation [{effective_mode.upper()}] ({root}) ===")
    for check_name, errs in report.items():
        status_str = "PASS" if not errs else f"FAIL ({len(errs)} error(s))"
        print(f"  [{status_str}] {check_name}")
        for err in errs:
            print(f"      - {err}")

    if warnings:
        print(f"\n  [WARNINGS ({len(warnings)})]")
        for warn in warnings:
            print(f"      - {warn}")

    if info:
        print(f"\n  [INFO ({len(info)})]")
        for item in info:
            print(f"      - {item}")

    print(
        f"\nOVERALL STATUS: {'PASS' if passed else 'FAIL'} "
        f"({total_errors} total error(s), {len(warnings)} warning(s), {len(info)} info)"
    )
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
