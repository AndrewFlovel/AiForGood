"""
Tests de integración del flujo offline:
 - Lote de eventos de respuesta (batch idempotente por UUID de evento)
 - Idempotencia de la tarea en proceso (client_submission_id)

Requiere el backend corriendo en el puerto 8001 con datos de init_db
(usuario admin/admin123 y el RouteStop seed 11111111-...).

Uso: python test_eventos_offline.py
"""
import io
import json
import sys
import uuid

import requests

BASE_URL = "http://localhost:8001/api"

# Coordenadas reales del PDV seed (id=11111111-...) — La Paz, Bolivia
PDV_LAT = -16.53678674
PDV_LON = -68.04696858

ROUTE_STOP_ID = "11111111-1111-1111-1111-111111111111"

PASS = "✅ PASS"
FAIL = "❌ FAIL"

# JPEG mínimo válido (1x1 px) para el multipart de la tarea
JPEG_MINIMO = bytes.fromhex(
    "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707"
    "07090908080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c23"
    "1c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100"
    "ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc4"
    "00b5100002010303020403050504040000017d01020300041105122131410613516107"
    "227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a34"
    "35363738393a434445464748494a535455565758595a636465666768696a7374757677"
    "78797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7"
    "b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4"
    "f5f6f7f8f9faffda0008010100003f00fbfa28a2803fffd9"
)


def print_banner(title):
    print(f"\n{'='*50}")
    print(f"🚀 {title}")
    print(f"{'='*50}")


