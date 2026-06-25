"""
PaddleOCR microservice for receipt scanning.

Run locally:
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8089

POST /ocr  { "imageBase64": "<base64 or data-url>" }
"""

from __future__ import annotations

import base64
import os
import re
from typing import Any

# Work around PaddlePaddle 3.3+ oneDNN/PIR crash on Windows CPU.
os.environ.setdefault("FLAGS_enable_pir_api", "0")
os.environ.setdefault("FLAGS_use_mkldnn", "0")

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Receipt PaddleOCR", version="1.0.0")

_ocr_engine: Any | None = None
PRICE_TOKEN = re.compile(r"^\$?(\d+\.\d{2})$")


@app.on_event("startup")
def preload_ocr_engine() -> None:
    """Load models at boot so the first receipt scan is not blocked on cold start."""
    get_ocr_engine()


class OcrRequest(BaseModel):
    imageBase64: str = Field(..., min_length=32)


def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        from paddleocr import PaddleOCR

        lang = os.getenv("PADDLEOCR_LANG", "en")
        _ocr_engine = PaddleOCR(
            use_textline_orientation=True,
            lang=lang,
            enable_mkldnn=False,
        )
    return _ocr_engine


def decode_image(image_base64: str) -> np.ndarray:
    payload = image_base64.strip()
    if "," in payload:
        payload = payload.split(",", 1)[1]
    try:
        raw = base64.b64decode(payload, validate=False)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image") from exc

    buffer = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image bytes")
    return image


def box_to_rect(box: list[list[float]]) -> tuple[int, int, int, int]:
    xs = [point[0] for point in box]
    ys = [point[1] for point in box]
    left = int(min(xs))
    top = int(min(ys))
    width = max(1, int(max(xs) - min(xs)))
    height = max(1, int(max(ys) - min(ys)))
    return left, top, width, height


def split_line_into_words(
    text: str, left: int, top: int, width: int, height: int, confidence: float
) -> list[dict[str, Any]]:
    tokens = text.strip().split()
    if len(tokens) >= 2 and PRICE_TOKEN.match(tokens[-1]):
        name_text = " ".join(tokens[:-1]).strip()
        price_text = tokens[-1]
        words: list[dict[str, Any]] = []
        price_width = max(36, int(width * 0.18))
        name_width = max(1, width - price_width - 4)
        if name_text:
            words.append(
                {
                    "text": name_text,
                    "left": left,
                    "top": top,
                    "width": name_width,
                    "height": height,
                    "confidence": confidence,
                }
            )
        words.append(
            {
                "text": price_text,
                "left": left + name_width + 4,
                "top": top,
                "width": price_width,
                "height": height,
                "confidence": confidence,
            }
        )
        return words

    return [
        {
            "text": text.strip(),
            "left": left,
            "top": top,
            "width": width,
            "height": height,
            "confidence": confidence,
        }
    ]


def normalize_poly(poly: Any) -> list[list[float]]:
    if hasattr(poly, "tolist"):
        poly = poly.tolist()
    return [[float(x), float(y)] for x, y in poly]


def extract_ocr_entries(result: Any) -> list[tuple[list[list[float]], str, float]]:
    """Support PaddleOCR 2.x list output and 3.x OCRResult dict output."""
    entries: list[tuple[list[list[float]], str, float]] = []

    if not result:
        return entries

    first = result[0] if isinstance(result, list) and result else result

    # PaddleOCR 3.x / PaddleX OCRResult
    if isinstance(first, dict) or hasattr(first, "get"):
        rec_texts = first.get("rec_texts") or []
        rec_scores = first.get("rec_scores") or []
        rec_polys = first.get("rec_polys") or first.get("dt_polys") or []
        for idx, text in enumerate(rec_texts):
            text = str(text).strip()
            if not text:
                continue
            poly = rec_polys[idx] if idx < len(rec_polys) else [[0, 0], [1, 0], [1, 1], [0, 1]]
            confidence = float(rec_scores[idx]) if idx < len(rec_scores) else 0.0
            entries.append((normalize_poly(poly), text, confidence))
        return entries

    # PaddleOCR 2.x: [ [box, (text, score)], ... ]
    if isinstance(first, list):
        for entry in first:
            if not entry or len(entry) < 2:
                continue
            box, payload = entry[0], entry[1]
            text = str(payload[0]).strip()
            confidence = float(payload[1]) if len(payload) > 1 else 0.0
            if text:
                entries.append((normalize_poly(box), text, confidence))

    return entries


def run_paddle_ocr(image: np.ndarray) -> tuple[str, list[dict[str, Any]]]:
    engine = get_ocr_engine()
    result = engine.predict(
        image,
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
    )

    entries = extract_ocr_entries(result)
    if not entries:
        return "", []

    lines: list[dict[str, Any]] = []
    raw_lines: list[str] = []

    for box, text, confidence in entries:
        left, top, width, height = box_to_rect(box)
        words = split_line_into_words(text, left, top, width, height, confidence)
        lines.append({"top": top, "words": words, "confidence": confidence})
        raw_lines.append(text)

    lines.sort(key=lambda row: row["top"])
    return "\n".join(raw_lines), lines


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "Receipt PaddleOCR",
        "status": "ok",
        "endpoints": "GET /health, POST /ocr",
        "app": "Open http://localhost:8085 to scan receipts",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ocr")
def ocr_endpoint(body: OcrRequest) -> dict[str, Any]:
    image = decode_image(body.imageBase64)
    raw_text, lines = run_paddle_ocr(image)
    return {"rawText": raw_text, "lines": lines}
