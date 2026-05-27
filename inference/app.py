from fastapi import FastAPI, UploadFile, File
from ultralytics import YOLO
import shutil
import cv2
import os

app = FastAPI()

model = YOLO("yolo11n-pose.pt")

cap = cv2.VideoCapture()

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_video(file:UploadFile = File(...)):
    save_path = f"{UPLOAD_DIR}/{file.filename}"
    with open(save_path,"wb") as buffer:
        shutil.copyfileobj(file.file,buffer)

    cap = cv2.VideoCapture(save_path)

    while True:
        success, frame = cap.read()

        if not success:
            break

        results = model(frame)
        annotated_frame = results[0].plot()
        cv2.imshow("Pose Detection", annotated_frame)
        if cv2.waitKey(1) == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

    return {
        "success": True,
        "save_to": save_path
    }