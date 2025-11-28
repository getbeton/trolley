import os
import requests
import json
import time
from dotenv import load_dotenv
from collections import defaultdict
from pathlib import Path

# Load env relative to this file so path survives repo restructuring.
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / "crm_migration" / ".env"
load_dotenv(ENV_PATH)

TOKEN = os.getenv("ATTIO_API_TOKEN")
API_BASE_URL = "https://api.attio.com/v2"

def get_headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def fetch_all_companies():
    print("Fetching all companies...")
    url = f"{API_BASE_URL}/objects/companies/records/query"
    records = []
    limit = 1000
    offset = 0
    
    while True:
        payload = {
            "limit": limit,
            "offset": offset,
            "sort": {
                "direction": "asc",
                "attribute": "created_at"
            }
        }
        
        try:
            resp = requests.post(url, headers=get_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
            batch = data.get("data", [])
            records.extend(batch)
            print(f"  Fetched {len(batch)} records...")
            
            if len(batch) < limit:
                break
            offset += limit
            
        except Exception as e:
            print(f"Error fetching companies: {e}")
            break
            
    return records

def update_company_domains(record_id, domains):
    """
    Update the domains of a company record.
    domains: list of domain strings (e.g. ['a.com', 'b.com'])
    """
    url = f"{API_BASE_URL}/objects/companies/records/{record_id}"
    
    # Construct payload for domains
    # Attio expects a list of objects with "domain" key
    domain_values = [{"domain": d} for d in domains]
    
    payload = {
        "data": {
            "values": {
                "domains": domain_values
            }
        }
    }
    
    print(f"  -> Updating {record_id} with domains: {domains}")
    try:
        resp = requests.patch(url, headers=get_headers(), json=payload)
        resp.raise_for_status()
        print("     [OK] Update successful")
        return True
    except Exception as e:
        print(f"     [ERR] Update failed: {e}")
        if hasattr(e, 'response') and e.response:
             print(f"     Response: {e.response.text}")
        return False

def delete_record(record_id):
    url = f"{API_BASE_URL}/objects/companies/records/{record_id}"
    print(f"  -> Deleting duplicate record {record_id}...")
    try:
        resp = requests.delete(url, headers=get_headers())
        resp.raise_for_status()
        print("     [OK] Delete successful")
        return True
    except Exception as e:
        print(f"     [ERR] Delete failed: {e}")
        return False

def main():
    if not TOKEN:
        print("Error: ATTIO_API_TOKEN not found.")
        return

    records = fetch_all_companies()
    
    # Group by Name
    name_map = defaultdict(list)
    for r in records:
        rid = r['id']['record_id']
        values = r.get('values', {})
        
        # Get Name
        name_vals = values.get('name', [])
        name = name_vals[0].get('value') if name_vals else None
        
        if not name:
            continue
            
        # Get Domains
        domains = []
        domain_vals = values.get('domains', [])
        for d in domain_vals:
            if d.get('domain'):
                domains.append(d.get('domain'))
        
        name_map[name.lower()].append({
            "id": rid,
            "name": name,
            "domains": domains,
            "created_at": r.get('created_at')
        })
    
    # Filter for duplicates
    duplicates = {n: recs for n, recs in name_map.items() if len(recs) > 1}
    
    print(f"\nFound {len(duplicates)} groups to merge.\n")
    
    for name, recs in duplicates.items():
        print(f"Merging '{name}' ({len(recs)} records)...")
        
        # Sort by creation date (oldest first)
        # They should be sorted from fetch, but ensuring it here
        recs.sort(key=lambda x: x['created_at'])
        
        master = recs[0]
        others = recs[1:]
        
        print(f"  Master: {master['id']} (Created: {master['created_at']})")
        print(f"  Others: {', '.join([o['id'] for o in others])}")
        
        # Aggregate Domains
        all_domains = set(master['domains'])
        for o in others:
            all_domains.update(o['domains'])
        
        final_domains = list(all_domains)
        
        print(f"  -> Consolidated domains: {final_domains}")
        
        # STRATEGY CHANGE: Attio enforces unique domains.
        # We must DELETE the secondary records first to free up their domains.
        
        # 1. Delete Others
        delete_success = True
        for o in others:
            if not delete_record(o['id']):
                delete_success = False
                print("     [WARN] Failed to delete a secondary record. Aborting update to prevent data loss or conflicts.")
                break
            # Rate limit safety
            time.sleep(0.5)
            
        if not delete_success:
            continue
            
        # 2. Update Master
        # We need to wait a moment for consistency?
        time.sleep(1.0)
        
        if update_company_domains(master['id'], final_domains):
             print("     [SUCCESS] Merge complete.")
        else:
             print("     [ERR] Failed to update master. Domains from deleted records might need manual restoration.")
            
        print("-" * 30)

if __name__ == "__main__":
    main()
