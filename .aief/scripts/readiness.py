#!/usr/bin/env python3
"""Bounded HTTP/dev-server startup readiness check with strict owned-process cleanup.

Designed for Stage 5 QA / Browser E2E workflows (GAP-08) across Windows PowerShell 5.1,
macOS, and Linux using only Python standard library modules:
- Derives endpoints from project configuration (angular.json, package.json) or explicit URL.
- Never invents default ports silently when configuration is absent.
- Detects early child-process exits and compilation failures instead of blind fixed sleeps.
- Stops ONLY the child process handle owned by this launcher, never unrelated user processes.
"""

from __future__ import annotations

import argparse
from collections import deque
import json
from pathlib import Path
import re
import subprocess
import sys
import threading
import time
from typing import Deque, Dict, List, Optional
import urllib.error
import urllib.request

COMPILATION_ERROR_PATTERNS = (
    "ERROR in",
    "Compilation failed",
    "Build failed",
    "error TS",
    "EADDRINUSE",
)

PORT_FLAG_RE = re.compile(r"--port(?:=|\s+)(\d{2,5})\b")
HOST_FLAG_RE = re.compile(r"--host(?:=|\s+)([A-Za-z0-9._-]+)")


class ReadinessConfigError(ValueError):
    """Raised when an HTTP endpoint cannot be safely derived from configuration."""


def derive_endpoint_from_angular_config(
    angular_json_path: Path,
    configuration: str | None = None,
) -> str:
    """Derive a local serve URL from angular.json without inventing undeclared ports."""
    if not angular_json_path.exists():
        raise ReadinessConfigError(f"angular.json not found: {angular_json_path}")

    data = json.loads(angular_json_path.read_text(encoding="utf-8"))
    projects = data.get("projects")
    if not isinstance(projects, dict) or not projects:
        raise ReadinessConfigError(f"No projects defined in {angular_json_path}")

    default_name = data.get("defaultProject")
    project_obj = projects.get(default_name) if isinstance(default_name, str) and default_name in projects else next(iter(projects.values()))
    if not isinstance(project_obj, dict):
        raise ReadinessConfigError(f"Malformed project object in {angular_json_path}")

    serve = project_obj.get("architect", {}).get("serve", {})
    options = dict(serve.get("options", {})) if isinstance(serve.get("options"), dict) else {}
    if configuration and isinstance(serve.get("configurations", {}).get(configuration), dict):
        options.update(serve["configurations"][configuration])

    port = options.get("port")
    if not isinstance(port, int) or port <= 0 or port > 65535:
        raise ReadinessConfigError(
            f"No explicit serve port configured in {angular_json_path}; pass --url explicitly."
        )
    host = str(options.get("host") or "localhost").strip() or "localhost"
    if host == "0.0.0.0":
        host = "localhost"
    scheme = "https" if options.get("ssl") is True else "http"
    return f"{scheme}://{host}:{port}/"


def derive_endpoint_from_package_json(package_json_path: Path, script_name: str = "start") -> str:
    """Derive a local serve URL from a package.json script --port flag."""
    if not package_json_path.exists():
        raise ReadinessConfigError(f"package.json not found: {package_json_path}")
    data = json.loads(package_json_path.read_text(encoding="utf-8"))
    scripts = data.get("scripts", {})
    cmd = scripts.get(script_name) if isinstance(scripts, dict) else None
    if not isinstance(cmd, str):
        raise ReadinessConfigError(f"Script '{script_name}' missing in {package_json_path}")

    m_port = PORT_FLAG_RE.search(cmd)
    if not m_port:
        raise ReadinessConfigError(
            f"Script '{script_name}' in {package_json_path} specifies no --port; pass --url explicitly."
        )
    port = int(m_port.group(1))
    m_host = HOST_FLAG_RE.search(cmd)
    host = m_host.group(1) if m_host else "localhost"
    if host == "0.0.0.0":
        host = "localhost"
    scheme = "https" if "--ssl" in cmd else "http"
    return f"{scheme}://{host}:{port}/"


def _drain_stream(stream, buffer: Deque[str]) -> None:
    try:
        for line in iter(stream.readline, ""):
            buffer.append(line.rstrip("\r\n"))
    finally:
        try:
            stream.close()
        except OSError:
            pass


