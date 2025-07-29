from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="QR Virtual Card API",
    description="QR Virtual Card Backend API",
    version="1.0.0"
)

# CORS middleware ekliyoruz
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL'i
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "QR Virtual Card API'sine hoş geldiniz!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API çalışıyor"}

@app.get("/api/test")
async def test_endpoint():
    return {"data": "Test verisi", "success": True}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 