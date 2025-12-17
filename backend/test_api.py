import requests
import json

url = "http://127.0.0.1:8000/predict/"

payload = {
  "Posesion_Local": 55.5,
  "Posesion_Visitante": 44.5,
  "Disparos_Totales_Local": 12,
  "Disparos_Totales_Visitante": 8,
  "Disparos_a_Puerta_Local": 5,
  "Disparos_a_Puerta_Visitante": 3,
  "Corners_Local": 6,
  "Corners_Visitante": 4
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, timeout=5)
    
    if response.status_code == 200:
        data = response.json()
        print("\nSUCCESS!")
        print(f"Predicción: {data.get('result')}")
        print(f"Accuracy: {data.get('accuracy')}")
    else:
        print(f"\nERROR {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"\nConnection failed: {e}")
    print("Make sure the backend is running on http://127.0.0.1:8000")
