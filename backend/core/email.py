import ipaddress
import logging
import os
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": os.environ["EMAIL_FROM_NAME"]}
    if os.environ.get("EMAIL_REPLY_TO"):
        payload["contact_email"] = os.environ["EMAIL_REPLY_TO"]
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                     headers={"X-Email-Key": os.environ["EMERGENT_EMAIL_KEY"]}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(502, "Не удалось отправить письмо")
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise HTTPException(500, "Не удалось отправить письмо")


def reset_email_html(username: str, link: str) -> str:
    brand = escape(os.environ["EMAIL_FROM_NAME"])
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090B;padding:32px 0">'
        '<tr><td align="center"><table role="presentation" width="520" cellpadding="0" cellspacing="0" '
        'style="background:#121215;border:1px solid #27272a;font-family:Arial,sans-serif;color:#ffffff">'
        '<tr><td style="height:4px;background:#FF6B00"></td></tr>'
        f'<tr><td style="padding:32px 32px 8px;font-size:22px;font-weight:bold;letter-spacing:1px">{brand}</td></tr>'
        f'<tr><td style="padding:8px 32px;font-size:15px;line-height:24px;color:#d4d4d8">Привет, {escape(username)}!<br>'
        'Мы получили запрос на восстановление пароля. Нажмите кнопку ниже, чтобы задать новый пароль. '
        'Ссылка действует 1 час и сработает только один раз.</td></tr>'
        f'<tr><td style="padding:24px 32px"><a href="{escape(link)}" style="display:inline-block;background:#FF6B00;'
        'color:#09090B;text-decoration:none;font-weight:bold;padding:14px 28px">Сбросить пароль</a></td></tr>'
        '<tr><td style="padding:0 32px 32px;font-size:12px;line-height:18px;color:#a1a1aa">'
        f'Если вы не запрашивали сброс, просто проигнорируйте это письмо. Отправлено {brand}. '
        'Мы никогда не просим сообщить пароль по почте.</td></tr>'
        '</table></td></tr></table>'
    )
