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
    description="FastAPI-based multi-agent compiler backend utilizing Google Gemini API",
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

    logger.info("==================================================")
    logger.info("Initializing Startup Verification Tests for Gemini Integration...")
    
    # 1. Verify API Key exists
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("Startup Verification Failure: GEMINI_API_KEY is not configured in .env!")
        logger.info("==================================================")
        return
    logger.info("Startup Verification: GEMINI_API_KEY detected in environment.")

    # 2. Verify Gemini connection and selected models exist
    from services.gemini_service import GeminiService
    
    logger.info("Testing connection to primary model: gemini-2.5-flash...")
    flash_ok = GeminiService.test_connection("gemini-2.5-flash")
    if flash_ok:
        logger.info("Startup Verification Success: gemini-2.5-flash is ONLINE and responsive.")
    else:
        logger.error("Startup Verification Failure: gemini-2.5-flash is OFFLINE or unsupported!")

    logger.info("Testing connection to fallback model: gemini-2.5-pro...")
    pro_ok = GeminiService.test_connection("gemini-2.5-pro")
    if pro_ok:
        logger.info("Startup Verification Success: gemini-2.5-pro is ONLINE and responsive.")
    else:
        logger.error("Startup Verification Failure: gemini-2.5-pro is OFFLINE or unsupported!")
        
    logger.info("==================================================")

@app.get("/health/llm")
def health_llm():
    """
    Dynamically tests the connectivity to the Gemini models and reports back availability.
    """
    from services.gemini_service import GeminiService
    
    # First test primary model
    if GeminiService.test_connection("gemini-2.5-flash"):
        return {
            "provider": "Gemini",
            "model": "gemini-2.5-flash",
            "status": "online"
        }
    
    # Fallback status report
    if GeminiService.test_connection("gemini-2.5-pro"):
        return {
            "provider": "Gemini",
            "model": "gemini-2.5-pro",
            "status": "online"
        }
        
    return {
        "provider": "Gemini",
        "model": "gemini-2.5-flash",
        "status": "offline",
        "error": "All Gemini models are offline"
    }

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
