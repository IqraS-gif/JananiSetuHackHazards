import requests
import sys

try:
    resp = requests.get('http://127.0.0.1:4040/api/tunnels')
    resp.raise_for_status()
    data = resp.json()
    for tunnel in data['tunnels']:
        print(f"Name: {tunnel['name']}")
        print(f"Public URL: {tunnel['public_url']}")
        print(f"Config: {tunnel['config']}")
except Exception as e:
    print(f"Error: {e}")
