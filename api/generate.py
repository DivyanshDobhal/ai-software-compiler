import os
import sys

# Add root folder to python path so services/ and routes/ resolve on Vercel.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402 — Vercel ASGI entrypoint
