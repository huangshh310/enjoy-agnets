#!/usr/bin/env python3
"""Linux Computer Use 执行器：AT-SPI。Wayland 不发明后台点击。"""
import json
import os
import sys
import time

MAX_ELEMENTS = 80
MAX_DEPTH = 6


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def session_kind():
    if os.environ.get("WAYLAND_DISPLAY"):
        return "wayland"
    if os.environ.get("DISPLAY"):
        return "x11"
    return "none"


def load_atspi():
    try:
        import pyatspi
        return pyatspi
    except Exception:
        return None


def handle(request):
    method = request.get("method")
    params = request.get("params") or {}
    kind = session_kind()
    if method == "doctor":
        return doctor(kind)
    if method == "screenshot":
        return error("screenshot_unavailable", "Host captures thumbnails.")
    if method == "list_apps":
        return list_apps(kind)
    if method == "snapshot":
        return snapshot(kind, params)
    if method == "act":
        return act(kind, params)
    return error("unknown_method", method or "")


def doctor(kind):
    if kind == "none":
        return error("no_display", "No DISPLAY or WAYLAND_DISPLAY.")
    atspi = load_atspi()
    if atspi is None:
        return error("executor_missing", "Install at-spi2-core and python3-pyatspi.")
    return result({"backgroundClick": kind == "x11", "session": kind})


def list_apps(kind):
    apps, err = desktop_apps(kind)
    if err:
        return err
    rows = []
    for app in apps:
        rows.append({
            "pid": app_pid(app),
            "name": app.name or "",
            "frontmost": is_active(app),
            "backgroundClick": kind == "x11",
        })
    return result({"apps": rows})


def snapshot(kind, params):
    apps, err = desktop_apps(kind)
    if err:
        return err
    pid = int(params.get("pid") or 0)
    target = pick_app(apps, pid)
    if target is None:
        return result({"observation": empty_obs(kind, pid)})
    elements = []
    walk(target, "0", 0, elements)
    return result({"observation": {
        "id": "obs_linux",
        "pid": app_pid(target) or pid,
        "windowId": str(app_pid(target) or pid),
        "appName": target.name or kind,
        "elements": elements,
        "createdAt": int(time.time() * 1000),
        "platform": "linux",
    }})


def act(kind, params):
    if kind == "none":
        return error("no_display", "No DISPLAY or WAYLAND_DISPLAY.")
    if kind == "wayland" and not params.get("allowForeground"):
        return error("needs_foreground", "Wayland has no background click.")
    action = params.get("action") or ""
    if action == "wait":
        ms = min(int(params.get("waitMs") or 0), 5000)
        if ms > 0:
            time.sleep(ms / 1000)
        return result({"delivery": "background"})
    atspi = load_atspi()
    if atspi is None:
        return error("executor_missing", "Install at-spi2-core and python3-pyatspi.")
    apps, err = desktop_apps(kind)
    if err:
        return err
    target = pick_app(apps, int(params.get("pid") or 0))
    if target is None:
        return error("stale_observation", "App is not in this snapshot.")
    element = element_at(target, params.get("elementId") or "")
    if element is None:
        return error("stale_observation", "Element is not in this snapshot.")
    want = params.get("elementName") or ""
    if want and (element.name or "") != want:
        return error("stale_observation", "Element name no longer matches.")
    if kind == "wayland" or params.get("allowForeground"):
        raise_app(target)
    if not do_action(element, action, params):
        return error("action_failed", "AT-SPI action failed.")
    delivery = "foreground" if kind == "wayland" or params.get("allowForeground") else "background"
    return result({"delivery": delivery})


def desktop_apps(kind):
    if kind == "none":
        return None, error("no_display", "No DISPLAY or WAYLAND_DISPLAY.")
    atspi = load_atspi()
    if atspi is None:
        return None, error("executor_missing", "Install at-spi2-core and python3-pyatspi.")
    desktop = atspi.Registry.getDesktop(0)
    apps = [desktop.getChildAtIndex(i) for i in range(desktop.childCount)]
    return apps, None


def pick_app(apps, pid):
    if pid:
        for app in apps:
            if app_pid(app) == pid:
                return app
    return apps[0] if apps else None


def app_pid(app):
    try:
        return int(app.get_process_id())
    except Exception:
        return 0


def walk(el, path, depth, out):
    if len(out) >= MAX_ELEMENTS or depth > MAX_DEPTH:
        return
    name = el.name or ""
    role = ""
    try:
        role = el.getRoleName()
    except Exception:
        pass
    if name:
        out.append({"id": path, "role": role, "name": name, "clickable": True})
    try:
        count = min(el.childCount, 24)
    except Exception:
        return
    for i in range(count):
        try:
            child = el.getChildAtIndex(i)
        except Exception:
            continue
        walk(child, f"{path}.{i}", depth + 1, out)


def element_at(root, path):
    parts = [int(p) for p in path.split(".") if p != ""]
    current = root
    # snapshot 从应用本身记成 "0"，后面才是子节点
    if parts[:1] == [0]:
        parts = parts[1:]
    for index in parts:
        try:
            if index < 0 or index >= current.childCount:
                return None
            current = current.getChildAtIndex(index)
        except Exception:
            return None
    return current


def do_action(el, action, params):
    if action == "type":
        return set_text(el, params.get("text") or "")
    try:
        iface = el.queryAction()
    except Exception:
        return False
    names = []
    for i in range(iface.nActions):
        names.append((i, (iface.getName(i) or "").lower()))
    want = "press" if action == "click" else action
    for i, name in names:
        if want in name or name in ("click", "press", "activate"):
            return bool(iface.doAction(i))
    if action == "click" and names:
        return bool(iface.doAction(names[0][0]))
    return False


def raise_app(app):
    try:
        for i in range(app.childCount):
            child = app.getChildAtIndex(i)
            try:
                child.queryComponent().grabFocus()
                return True
            except Exception:
                continue
    except Exception:
        return False
    return False


def is_active(app):
    try:
        import pyatspi
        return bool(app.getState().contains(pyatspi.STATE_ACTIVE))
    except Exception:
        return False


def set_text(el, text):
    try:
        editable = el.queryEditableText()
        editable.setTextContents(text)
        return True
    except Exception:
        return False


def empty_obs(kind, pid):
    return {
        "id": "obs_linux", "pid": pid or 0, "windowId": str(pid or 0),
        "appName": kind, "elements": [], "createdAt": int(time.time() * 1000), "platform": "linux",
    }


def result(body):
    return {"result": body}


def error(code, message):
    return {"error": {"code": code, "message": message}}


for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    request = json.loads(line)
    body = handle(request)
    body["id"] = request.get("id")
    emit(body)
