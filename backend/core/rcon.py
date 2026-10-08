import asyncio
import socket
import struct


def _read(sock: socket.socket, n: int) -> bytes:
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("RCON соединение закрыто")
        buf += chunk
    return buf


def _send(sock, rid: int, typ: int, body: str) -> None:
    data = struct.pack("<ii", rid, typ) + body.encode("utf-8") + b"\x00\x00"
    sock.sendall(struct.pack("<i", len(data)) + data)


def _recv(sock):
    length = struct.unpack("<i", _read(sock, 4))[0]
    data = _read(sock, length)
    rid, typ = struct.unpack("<ii", data[:8])
    return rid, typ, data[8:-2].decode("utf-8", "replace")


def _command(host: str, port: int, password: str, command: str, timeout: float) -> str:
    with socket.create_connection((host, port), timeout=timeout) as sock:
        sock.settimeout(timeout)
        _send(sock, 1, 3, password)
        rid, typ, _ = _recv(sock)
        if typ == 0:
            rid, typ, _ = _recv(sock)
        if rid == -1:
            raise PermissionError("Неверный RCON пароль")
        _send(sock, 2, 2, command)
        return _recv(sock)[2]


async def rcon(host: str, port: int, password: str, command: str, timeout: float = 5) -> str:
    if not host or not password:
        raise ConnectionError("RCON не настроен для этого сервера")
    return await asyncio.to_thread(_command, host, port, password, command, timeout)
