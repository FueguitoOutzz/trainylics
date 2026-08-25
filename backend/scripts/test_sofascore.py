from curl_cffi import requests

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

tournament_id = 18834 # Liga de Segunda
url = f"https://www.sofascore.com/api/v1/unique-tournament/{tournament_id}/seasons"

try:
    r = requests.get(url, headers=headers, impersonate="chrome", timeout=15)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        seasons = r.json().get("seasons", [])
        for s in seasons:
            print(f"Season ID: {s.get('id')}, Name: {s.get('name')}, Year: {s.get('year')}")
    else:
        print(f"Response: {r.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
