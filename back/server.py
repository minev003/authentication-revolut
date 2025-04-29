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
# CORS настройка
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Параметри на моделите
DETECTOR_BACKEND = "retinaface"
MODEL_NAME = "ArcFace"
# Затопляме модела при стартиране
_ = DeepFace.build_model(MODEL_NAME)
logger.info(f"{MODEL_NAME} model loaded")

# Функция за откриване на точно едно лице
def detect_single_face(path: str) -> bool:
    try:
        faces = DeepFace.extract_faces(
            img_path=path,
            detector_backend=DETECTOR_BACKEND,
            enforce_detection=True
        )
        return len(faces) == 1
    except Exception as e:
        logger.error(f"Face detection error: {e}", exc_info=True)
        return False

# Функция за ресайз на изображението
def resize_image(path: str, max_dim: int = 1024):
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
    logger.info(
        f"Verify request: front={idCardFront.filename}, back={idCardBack.filename}, selfie={selfie.filename}"
    )
    try:
        with TemporaryDirectory() as temp_dir:
            front_path = os.path.join(temp_dir, idCardFront.filename)
            back_path  = os.path.join(temp_dir, idCardBack.filename)
            selfie_path = os.path.join(temp_dir, selfie.filename)

            # Записваме файловете
            with open(front_path, 'wb') as f_front:
                shutil.copyfileobj(idCardFront.file, f_front)
            with open(back_path, 'wb') as f_back:
                shutil.copyfileobj(idCardBack.file, f_back)
            with open(selfie_path, 'wb') as f_selfie:
                shutil.copyfileobj(selfie.file, f_selfie)

            # Ресайз
            resize_image(front_path)
            resize_image(selfie_path)

            # Детекция на лице
            if not detect_single_face(front_path):
                return {"verified": False, "error": "Не е открито едно лице в документа"}
            if not detect_single_face(selfie_path):
                return {"verified": False, "error": "Не е открито едно лице в селфито"}

            # Изчисляваме ембединг
            rep_front = DeepFace.represent(
                img_path=front_path,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )[0]['embedding']
            rep_selfie = DeepFace.represent(
                img_path=selfie_path,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )[0]['embedding']

            # Ръчно Cosine distance
            dist = 1 - np.dot(rep_front, rep_selfie) / (np.linalg.norm(rep_front) * np.linalg.norm(rep_selfie))
            dist = float(dist)
            threshold = 0.40  # праг за ArcFace
            verified = dist <= threshold
            logger.info(f"Distance={dist:.4f}, threshold={threshold}, verified={verified}")(f"Distance={dist:.4f}, threshold={threshold}, verified={verified}")

            return {"verified": verified, "distance": dist, "threshold": threshold}
    except Exception as e:
        logger.error(f"Verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Грешка при верификацията: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000
    )
