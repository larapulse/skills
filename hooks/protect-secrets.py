#!/usr/bin/env python3
"""Denies tool calls that read secrets, open remote shells or upload data."""
import json
import os
import re
import shlex
import sys

HOME = os.path.expanduser("~")

# Secret wherever they are. Env templates and .env.local stay readable.
SECRET_NAME = re.compile(
    r"^\.env(\.(?!(example|sample|dist|template|local)$)[\w.-]+)?$"
    r"|^id_(rsa|dsa|ecdsa|ed25519)$"
    r"|\.(pem|key|p12|pfx)$"
    r"|^auth\.json$"
)
# Catches .env names inside quoted code, such as file_get_contents(".env").
SECRET_ENV_IN_TEXT = re.compile(r"(?<![\w.-])\.env(\.(?!(example|sample|dist|template|local)(?![\w.-]))[\w.-]+)?(?![\w.-])")

# Secret everything below these, relative to the home directory.
SECRET_HOME_PATHS = [
    ".ssh", ".gnupg", ".aws", ".azure", ".config/gcloud", ".kube",
    ".docker/config.json", ".netrc", ".git-credentials", ".npmrc", ".pypirc",
    ".config/gh", ".config/glab-cli", ".claude/.credentials.json", ".codex/auth.json",
]
SSH_READABLE = re.compile(r"^(config|known_hosts(\.old)?|.+\.pub)$")

# Remote shells and file transfers: no connections to servers.
REMOTE_COMMANDS = {"ssh", "scp", "sftp", "rsync", "sshpass", "mosh", "autossh"}
WRAPPERS = {"sudo", "doas", "env", "exec", "command", "builtin", "nohup", "nice", "time", "timeout", "xargs"}
SHELLS = {"sh", "bash", "zsh", "dash", "fish"}
SEPARATOR = re.compile(r"[;&|()\n]+")


def is_secret_path(path, cwd):
    path = os.path.expandvars(os.path.expanduser(path))
    name = os.path.basename(path.rstrip("/"))
    if SECRET_NAME.search(name):
        return True
    full = os.path.normpath(os.path.join(cwd, path))
    ssh = os.path.join(HOME, ".ssh")
    if full.startswith(ssh + os.sep) and os.path.dirname(full) == ssh and SSH_READABLE.match(name):
        return False
    return any(
        full == root or full.startswith(root + os.sep)
        for root in (os.path.join(HOME, p) for p in SECRET_HOME_PATHS)
    )


def is_upload(name, args):
    """True when curl or wget would send data rather than only download."""
    for i, arg in enumerate(args):
        following = args[i + 1] if i + 1 < len(args) else ""
        if name == "curl":
            if re.match(r"--(data|json|form|upload-file)", arg) or re.fullmatch(r"-[A-Za-z]*[dFT].*", arg):
                return True
            method = arg[2:] if re.fullmatch(r"-X\w+", arg) else following if arg in ("-X", "--request") else arg.partition("=")[2] if arg.startswith("--request=") else ""
        else:
            if re.match(r"--(post|body)-(data|file)", arg):
                return True
            method = following if arg == "--method" else arg.partition("=")[2] if arg.startswith("--method=") else ""
        if method and method.upper() not in ("GET", "HEAD"):
            return True
    return False


def tokens_of(command):
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    lexer.whitespace_split = True
    try:
        return list(lexer)
    except ValueError:
        return command.split()


def check_command(command, cwd):
    if SECRET_ENV_IN_TEXT.search(command):
        return "a .env file holds secrets and is off limits"
    tokens = tokens_of(command)
    at_command = True
    for i, token in enumerate(tokens):
        if SEPARATOR.fullmatch(token):
            at_command = True
            continue
        word = token.strip("`$(")
        if at_command:
            name = os.path.basename(word)
            if name in WRAPPERS or re.fullmatch(r"\w+=.*|-\S*|\d+[smhd]?", word):
                continue
            at_command = False
            if name in REMOTE_COMMANDS:
                return f"{name} connects to remote servers and is off limits"
            if name in ("curl", "wget"):
                end = next((k for k in range(i + 1, len(tokens)) if SEPARATOR.fullmatch(tokens[k])), len(tokens))
                if is_upload(name, tokens[i + 1:end]):
                    return f"uploading data with {name} is off limits; downloads are allowed"
            if name in SHELLS | {"eval"}:
                rest = tokens[i + 1:]
                inner = rest[rest.index("-c") + 1] if "-c" in rest[:-1] else (rest[0] if name == "eval" and rest else "")
                reason = inner and check_command(inner, cwd)
                if reason:
                    return reason
        for part in re.split(r"[=:]", word.lstrip("<>")):
            if part and is_secret_path(part.rstrip(");|&"), cwd):
                return f"{part} holds secrets and is off limits"
    return None


def main():
    event = json.load(sys.stdin)
    tool, args, cwd = event.get("tool_name"), event.get("tool_input", {}), event.get("cwd", ".")
    if tool == "Bash":
        reason = check_command(args.get("command", ""), cwd)
    else:
        path = args.get("file_path") or args.get("path") or ""
        reason = path and is_secret_path(path, cwd) and f"{path} holds secrets and is off limits"
    if reason:
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": f"{reason}. If it is needed, ask the user to do it.",
        }}))


main()
