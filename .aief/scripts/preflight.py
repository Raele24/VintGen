#!/usr/bin/env python3
"""Environment preflight and stack SDK detector for AI Engineering Framework consumer projects.

Features:
- Detects .NET SDKs across system PATH, DOTNET_ROOT, and Windows user-space ($HOME/.dotnet).
- Detects Node.js / npm / Angular CLI availability.
- Detects Python 3.11+ runtime availability.
- Never installs SDKs or mutates system state automatically; emits clear remediation guidance.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
from typing import Dict, List, Set

SCRIPT_DIR = Path(__file__).resolve().parent


def _default_repo_root() -> Path:
    parent = SCRIPT_DIR.parent
    if parent.name == ".aief":
        return parent.parent
    return Path.cwd()


STACK_ALIASES: Dict[str, str] = {
    "dotnet": "dotnet",
    ".net": "dotnet",
    "node": "node-angular",
    "angular": "node-angular",
    "node-angular": "node-angular",
    "node/angular": "node-angular",
    "python": "python",
    "py": "python",
}

SUPPORTED_STACKS: Set[str] = {"dotnet", "node-angular", "python"}


def normalize_stacks(raw_stacks: List[str]) -> List[str]:
    """Normalize stack identifiers while preserving order and uniqueness."""
    normalized: List[str] = []
    invalid: List[str] = []
    for item in raw_stacks:
        token = item.strip().lower()
        if not token:
            continue
        mapped = STACK_ALIASES.get(token)
        if not mapped:
            invalid.append(item)
        elif mapped not in normalized:
            normalized.append(mapped)
    if invalid:
        raise ValueError(
            f"Unsupported stack(s): {invalid}. Supported stacks: dotnet, node/angular (node-angular), python"
        )
    return normalized


def _list_dotnet_sdks(dotnet_bin: Path, run_env: Dict[str, str]) -> List[str]:
    try:
        proc = subprocess.run(
            [str(dotnet_bin), "--list-sdks"],
            env=run_env,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=5,
            check=False,
        )
        if proc.returncode != 0:
            return []
        return [line.strip() for line in proc.stdout.splitlines() if line.strip()]
    except Exception:
        return []


def detect_dotnet_sdk(
    env: Dict[str, str] | None = None,
    home_dir: Path | None = None,
) -> Dict[str, object]:
    """Detect .NET SDK availability across PATH, DOTNET_ROOT, and user-space ($HOME/.dotnet)."""
    effective_env = dict(os.environ) if env is None else dict(env)
    effective_home = home_dir if home_dir is not None else Path.home()
    is_windows = platform.system().lower().startswith("win")
    exe_name = "dotnet.exe" if is_windows else "dotnet"

    # 1. Check dotnet on PATH
    path_str = effective_env.get("PATH", "")
    which_dotnet = shutil.which("dotnet", path=path_str) if path_str else None
    if which_dotnet:
        bin_path = Path(which_dotnet)
        sdks = _list_dotnet_sdks(bin_path, effective_env)
        if sdks:
            return {
                "stack": "dotnet",
                "status": "AVAILABLE",
                "executable": str(bin_path),
                "dotnet_root": str(bin_path.parent),
                "sdks": sdks,
                "guidance": f".NET SDK detected on PATH ({sdks[0]}).",
            }

    # 2. Check explicit DOTNET_ROOT or user-space $HOME/.dotnet
    candidate_roots: List[Path] = []
    env_root = effective_env.get("DOTNET_ROOT")
    if env_root:
        candidate_roots.append(Path(env_root))
    candidate_roots.append(effective_home / ".dotnet")

    for root_dir in candidate_roots:
        candidate_bin = root_dir / exe_name
        if candidate_bin.exists() and candidate_bin.is_file():
            probe_env = dict(effective_env)
            probe_env["DOTNET_ROOT"] = str(root_dir)
            probe_env["PATH"] = f"{root_dir}{os.pathsep}{probe_env.get('PATH', '')}"
            sdks = _list_dotnet_sdks(candidate_bin, probe_env)
            if sdks:
                root_str = str(root_dir)
                return {
                    "stack": "dotnet",
                    "status": "AVAILABLE_USER_SPACE",
                    "executable": str(candidate_bin),
                    "dotnet_root": root_str,
                    "sdks": sdks,
                    "guidance": (
                        f"User-space .NET SDK detected at '{root_str}' ({sdks[0]}), "
                        "but not active on default PATH. Configure your shell before running dotnet commands:\n"
                        f'  PowerShell: $env:DOTNET_ROOT = "{root_str}"; $env:PATH = "{root_str};$env:PATH"\n'
                        f'  Bash/Zsh:   export DOTNET_ROOT="{root_str}" && export PATH="{root_str}:$PATH"'
                    ),
                }

    # 3. Missing
    return {
        "stack": "dotnet",
        "status": "MISSING",
        "executable": None,
        "dotnet_root": None,
        "sdks": [],
        "guidance": (
            ".NET SDK not found on PATH or in user-space ($HOME/.dotnet). Install manually:\n"
            "  Option A (Windows non-elevated user-space): Invoke-WebRequest https://dot.net/v1/dotnet-install.ps1 -OutFile dotnet-install.ps1; ./dotnet-install.ps1 -Channel LTS -InstallDir \"$HOME\\.dotnet\"\n"
            "  Option B (Windows elevated WinGet): winget install Microsoft.DotNet.SDK.10"
        ),
    }


def _probe_version(binary_path: str, env: Dict[str, str]) -> str:
    try:
        proc = subprocess.run(
            [binary_path, "--version"],
            env=env,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        return proc.stdout.strip() if proc.returncode == 0 and proc.stdout.strip() else "unknown"
    except Exception:
        return "unknown"


def _detect_expected_node_pm(project_root: Path | None) -> str:
    if project_root is None or not project_root.exists():
        return "npm"
    if (project_root / "pnpm-lock.yaml").exists():
        return "pnpm"
    if (project_root / "yarn.lock").exists():
        return "yarn"
    pkg_json = project_root / "package.json"
    if pkg_json.is_file():
        try:
            pkg_data = json.loads(pkg_json.read_text(encoding="utf-8"))
            pm_field = str(pkg_data.get("packageManager", "")).strip().lower()
            if pm_field.startswith("pnpm"):
                return "pnpm"
            if pm_field.startswith("yarn"):
                return "yarn"
        except Exception:
            pass
    return "npm"


def detect_node_angular(
    env: Dict[str, str] | None = None,
    project_root: Path | None = None,
) -> Dict[str, object]:
    """Detect Node.js, npm, and workspace package manager (pnpm/yarn when lockfile present)."""
    effective_env = dict(os.environ) if env is None else dict(env)
    path_str = effective_env.get("PATH", "")
    node_bin = shutil.which("node", path=path_str) if path_str else None
    npm_bin = shutil.which("npm", path=path_str) if path_str else None
    pnpm_bin = shutil.which("pnpm", path=path_str) if path_str else None
    yarn_bin = shutil.which("yarn", path=path_str) if path_str else None
    expected_pm = _detect_expected_node_pm(project_root)

    if node_bin:
        node_ver = _probe_version(node_bin, effective_env)
        if expected_pm == "pnpm":
            if pnpm_bin:
                pnpm_ver = _probe_version(pnpm_bin, effective_env)
                return {
                    "stack": "node-angular",
                    "status": "AVAILABLE",
                    "package_manager": "pnpm",
                    "node_executable": node_bin,
                    "npm_executable": npm_bin,
                    "pnpm_executable": pnpm_bin,
                    "node_version": node_ver,
                    "pnpm_version": pnpm_ver,
                    "guidance": f"Node.js ({node_ver}) and pnpm ({pnpm_ver}) detected on PATH (pnpm-lock.yaml matched).",
                }
            return {
                "stack": "node-angular",
                "status": "MISSING",
                "package_manager": "pnpm",
                "node_executable": node_bin,
                "npm_executable": npm_bin,
                "pnpm_executable": None,
                "node_version": node_ver,
                "pnpm_version": None,
                "guidance": (
                    f"Node.js ({node_ver}) detected, but project requires pnpm (`pnpm-lock.yaml`) which was not found on PATH.\n"
                    "  Enable/install manually: corepack enable pnpm   (or: npm install -g pnpm)"
                ),
            }

        if expected_pm == "yarn":
            if yarn_bin:
                yarn_ver = _probe_version(yarn_bin, effective_env)
                return {
                    "stack": "node-angular",
                    "status": "AVAILABLE",
                    "package_manager": "yarn",
                    "node_executable": node_bin,
                    "npm_executable": npm_bin,
                    "yarn_executable": yarn_bin,
                    "node_version": node_ver,
                    "guidance": f"Node.js ({node_ver}) and yarn ({yarn_ver}) detected on PATH (yarn.lock matched).",
                }
            return {
                "stack": "node-angular",
                "status": "MISSING",
                "package_manager": "yarn",
                "node_executable": node_bin,
                "npm_executable": npm_bin,
                "yarn_executable": None,
                "node_version": node_ver,
                "guidance": (
                    f"Node.js ({node_ver}) detected, but project requires yarn (`yarn.lock`) which was not found on PATH.\n"
                    "  Enable/install manually: corepack enable yarn   (or: npm install -g yarn)"
                ),
            }

        if npm_bin:
            return {
                "stack": "node-angular",
                "status": "AVAILABLE",
                "package_manager": "pnpm" if pnpm_bin else "npm",
                "node_executable": node_bin,
                "npm_executable": npm_bin,
                "pnpm_executable": pnpm_bin,
                "node_version": node_ver,
                "guidance": f"Node.js ({node_ver}) and npm detected on PATH.",
            }

    return {
        "stack": "node-angular",
        "status": "MISSING",
        "package_manager": expected_pm,
        "node_executable": node_bin,
        "npm_executable": npm_bin,
        "pnpm_executable": pnpm_bin,
        "node_version": None,
        "guidance": (
            "Node.js or package manager not found on PATH. Install manually:\n"
            "  Windows (WinGet): winget install OpenJS.NodeJS.LTS\n"
            "  Angular CLI:      npm install -g @angular/cli"
        ),
    }


def detect_python() -> Dict[str, object]:
    """Detect Python 3.11+ runtime."""
    ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    ok = (sys.version_info.major, sys.version_info.minor) >= (3, 11)
    return {
        "stack": "python",
        "status": "AVAILABLE" if ok else "MISSING",
        "executable": sys.executable,
        "version": ver,
        "guidance": (
            f"Python {ver} detected ({sys.executable}). Create virtual environments via `python -m venv .venv`."
            if ok
            else f"Python 3.11+ required (found {ver}). Install Python 3.11+ from python.org or WinGet."
        ),
    }


def run_preflight_checks(
    stacks: List[str],
    env: Dict[str, str] | None = None,
    home_dir: Path | None = None,
    project_root: Path | None = None,
) -> Dict[str, object]:
    """Execute preflight checks for the requested stacks."""
    normalized = normalize_stacks(stacks)
    results: Dict[str, Dict[str, object]] = {}
    for st in normalized:
        if st == "dotnet":
            results[st] = detect_dotnet_sdk(env=env, home_dir=home_dir)
        elif st == "node-angular":
            results[st] = detect_node_angular(env=env, project_root=project_root)
        elif st == "python":
            results[st] = detect_python()
    all_ready = all(r["status"] in ("AVAILABLE", "AVAILABLE_USER_SPACE") for r in results.values())
    return {
        "overall_status": "READY" if all_ready else "ACTION_REQUIRED",
        "stacks": results,
    }


def render_preflight_markdown(report: Dict[str, object]) -> str:
    """Render deterministic Markdown guidance for docs/ENVIRONMENT_PREFLIGHT.md."""
    lines = [
        "# Stack Environment Preflight Guidance (`docs/ENVIRONMENT_PREFLIGHT.md`)",
        "",
        "This document provides stack-specific environment verification and SDK guidance generated by the AI Engineering Framework.",
        "",
        "## Configured Stack Preflight Summary",
        "",
        "| Stack | Status | Guidance |",
        "| :--- | :--- | :--- |",
    ]
    stacks_map: Dict[str, Dict[str, object]] = report.get("stacks", {})  # type: ignore[assignment]
    for stack_name, info in stacks_map.items():
        status = str(info.get("status", "UNKNOWN"))
        guidance_first_line = str(info.get("guidance", "")).splitlines()[0] if info.get("guidance") else ""
        lines.append(f"| `{stack_name}` | `{status}` | {guidance_first_line} |")

    lines.extend(
        [
            "",
            "## Windows `.NET` User-Space SDK Configuration (`DOTNET_ROOT`)",
            "",
            "When `.NET SDK` is installed in user-space (`$HOME\\.dotnet`) rather than `C:\\Program Files\\dotnet` (or when `C:\\Program Files\\dotnet` contains only a runtime), export `DOTNET_ROOT` in every shell session before running `dotnet` commands:",
            "",
            "```powershell",
            '$env:DOTNET_ROOT = "$HOME\\.dotnet"',
            '$env:PATH = "$HOME\\.dotnet;$env:PATH"',
            "dotnet --list-sdks",
            "```",
            "",
            "## Re-running Preflight Verification",
            "",
            "```bash",
            "python scripts/preflight.py --stacks " + ",".join(stacks_map.keys()),
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check stack SDK prerequisites without modifying the system.")
    parser.add_argument(
        "--root",
        type=Path,
        default=_default_repo_root(),
        help="Consumer repository root used to detect workspace lockfiles such as pnpm-lock.yaml",
    )
    parser.add_argument(
        "--stacks",
        type=str,
        default="dotnet,node-angular,python",
        help="Comma-separated stacks to check (dotnet,node-angular,python)",
    )
    parser.add_argument("--json", action="store_true", help="Emit preflight report as JSON")
    args = parser.parse_args(argv)

    raw_list = [s.strip() for s in args.stacks.split(",") if s.strip()]
    try:
        report = run_preflight_checks(raw_list, project_root=args.root.resolve())
    except ValueError as exc:
        print(f"PREFLIGHT_ERROR: {exc}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps(report, indent=2))
        return 0

    print("=== AI Engineering Framework Stack Preflight ===")
    for stack_name, info in report["stacks"].items():  # type: ignore[union-attr]
        print(f"  [{info['status']}] {stack_name}")
        for line in str(info["guidance"]).splitlines():
            print(f"      {line}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
