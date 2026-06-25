# PaddleOCR receipt service

Self-hosted OCR for the grocery receipt pipeline. Returns the same layout shape the app expects (`rawText` + word boxes per line).

## Quick start (Docker — recommended)

```bash
cd services/paddleocr-server
docker build -t receipt-paddleocr .
docker run --rm -p 8089:8089 receipt-paddleocr
```

Health check: `GET http://localhost:8089/health`

## Local Python (CPU)

```bash
cd services/paddleocr-server
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8089
```

First run downloads PaddleOCR models (~100MB+).

## Wire into the Expo app

Add to `.env`:

```env
PADDLEOCR_API_URL=http://localhost:8089
```

Restart the Expo dev server. The receipt parse API will call PaddleOCR first and fall back to OCR.space if the service is down.

## API

### `POST /ocr`

Request:

```json
{ "imageBase64": "<jpeg base64 or data:image/jpeg;base64,...>" }
```

Response:

```json
{
  "rawText": "RIBEYE STEAK PK 44.61\n...",
  "lines": [
    {
      "top": 120,
      "confidence": 0.97,
      "words": [
        { "text": "RIBEYE STEAK PK", "left": 40, "top": 120, "width": 180, "height": 22, "confidence": 0.97 },
        { "text": "44.61", "left": 220, "top": 120, "width": 48, "height": 22, "confidence": 0.97 }
      ]
    }
  ]
}
```

## Environment

| Variable | Default | Description |
|---|---|---|
| `PADDLEOCR_LANG` | `en` | PaddleOCR language pack |
| `PADDLEOCR_USE_GPU` | `false` | Set `true` when CUDA is available |

## Notes

- PaddleOCR is **Python-only** — it runs beside the Expo app, not inside it.
- GPU speeds up high volume; CPU is fine for personal/dev use.
- On Apple Silicon / Windows without Docker, prefer Docker or WSL2 for easiest installs.