def start_owned_process(command: List[str], cwd: Path) -> tuple[subprocess.Popen, Deque[str]]:
    """Start a workflow-owned child process with captured combined output."""
    if not command:
        raise ValueError("Command must not be empty")
    if not cwd.exists() or not cwd.is_dir():
        raise FileNotFoundError(f"Working directory does not exist: {cwd}")

    buffer: Deque[str] = deque(maxlen=200)
    proc = subprocess.Popen(
        command,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.stdout is not None:
        t = threading.Thread(target=_drain_stream, args=(proc.stdout, buffer), daemon=True)
        t.start()
    return proc, buffer


def stop_owned_process(proc: subprocess.Popen, grace_seconds: float = 5.0) -> bool:
    """Safely stop ONLY the provided Popen child process handle."""
    if proc.poll() is not None:
        return True
    proc.terminate()
    try:
        proc.wait(timeout=grace_seconds)
        return True
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=grace_seconds)
        return True


def _detect_compilation_error(lines: List[str]) -> Optional[str]:
    for line in lines:
        for pat in COMPILATION_ERROR_PATTERNS:
            if pat in line:
                return line
    return None


def wait_for_http_ready(
    url: str,
    proc: subprocess.Popen | None = None,
    output_buffer: Deque[str] | List[str] | None = None,
    timeout_seconds: float = 60.0,
    poll_interval: float = 0.5,
) -> Dict[str, object]:
    """Poll url until HTTP < 400 or report early exit, compilation failure, or timeout."""
    start = time.monotonic()
    deadline = start + timeout_seconds

    while True:
        recent_lines = list(output_buffer) if output_buffer is not None else []
        if proc is not None:
            rc = proc.poll()
            if rc is not None:
                comp_err = _detect_compilation_error(recent_lines)
                return {
                    "ready": False,
                    "status": "COMPILATION_FAILED" if comp_err else "PROCESS_EXITED",
                    "url": url,
                    "returncode": rc,
                    "elapsed_seconds": round(time.monotonic() - start, 3),
                    "error": comp_err or f"Process exited with code {rc} before {url} became ready",
                    "output_tail": recent_lines[-20:],
                }

        comp_err = _detect_compilation_error(recent_lines)
        if comp_err:
            return {
                "ready": False,
                "status": "COMPILATION_FAILED",
                "url": url,
                "returncode": None if proc is None else proc.poll(),
                "elapsed_seconds": round(time.monotonic() - start, 3),
                "error": comp_err,
                "output_tail": recent_lines[-20:],
            }

        try:
            with urllib.request.urlopen(url, timeout=1.5) as resp:
                status_code = getattr(resp, "status", 200)
                if 200 <= status_code < 400:
                    return {
                        "ready": True,
                        "status": "READY",
                        "url": url,
                        "http_status": status_code,
                        "elapsed_seconds": round(time.monotonic() - start, 3),
                    }
        except urllib.error.HTTPError as exc:
            if exc.code < 500:
                return {
                    "ready": True,
                    "status": "READY",
                    "url": url,
                    "http_status": exc.code,
                    "elapsed_seconds": round(time.monotonic() - start, 3),
                }
        except Exception:
            pass

        if time.monotonic() >= deadline:
            return {
                "ready": False,
                "status": "TIMEOUT",
                "url": url,
                "returncode": None if proc is None else proc.poll(),
                "elapsed_seconds": round(time.monotonic() - start, 3),
                "error": f"Timed out after {timeout_seconds}s waiting for {url}",
                "output_tail": recent_lines[-20:],
            }

        time.sleep(min(poll_interval, max(0.05, deadline - time.monotonic())))


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Bounded HTTP readiness probe for framework workflows.")
    parser.add_argument("--url", type=str, help="Explicit local endpoint URL to probe")
    parser.add_argument("--angular-config", type=Path, help="Path to angular.json to derive serve endpoint")
    parser.add_argument("--package-json", type=Path, help="Path to package.json to derive start --port endpoint")
    parser.add_argument("--timeout", type=float, default=60.0, help="Maximum seconds to wait for HTTP readiness")
    parser.add_argument("--interval", type=float, default=0.5, help="Polling interval in seconds")
    parser.add_argument("--json", action="store_true", help="Emit readiness result as JSON")
    args = parser.parse_args(argv)

    try:
        if args.url:
            url = args.url
        elif args.angular_config:
            url = derive_endpoint_from_angular_config(args.angular_config)
        elif args.package_json:
            url = derive_endpoint_from_package_json(args.package_json)
        else:
            raise ReadinessConfigError("Provide --url, --angular-config, or --package-json")
    except ReadinessConfigError as exc:
        print(f"READINESS_CONFIG_ERROR: {exc}", file=sys.stderr)
        return 2

    result = wait_for_http_ready(url=url, timeout_seconds=args.timeout, poll_interval=args.interval)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"{result['status']}: {result['url']} ({result['elapsed_seconds']}s)")
    return 0 if result["ready"] else 1


if __name__ == "__main__":
    sys.exit(main())
