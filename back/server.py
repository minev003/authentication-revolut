from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.logger import logger
from tempfile import TemporaryDirectory
import shutil
import os
import cv2
import numpy as np
from deepface import DeepFace

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DETECTOR_BACKEND = "retinaface"
MODEL_NAME = "ArcFace"

# Зареждаме модела еднократно
_ = DeepFace.build_model(MODEL_NAME)
logger.info(f"{MODEL_NAME} model loaded")

def detect_face(path: str) -> bool:
    """
    Връща True ако DeepFace открие поне едно лице в изображението.
    """
    try:
        faces = DeepFace.extract_faces(
            img_path=path,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True
        )
        return len(faces) >= 1
    except Exception as e:
        logger.error(f"Face detection error: {e}", exc_info=True)
        return False

def resize_image(path: str, max_dim: int = 1024):
    """
    Намалява изображението до max_dim пиксела по-голямата страна,
    JPEG качество 80%.
    """
    img = cv2.imread(path)
    if img is None:
        return
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        resized = cv2.resize(img, (int(w * scale), int(h * scale)))
        cv2.imwrite(path, resized, [int(cv2.IMWRITE_JPEG_QUALITY), 80])

@app.get("/")
def read_root():
    return {"message": "Server is running"}

@app.post("/verify")
async def verify(
    idCardFront: UploadFile = File(...),
    idCardBack:  UploadFile = File(...),
    selfie:      UploadFile = File(...)
):
    logger.info(f"Received verify request: front={idCardFront.filename}, back={idCardBack.filename}, selfie={selfie.filename}")
    try:
        with TemporaryDirectory() as tmp:
            # Пътища за трите качени файла
            front_path = os.path.join(tmp, idCardFront.filename)
            back_path  = os.path.join(tmp, idCardBack.filename)
            selfie_path= os.path.join(tmp, selfie.filename)

            # Записваме файловете на диск
            for upload_file, path in [
                (idCardFront, front_path),
                (idCardBack,  back_path),
                (selfie,      selfie_path)
            ]:
                with open(path, "wb") as f:
                    shutil.copyfileobj(upload_file.file, f)

            # Ресайзваме предна страна и селфито
            resize_image(front_path)
            resize_image(selfie_path)

            # 1) Проверка: има ли лице в предната снимка на документа?
            if not detect_face(front_path):
                return {"verified": False, "error": "Не е открито лице в документа"}

            # 2) Проверка: има ли лице в селфито?
            if not detect_face(selfie_path):
                return {"verified": False, "error": "Не е открито лице в селфито"}

            # 3) Ембединг на лицата
            emb_front = DeepFace.represent(
                img_path=front_path,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )[0]["embedding"]
            emb_selfie = DeepFace.represent(
                img_path=selfie_path,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )[0]["embedding"]

            # 4) Косинусово разстояние
            dist = 1 - np.dot(emb_front, emb_selfie) / (np.linalg.norm(emb_front) * np.linalg.norm(emb_selfie))
            dist = float(dist)
            threshold = 0.40
            verified = dist <= threshold

            logger.info(f"Distance={dist:.4f}, threshold={threshold}, verified={verified}")

            # 5) Връщаме резултата
            if not verified:
                return {"verified": False, "error": "Лицата не съвпадат"}
            return {"verified": True, "error": None}

    except Exception as e:
        logger.error(f"Verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Грешка при верификацията: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000)
