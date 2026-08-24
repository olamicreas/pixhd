import modal
import subprocess
import os
import shutil
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.responses import FileResponse

# 1. Define the Modal Docker Environment
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "libgl1-mesa-glx", "libglib2.0-0", "wget")
    .run_commands("git clone https://github.com/sczhou/CodeFormer.git /CodeFormer")
    .workdir("/CodeFormer")
    .pip_install("fastapi[standard]", "python-multipart", "uvicorn", "torch==2.3.1", "torchvision==0.18.1", "pillow-heif", "Pillow", "opencv-python==4.9.0.80", "opencv-python-headless==4.9.0.80", "numpy<2")
    .run_commands("pip install -r requirements.txt")
    .run_commands("python basicsr/setup.py develop")
    # Download FaceLib and CodeFormer models
    .run_commands("python scripts/download_pretrained_models.py facelib")
    .run_commands("python scripts/download_pretrained_models.py CodeFormer")
    # Download OpenCV Colorizer models
    .run_commands(
        "wget https://raw.githubusercontent.com/richzhang/colorization/caffe/colorization/models/colorization_deploy_v2.prototxt -O /colorization_deploy_v2.prototxt",
        "wget https://storage.openvinotoolkit.org/repositories/datumaro/models/colorization/colorization_release_v2.caffemodel -O /colorization_release_v2.caffemodel",
        "wget https://raw.githubusercontent.com/richzhang/colorization/caffe/colorization/resources/pts_in_hull.npy -O /pts_in_hull.npy"
    )
    # Download RealESRGAN model explicitly so it doesn't try to download at runtime (which would crash due to read-only FS)
    .run_commands(
        "wget -P experiments/pretrained_models https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
    )
)

app = modal.App("pixhd-backend")

web_app = FastAPI()

@web_app.post("/api/enhance-ultra")
async def enhance_ultra(file: UploadFile = File(...), mode: str = Form("ultra4k"), fidelity: float = Form(0.75)):
    input_dir = "/tmp/inputs"
    output_dir = "/tmp/outputs"
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)
    
    input_path = os.path.join(input_dir, file.filename)
    
    # Save uploaded file
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    import pillow_heif
    from PIL import Image
    pillow_heif.register_heif_opener()
    
    # CodeFormer requires JPG/PNG, so we convert ANY uploaded format (like HEIC from iPhones) to JPG
    converted_path = f"{input_path}.jpg"
    img = Image.open(input_path).convert("RGB")
    
    # CRITICAL SPEED OPTIMIZATION: Shrink base image to max 1280px to achieve 15-second generation times
    max_size = 1280
    if max(img.size) > max_size:
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
    img.save(converted_path, "JPEG", quality=95)
    
    basename = os.path.splitext(os.path.basename(converted_path))[0]
    final_output = os.path.join(output_dir, "final_results", f"{basename}.png")
    os.makedirs(os.path.dirname(final_output), exist_ok=True)
    
    if mode == "colorize":
        import cv2
        import numpy as np
        
        prototxt = "/colorization_deploy_v2.prototxt"
        caffemodel = "/colorization_release_v2.caffemodel"
        pts_path = "/pts_in_hull.npy"
        
        net = cv2.dnn.readNetFromCaffe(prototxt, caffemodel)
        pts = np.load(pts_path)
        
        class8 = net.getLayerId("class8_ab")
        conv8 = net.getLayerId("conv8_313_rh")
        pts = pts.transpose().reshape(2, 313, 1, 1)
        net.getLayer(class8).blobs = [pts.astype("float32")]
        net.getLayer(conv8).blobs = [np.full([1, 313], 2.606, dtype="float32")]
        
        image = cv2.imread(converted_path)
        scaled = image.astype("float32") / 255.0
        lab = cv2.cvtColor(scaled, cv2.COLOR_BGR2LAB)
        
        resized = cv2.resize(lab, (224, 224))
        L = cv2.split(resized)[0]
        L -= 50
        
        net.setInput(cv2.dnn.blobFromImage(L))
        ab = net.forward()[0, :, :, :].transpose((1, 2, 0))
        
        ab = cv2.resize(ab, (image.shape[1], image.shape[0]))
        L = cv2.split(lab)[0]
        colorized = np.concatenate((L[:, :, np.newaxis], ab), axis=2)
        colorized = cv2.cvtColor(colorized, cv2.COLOR_LAB2BGR)
        colorized = np.clip(colorized, 0, 1)
        colorized = (255 * colorized).astype("uint8")
        
        cv2.imwrite(final_output, colorized)
        
    else:
        cmd = [
            "python", "inference_codeformer.py",
            "-w", str(fidelity),
            "-i", converted_path,
            "-o", output_dir
        ]
        if mode == "ultra4k":
            cmd.extend(["--bg_upsampler", "realesrgan"])
            
        print(f"[PixHD Modal] Running on GPU: {' '.join(cmd)}")
        subprocess.run(cmd, check=True)
    
    from fastapi.responses import PlainTextResponse
    import base64
    from PIL import Image
    
    basename = os.path.splitext(os.path.basename(converted_path))[0]
    final_output = os.path.join(output_dir, "final_results", f"{basename}.png")
    
    # CRITICAL UI SPEED FIX: CodeFormer outputs massive 30MB PNG files for 4K images.
    # We convert it to a compressed JPEG before sending it over the network.
    # This reduces network transfer and React Native rendering time from 5 seconds to 0.1 seconds!
    final_jpeg = final_output.replace(".png", ".jpg")
    Image.open(final_output).convert("RGB").save(final_jpeg, "JPEG", quality=85)
    
    with open(final_jpeg, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        
    return PlainTextResponse(encoded_string)

@web_app.get("/api/health")
def health():
    return {"status": "ok", "gpu": "T4"}

@app.function(image=image, gpu="T4", timeout=300)
@modal.asgi_app()
def fastapi_app():
    return web_app
