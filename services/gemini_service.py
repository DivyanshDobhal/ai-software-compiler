import os
import time
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("GeminiService")

class GeminiService:
    @staticmethod
    def generate(prompt: str) -> str:
        """
        Queries Gemini API using the latest supported models with fallback recovery and active retries.
        Models tried:
        1. gemini-2.5-flash (Primary)
        2. gemini-2.5-pro (Fallback)
        
        Returns the clean text output from the model.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("Startup Failure: GEMINI_API_KEY not found in environment.")
            raise ValueError("GEMINI_API_KEY is not configured on the server.")

        primary_model = "gemini-2.5-flash"
        fallback_model = "gemini-2.5-pro"
        
        models_to_try = [primary_model, fallback_model]
        headers = {
            "Content-Type": "application/json"
        }

        last_error = None
        fallback_used = False

        for idx, model in enumerate(models_to_try):
            if idx > 0:
                fallback_used = True
                logger.warning(f"Primary model failed. Attempting fallback model: {model}")

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "responseMimeType": "application/json"
                }
            }

            # Retry loop for the current model
            max_retries = 3
            backoff_factor = 2.0
            
            for retry in range(max_retries):
                t_start = time.time()
                try:
                    logger.info(f"Dispatching query to model: {model} (Attempt {retry + 1}/{max_retries})")
                    response = requests.post(url, headers=headers, json=payload, timeout=90)
                    response_time_ms = int((time.time() - t_start) * 1000)

                    # Self-healing config for responseMimeType in case of unexpected model constraints
                    if response.status_code == 400 and ("responseMimeType" in response.text or "response_mime_type" in response.text):
                        logger.warning(f"responseMimeType not supported by {model}. Retrying without MimeType payload.")
                        if "generationConfig" in payload and "responseMimeType" in payload["generationConfig"]:
                            del payload["generationConfig"]["responseMimeType"]
                        t_start = time.time()
                        response = requests.post(url, headers=headers, json=payload, timeout=90)
                        response_time_ms = int((time.time() - t_start) * 1000)

                    if response.status_code == 200:
                        data = response.json()
                        
                        # Log response time and model details
                        logger.info(f"Successfully received response from {model}")
                        logger.info(f"Response Time: {response_time_ms}ms")
                        
                        # Extract token usage if available in the metadata
                        usage = data.get("usageMetadata", {})
                        prompt_tokens = usage.get("promptTokenCount", 0)
                        candidates_tokens = usage.get("candidatesTokenCount", 0)
                        total_tokens = usage.get("totalTokenCount", 0)
                        logger.info(f"Token Usage - Prompt: {prompt_tokens}, Candidates: {candidates_tokens}, Total: {total_tokens}")

                        # Extract candidate text parts
                        candidates = data.get("candidates", [])
                        if not candidates:
                            raise ValueError(f"Gemini API ({model}) returned empty candidates array.")

                        parts = candidates[0].get("content", {}).get("parts", [])
                        text_output = "".join([part.get("text", "") for part in parts])
                        
                        if not text_output.strip():
                            raise ValueError(f"Gemini API ({model}) returned empty text content.")

                        # Log successful fallback usage
                        if fallback_used:
                            logger.info(f"Fallback successful using model: {model}")

                        return text_output.strip()

                    # Handle Rate Limits (HTTP 429) or Server Errors (HTTP 5xx) with backoff
                    if response.status_code in [429, 500, 503]:
                        wait_time = backoff_factor ** retry
                        logger.warning(f"Model query failed ({model}) with status {response.status_code}. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        last_error = f"HTTP {response.status_code} ({model}): {response.text}"
                        continue

                    # For other non-200 errors (like 400, 404), do not retry, just capture and move on
                    error_detail = response.text
                    last_error = f"HTTP {response.status_code} ({model}): {error_detail}"
                    logger.error(f"Model query failed ({model}) with status {response.status_code}: {error_detail[:250]}")
                    break

                except requests.exceptions.RequestException as e:
                    wait_time = backoff_factor ** retry
                    last_error = f"Network Error ({model}): {str(e)}"
                    logger.error(f"Network error querying {model} on attempt {retry + 1}: {str(e)}")
                    if retry < max_retries - 1:
                        logger.info(f"Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                    continue

        # If both primary and fallback failed, raise a detailed RuntimeError
        logger.critical(f"All Gemini models failed. final error: {last_error}")
        raise RuntimeError("Gemini unavailable")

    @staticmethod
    def test_connection(model: str = "gemini-2.5-flash") -> bool:
        """
        Performs a minimal health check query to verify the API key and specific model existence.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return False
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": "Hello"}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 5
            }
        }
        
        try:
            response = requests.post(url, json=payload, timeout=8)
            return response.status_code == 200
        except Exception:
            return False
