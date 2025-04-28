from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from deepface import DeepFace
import shutil
import os

app = FastAPI()

@app.post("/compare")
async def compare_faces(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    # Записваме файловете временно
    with open("temp1.jpg", "wb") as buffer1:
        shutil.copyfileobj(file1.file, buffer1)

    with open("temp2.jpg", "wb") as buffer2:
        shutil.copyfileobj(file2.file, buffer2)

    try:
        result = DeepFace.verify(img1_path="temp1.jpg", img2_path="temp2.jpg")

        # След сравнението, може да изтрием временните файлове
        os.remove("temp1.jpg")
        os.remove("temp2.jpg")

        return JSONResponse(content={
            "is_same_person": result["verified"],
            "distance": result["distance"]
        })

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
