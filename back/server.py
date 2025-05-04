import os
import shutil
import logging
import time
from tempfile import TemporaryDirectory

import cv2
from deepface import DeepFace
from fastapi import FastAPI, File, UploadFile, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Identity Verification API - Max Speed CPU Attempt (Known Issues)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"Total request time for {request.method} {request.url.path}: {process_time:.4f} seconds")
    return response

MODEL_NAME = "SFace"
DETECTOR_BACKEND = "mtcnn"
DISTANCE_METRIC = "cosine"

DUMMY_IMAGE_PATH = "dummy.jpg"
try:
    logger.info(f"Building DeepFace model '{MODEL_NAME}'...")
    _ = DeepFace.build_model(MODEL_NAME)
    logger.info(f"Model '{MODEL_NAME}' built successfully.")
    try:
        if os.path.exists(DUMMY_IMAGE_PATH):
            logger.info(f"Pre-loading detector '{DETECTOR_BACKEND}'...")
            _ = DeepFace.extract_faces(DUMMY_IMAGE_PATH, detector_backend=DETECTOR_BACKEND, enforce_detection=False)
            logger.info(f"Detector '{DETECTOR_BACKEND}' pre-loaded.")
        else:
            logger.warning(f"'{DUMMY_IMAGE_PATH}' not found.")
    except Exception as detector_load_err:
        logger.warning(f"Could not pre-load detector '{DETECTOR_BACKEND}': {detector_load_err}")
except Exception as e:
    logger.error(f"FATAL: Failed to build DeepFace model '{MODEL_NAME}': {e}", exc_info=True)

def resize_image(path: str, max_dim: int = 480, quality: int = 80) -> bool:
    try:
        img = cv2.imread(path)
        if img is None:
            return False
        h, w = img.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            try:
                resized = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            except:
                return False
        else:
            resized = img
        os.makedirs(os.path.dirname(path), exist_ok=True)
        success = cv2.imwrite(path, resized, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        if success:
            logger.info(f"Image resized/saved (small): {path}")
        else:
            logger.error(f"imwrite failed: {path}")
        return success
    except Exception as e:
        logger.error(f"Error in resize_image for {path}: {e}", exc_info=True)
        return False

@app.get("/", tags=["Status"])
def read_root():
    return {"message": "Verification server is running (Max Speed CPU - Known Issues)"}

@app.post("/verify", tags=["Verification"])
async def verify_identity(
    idCardFront: UploadFile = File(..., description="Снимка на предната част на личната карта"),
    idCardBack: UploadFile = File(...),
    selfie: UploadFile = File(..., description="Селфи снимка на потребителя")
):
    front_ext = os.path.splitext(idCardFront.filename)[1].lower() if idCardFront.filename else ".jpg"
    selfie_ext = os.path.splitext(selfie.filename)[1].lower() if selfie.filename else ".jpg"
    back_ext = os.path.splitext(idCardBack.filename)[1].lower() if idCardBack.filename else ".jpg"
    allowed_extensions = {".jpg", ".jpeg", ".png"}

    if front_ext not in allowed_extensions or selfie_ext not in allowed_extensions or back_ext not in allowed_extensions:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"status": "error", "code": "INVALID_FILE_TYPE", "message": "Невалиден тип файл."})

    timestamp = int(time.time())
    safe_front_name = f"front_{timestamp}{front_ext}"
    safe_selfie_name = f"selfie_{timestamp}{selfie_ext}"
    safe_back_name = f"back_{timestamp}{back_ext}"

    logger.info(f"Processing request Max Speed CPU. Originals: ID Front='{idCardFront.filename}', Selfie='{selfie.filename}'")

    with TemporaryDirectory() as tmp_dir:
        front_path = os.path.join(tmp_dir, safe_front_name)
        selfie_path = os.path.join(tmp_dir, safe_selfie_name)
        back_path = os.path.join(tmp_dir, safe_back_name)

        try:
            with open(front_path, "wb") as f:
                shutil.copyfileobj(idCardFront.file, f)
            with open(back_path, "wb") as f:
                shutil.copyfileobj(idCardBack.file, f)
            with open(selfie_path, "wb") as f:
                shutil.copyfileobj(selfie.file, f)
        except Exception as e:
            logger.error(f"Error saving files: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"status": "error", "code": "FILE_SAVE_ERROR", "message": "Грешка при запис."})
        finally:
            try:
                await idCardFront.close()
                await idCardBack.close()
                await selfie.close()
            except Exception:
                pass

        if not resize_image(front_path):
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"status": "error", "code": "IMAGE_PROCESSING_ERROR", "field": "idCardFront", "message": "Грешка обработка ЛК-лице."})
        if not resize_image(selfie_path):
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"status": "error", "code": "IMAGE_PROCESSING_ERROR", "field": "selfie", "message": "Грешка обработка селфи."})

        try:
            start_verify_time = time.time()
            logger.info(f"Performing direct verification (model={MODEL_NAME}, detector={DETECTOR_BACKEND})...")
            result = DeepFace.verify(
                img1_path=front_path,
                img2_path=selfie_path,
                model_name=MODEL_NAME,
                detector_backend=DETECTOR_BACKEND,
                distance_metric=DISTANCE_METRIC,
                enforce_detection=True,
                align=True
            )
            verify_time = time.time() - start_verify_time
            result['verify_time'] = round(verify_time, 4)
            logger.info(f"DeepFace.verify step took: {verify_time:.4f} seconds. Result: {result}")

            try:
                model_threshold = DeepFace.verification.find_threshold(MODEL_NAME, DISTANCE_METRIC)
            except:
                model_threshold = 0.593

            calculated_distance = result.get("distance", 999)
            logger.info(f"Verification details: Distance={calculated_distance:.4f}, Threshold={model_threshold:.4f}")

            if result.get("verified", False):
                return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "success", "verified": True, "distance": round(calculated_distance, 4), "threshold": round(model_threshold, 4), "model": MODEL_NAME, "detector": DETECTOR_BACKEND})
            else:
                return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"status": "error", "code": "FACE_MISMATCH", "message": "Лицата не съвпадат.", "distance": round(calculated_distance, 4), "threshold": round(model_threshold, 4)})

        except ValueError as ve:
            error_msg_str = str(ve).lower()
            logger.warning(f"ValueError during DeepFace.verify (likely no face): {error_msg_str}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "status": "error",
                    "code": "NO_FACE_DETECTED",
                    "message": "Не е открито лице в едно от изображенията (или качеството е твърде ниско)."
                }
            )
        except Exception as e:
            logger.error(f"Unexpected error during DeepFace.verify execution: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"status": "error", "code": "VERIFICATION_ERROR", "message": "Вътрешна грешка при сравняване."})

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server for local development (Max Speed CPU - Known Issues)...")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
