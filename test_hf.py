import requests
import base64

with open("assets/images/icon.png", "rb") as f:
    b64 = base64.b64encode(f.read()).decode("utf-8")

data = {
    "data": [
        f"data:image/png;base64,{b64}",
        0.5, # background_enhance
        0.5, # face_upsample
        1, # upsampling_res
        0.75, # codeformer_fidelity
    ]
}

res = requests.post("https://sczhou-codeformer.hf.space/run/predict", json=data)
print(res.status_code)
print(res.text[:200])
