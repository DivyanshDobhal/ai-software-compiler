import logging
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NvidiaService")


class NvidiaService:
    API_URL = os.getenv("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions")
    MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")

    @staticmethod
    def generate(prompt: str) -> str:
        api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key:
            raise ValueError("NVIDIA_API_KEY is not configured on the server.")

        on_vercel = bool(os.getenv("VERCEL"))
        max_retries = 1 if on_vercel else 3
        timeout = 25 if on_vercel else 90
        last_error = None

        for attempt in range(max_retries):
            started_at = time.time()
            try:
                response = requests.post(
                    NvidiaService.API_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": NvidiaService.MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2,
                        "max_tokens": 8192,
                        "stream": False,
                    },
                    timeout=timeout,
                )
                elapsed_ms = int((time.time() - started_at) * 1000)
                if response.ok:
                    payload = response.json()
                    text = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if isinstance(text, list):
                        text = "".join(part.get("text", "") for part in text if isinstance(part, dict))
                    if not str(text).strip():
                        raise RuntimeError("NVIDIA returned an empty completion.")
                    logger.info("NVIDIA completion succeeded (%s) in %sms", NvidiaService.MODEL, elapsed_ms)
                    return str(text).strip()

                last_error = f"HTTP {response.status_code}: {response.text[:300]}"
                if response.status_code not in (429, 500, 502, 503, 504):
                    break
            except requests.exceptions.RequestException as error:
                last_error = f"Network error: {error}"

            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)

        logger.error("NVIDIA completion failed: %s", last_error)
        raise RuntimeError("NVIDIA unavailable")

    @staticmethod
    def test_connection(model: str | None = None) -> bool:
        api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key:
            return False
        try:
            response = requests.post(
                NvidiaService.API_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model or NvidiaService.MODEL,
                    "messages": [{"role": "user", "content": "Reply with OK."}],
                    "max_tokens": 8,
                    "stream": False,
                },
                timeout=15,
            )
            return response.ok and bool(response.json().get("choices"))
        except Exception:
            return False
