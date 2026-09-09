import requests
import json
import time

url = "https://olamicreas-pixhd-backend.hf.space"
# First we need to get a valid image to test with
img_url = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png"

# Upload to get a file path
# Actually we can just pass the URL in gradio 4
print("Joining queue...")
res = requests.post(f"{url}/gradio_api/call/predict", json={
    "data": [
        {"path": img_url, "meta": {"_type": "gradio.FileData"}},
        "ultra4k",
        0.5
    ]
})
print("Queue join:", res.status_code, res.text)
event_id = res.json()["event_id"]

print("Polling...")
# requests handles the stream
s = requests.Session()
with s.get(f"{url}/gradio_api/call/predict/{event_id}", stream=True) as r:
    for line in r.iter_lines():
        if line:
            print(line.decode('utf-8'))
