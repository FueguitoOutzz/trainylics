import urllib.request, urllib.error

try:
    response = urllib.request.urlopen('http://127.0.0.1:8000/predict/next-match/23cc6c44-b1f1-4b01-bddb-fb981584d018')
    print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print("Error:", e.read().decode())
except Exception as e:
    print("Exception:", str(e))
