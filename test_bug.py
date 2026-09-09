import urllib.request
import json
import time

url = "https://olamicreas-pixhd-backend.hf.space"
img_url = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png"

req = urllib.request.Request(f"{url}/queue/join", method="POST", headers={"Content-Type": "application/json"}, data=json.dumps({
    "data": [{"path": img_url, "meta": {"_type": "gradio.FileData"}}, "ultra4k", 0.5],
    "fn_index": 0,
    "session_hash": "testbug123"
}).encode("utf-8"))
urllib.request.urlopen(req)

req2 = urllib.request.Request(f"{url}/queue/data?session_hash=testbug123", method="GET")
resp = urllib.request.urlopen(req2)
for line in resp:
    line_str = line.decode('utf-8').strip()
    if line_str:
        print(line_str)