def get_auth_token():
    # reponedor1 es el dueño de la ruta del RouteStop seed (init_db):
    # los endpoints de eventos y tarea validan ownership, admin daría 403.
    print("[Autenticación] Solicitando token JWT (reponedor1)...")
    login_payload = {
        "username": "reponedor1",
        "password": "repo123",
        "device_id": "iPhone-Prueba-1",
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/login/", json=login_payload)
        response.raise_for_status()
        token = response.json().get("access")
        print("✅ Autenticación exitosa.")
        return token
    except Exception as e:
        print(f"❌ Error de autenticación: {e}")
        print("¿Aseguraste que el backend está corriendo en el puerto 8001?")
        sys.exit(1)


def evaluar(nombre, response, expect_status, checks=None):
    """checks: lista de (descripcion, fn(data) -> bool) sobre el JSON de respuesta."""
    print(f"\n👉 {nombre}")
    print(f"Status Code: {response.status_code}")
    try:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    except Exception:
        data = {}
        print(f"Respuesta cruda: {response.text[:500]}")

    ok = response.status_code == expect_status
    if not ok:
        print(f"Resultado: {FAIL} (esperado {expect_status}, obtenido {response.status_code})")
        return False, data

    for descripcion, fn in checks or []:
        try:
            paso = bool(fn(data))
        except Exception as e:
            paso = False
            print(f"  (check reventó: {e})")
        print(f"  check: {descripcion} → {PASS if paso else FAIL}")
        ok = ok and paso

    print(f"Resultado: {PASS if ok else FAIL}")
    return ok, data


def evento(pregunta_key, descripcion, valor, evento_id=None):
    return {
        "id": evento_id or str(uuid.uuid4()),
        "route_stop": ROUTE_STOP_ID,
        "pregunta_key": pregunta_key,
        "pregunta_descripcion": descripcion,
        "valor": valor,
        "answered_at": "2026-07-14T10:30:00Z",
        "latitud": PDV_LAT,
        "longitud": PDV_LON,
        "entidad_nombre": "PDV de Prueba (seed)",
        "ultimo_chequeo": "2026-07-14T10:25:00Z",
    }


def main():
    token = get_auth_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Device-ID": "iPhone-Prueba-1",
    }

    resultados = []

    # Setup: check-in para dejar la parada en in_progress (requisito de la tarea)
    print_banner("Setup: Check-in en el PDV seed")
    res = requests.post(
        f"{BASE_URL}/logistica/checkin/",
        json={
            "route_stop_id": ROUTE_STOP_ID,
            "latitud": PDV_LAT,
            "longitud": PDV_LON,
            "velocidad_kmh": 0,
            "es_mock_location": False,
        },
        headers=headers,
    )
    print(f"Check-in status: {res.status_code} (se aceptan 200/201)")
    if res.status_code not in (200, 201):
        print(f"{FAIL} No se pudo hacer check-in; abortando. Respuesta: {res.text[:300]}")
        sys.exit(1)

    # Caso 1: lote nuevo de eventos → todos creados
    print_banner("Caso 1: Lote de 2 eventos nuevos")
    eventos_lote = [
        evento("nivel_stock", "Nivel de stock en góndola", "Medio"),
        evento("gondola_ok", "Góndola en buen estado", "true"),
    ]
    ok, _ = evaluar(
        "POST eventos-respuesta con 2 eventos nuevos",
        requests.post(f"{BASE_URL}/logistica/eventos-respuesta/", json={"eventos": eventos_lote}, headers=headers),
        expect_status=200,
        checks=[
            ("creados == 2", lambda d: d.get("creados") == 2),
            ("duplicados == 0", lambda d: d.get("duplicados") == 0),
            ("sin errores", lambda d: d.get("errores") == []),
        ],
    )
    resultados.append(ok)

    # Caso 2: replay EXACTO del mismo lote → idempotente
    print_banner("Caso 2: Replay del mismo lote (idempotencia)")
    ok, _ = evaluar(
        "POST del MISMO lote (mismos UUIDs)",
        requests.post(f"{BASE_URL}/logistica/eventos-respuesta/", json={"eventos": eventos_lote}, headers=headers),
        expect_status=200,
        checks=[
            ("creados == 0", lambda d: d.get("creados") == 0),
            ("duplicados == 2", lambda d: d.get("duplicados") == 2),
        ],
    )
    resultados.append(ok)

    # Caso 3: evento con route_stop inexistente → va a errores, no tumba el lote
    print_banner("Caso 3: Evento con parada inexistente")
    lote_malo = [evento("nivel_stock", "Nivel de stock", "Alto")]
    lote_malo[0]["route_stop"] = str(uuid.uuid4())
    ok, _ = evaluar(
        "POST con route_stop inexistente",
        requests.post(f"{BASE_URL}/logistica/eventos-respuesta/", json={"eventos": lote_malo}, headers=headers),
        expect_status=200,
        checks=[
            ("creados == 0", lambda d: d.get("creados") == 0),
            ("1 entrada en errores", lambda d: len(d.get("errores", [])) == 1),
        ],
    )
    resultados.append(ok)

    # Caso 4: tarea en proceso con client_submission_id → 201
    print_banner("Caso 4: Tarea en proceso (multipart) con client_submission_id")
    submission_id = str(uuid.uuid4())
    tarea_data = {
        "notas": "Test offline idempotente",
        "datos_extra": json.dumps({"nivel_stock": "Medio", "gondola_ok": True}),
        "foto_timestamp": "2026-07-14T10:31:00Z",
        "sesion_iniciada_at": "2026-07-14T08:00:00Z",
        "client_submission_id": submission_id,
    }
    res = requests.post(
        f"{BASE_URL}/logistica/paradas/{ROUTE_STOP_ID}/tarea/",
        data=tarea_data,
        files={"foto": ("foto.jpg", io.BytesIO(JPEG_MINIMO), "image/jpeg")},
        headers=headers,
    )
    if res.status_code == 502:
        print("⚠️  Google Drive no está configurado en este entorno (502 al subir la foto).")
        print("    Casos 4-6 (idempotencia de la tarea) se OMITEN: no dependen del batch de eventos.")
    else:
        ok, data4 = evaluar(
            "POST tarea con foto + client_submission_id",
            res,
            expect_status=201,
            checks=[("stop_status == completed", lambda d: d.get("stop_status") == "completed")],
        )
        resultados.append(ok)
        formulario_id = data4.get("formulario_id")

        # Caso 5: replay con el MISMO client_submission_id sobre parada completada → 200 duplicado
        print_banner("Caso 5: Replay de la tarea (mismo client_submission_id)")
        res5 = requests.post(
            f"{BASE_URL}/logistica/paradas/{ROUTE_STOP_ID}/tarea/",
            data=tarea_data,
            files={"foto": ("foto.jpg", io.BytesIO(JPEG_MINIMO), "image/jpeg")},
            headers=headers,
        )
        ok, _ = evaluar(
            "POST replay de la misma tarea",
            res5,
            expect_status=200,
            checks=[
                ("duplicado == True", lambda d: d.get("duplicado") is True),
                ("mismo formulario_id", lambda d: d.get("formulario_id") == formulario_id),
            ],
        )
        resultados.append(ok)

        # Caso 6: id NUEVO sobre parada ya completada → 400 (guard intacto)
        print_banner("Caso 6: Tarea con id nuevo sobre parada completada")
        tarea_nueva = dict(tarea_data, client_submission_id=str(uuid.uuid4()))
        res6 = requests.post(
            f"{BASE_URL}/logistica/paradas/{ROUTE_STOP_ID}/tarea/",
            data=tarea_nueva,
            files={"foto": ("foto.jpg", io.BytesIO(JPEG_MINIMO), "image/jpeg")},
            headers=headers,
        )
        ok, _ = evaluar("POST tarea con client_submission_id nuevo", res6, expect_status=400)
        resultados.append(ok)

    # Resumen
    total = len(resultados)
    pasados = sum(resultados)
    print(f"\n{'='*50}")
    print(f"RESUMEN: {pasados}/{total} tests pasaron")
    print("=" * 50)
    sys.exit(0 if pasados == total else 1)


if __name__ == "__main__":
    main()
