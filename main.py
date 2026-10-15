import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.generate import router as generate_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(
    title="AI Compiler Studio Backend",
    description="FastAPI-based multi-agent compiler backend utilizing NVIDIA NIM",
    version="1.0.0"
)

# Configure CORS so Vite frontend on port 5173 (or others) can connect seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount generate endpoints under both standard paths to support all routing variations
app.include_router(generate_router, tags=["Generate"])
app.include_router(generate_router, prefix="/api", tags=["Generate (API)"])

@app.on_event("startup")
def startup_verification():
    if os.getenv("VERCEL"):
        logger.info("Running on Vercel — skipping local startup verification.")
        return

    logger.info("Initializing startup verification for NVIDIA NIM integration.")
    if not os.getenv("NVIDIA_API_KEY"):
        logger.error("NVIDIA_API_KEY is not configured in .env.")
        return

    from services.nvidia_service import NvidiaService
    model = os.getenv("NVIDIA_MODEL", NvidiaService.MODEL)
    if NvidiaService.test_connection(model):
        logger.info("NVIDIA model %s is online and responsive.", model)
    else:
        logger.error("NVIDIA model %s is offline or unsupported.", model)


@app.get("/health/llm")
def health_llm():
    """Check connectivity to the configured NVIDIA NIM model."""
    from services.nvidia_service import NvidiaService

    model = os.getenv("NVIDIA_MODEL", NvidiaService.MODEL)
    online = NvidiaService.test_connection(model)
    result = {"provider": "NVIDIA", "model": model, "status": "online" if online else "offline"}
    if not online:
        result["error"] = "NVIDIA model is unavailable or NVIDIA_API_KEY is not configured"
    return result

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI Compiler Studio Backend",
        "stage": "production",
        "agents": ["IntentAgent", "DesignAgent", "SchemaAgent", "Validator", "RepairAgent"]
    }

# Also support '/api/compile' as an alias endpoint to the main generate route
# This guarantees 100% backwards compatibility with zero frontend breaks
@app.post("/api/compile")
def compile_alias(payload: dict):
    # Map 'prompt' argument to the generate pipeline
    from routes.generate import GenerateRequest, generate_application
    req = GenerateRequest(prompt=payload.get("prompt", ""))
    return generate_application(req)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
