import os
import requests
import json
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "crm_migration" / ".env"
load_dotenv(ENV_PATH)
TOKEN = os.getenv("ATTIO_API_TOKEN")

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# ID from previous output for "twenty" (secondary)
record_id = "d2ba3283-d350-42a3-bec4-730b20472fc7" 

url = f"https://api.attio.com/v2/objects/companies/records/{record_id}"
resp = requests.get(url, headers=headers)
print(json.dumps(resp.json(), indent=2))

