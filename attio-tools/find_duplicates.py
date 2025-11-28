import os
import requests
import json
import pandas as pd
from dotenv import load_dotenv
from collections import defaultdict
from pathlib import Path

# Load env relative to this file so the script keeps working when moved.
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

def fetch_all_records(object_slug):
    print(f"Fetching all {object_slug}...")
    url = f"{API_BASE_URL}/objects/{object_slug}/records/query"
    records = []
    limit = 1000
    offset = 0
    
    # Using specific query structure for Attio V2
    # It usually supports cursor pagination or offset/limit depending on the endpoint.
    # The /query endpoint often uses "limit" and "offset" inside the body.
    
    while True:
        payload = {
            "limit": limit,
            "offset": offset
        }
        
        try:
            resp = requests.post(url, headers=get_headers(), json=payload)
            resp.raise_for_status()
            data = resp.json()
            batch = data.get("data", [])
            records.extend(batch)
            
            print(f"  Fetched {len(batch)} records (Total: {len(records)})")
            
            if len(batch) < limit:
                break
            
            offset += limit
            
        except Exception as e:
            print(f"Error fetching {object_slug}: {e}")
            if hasattr(e, 'response') and e.response:
                print(e.response.text)
            break
            
    return records

def process_people(records):
    print("\nProcessing People...")
    email_map = defaultdict(list)
    
    for r in records:
        rid = r['id']['record_id']
        values = r.get('values', {})
        
        # Extract Name
        full_name = "Unknown"
        name_vals = values.get('name', [])
        if name_vals:
            full_name = name_vals[0].get('full_name', 'Unknown')
            
        # Extract Emails
        emails = []
        email_vals = values.get('email_addresses', [])
        for e in email_vals:
            addr = e.get('email_address')
            if addr:
                emails.append(addr.lower())
        
        for e in emails:
            email_map[e].append({
                "id": rid,
                "name": full_name,
                "emails": emails,
                "created_at": r.get('created_at')
            })
            
    duplicates = {e: recs for e, recs in email_map.items() if len(recs) > 1}
    return duplicates

def process_companies(records):
    print("\nProcessing Companies...")
    domain_map = defaultdict(list)
    name_map = defaultdict(list)
    
    for r in records:
        rid = r['id']['record_id']
        values = r.get('values', {})
        
        # Extract Name
        name = "Unknown"
        name_vals = values.get('name', [])
        if name_vals:
            name = name_vals[0].get('value', 'Unknown')
            
        # Extract Domains
        domains = []
        domain_vals = values.get('domains', [])
        for d in domain_vals:
            dom = d.get('domain')
            if dom:
                domains.append(dom.lower())
                
        for d in domains:
            domain_map[d].append({
                "id": rid,
                "name": name,
                "domains": domains,
                "created_at": r.get('created_at')
            })
            
        if name and name != "Unknown":
            name_map[name.lower()].append({
                "id": rid,
                "name": name,
                "domains": domains,
                "created_at": r.get('created_at')
            })

    dup_domains = {d: recs for d, recs in domain_map.items() if len(recs) > 1}
    dup_names = {n: recs for n, recs in name_map.items() if len(recs) > 1}
    
    return dup_domains, dup_names

def main():
    if not TOKEN:
        print("Error: ATTIO_API_TOKEN not found.")
        return

    # Fetch Data
    people = fetch_all_records("people")
    companies = fetch_all_records("companies")
    
    # Find Duplicates
    dup_people = process_people(people)
    dup_comp_domains, dup_comp_names = process_companies(companies)
    
    # Report
    print("\n" + "="*50)
    print("DUPLICATE REPORT")
    print("="*50)
    
    with open("duplicates_report.txt", "w") as f:
        f.write("DUPLICATE REPORT\n================\n\n")
        
        # PEOPLE
        msg = f"Found {len(dup_people)} email addresses with duplicate People records."
        print(f"\nPEOPLE: {msg}")
        f.write(f"PEOPLE: {msg}\n")
        if dup_people:
            f.write("-" * 40 + "\n")
            for email, recs in dup_people.items():
                line = f"\nEmail: {email} ({len(recs)} records)"
                print(line)
                f.write(line + "\n")
                
                # Sort by creation time (keep oldest? user decides)
                recs.sort(key=lambda x: x['created_at'])
                
                for r in recs:
                    info = f"  - ID: {r['id']} | Name: {r['name']} | Created: {r['created_at']}"
                    print(info)
                    f.write(info + "\n")
        
        # COMPANIES (DOMAINS)
        msg = f"Found {len(dup_comp_domains)} domains with duplicate Company records."
        print(f"\nCOMPANIES (BY DOMAIN): {msg}")
        f.write(f"\n\nCOMPANIES (BY DOMAIN): {msg}\n")
        if dup_comp_domains:
            f.write("-" * 40 + "\n")
            for domain, recs in dup_comp_domains.items():
                line = f"\nDomain: {domain} ({len(recs)} records)"
                print(line)
                f.write(line + "\n")
                
                recs.sort(key=lambda x: x['created_at'])
                for r in recs:
                    info = f"  - ID: {r['id']} | Name: {r['name']} | Created: {r['created_at']}"
                    print(info)
                    f.write(info + "\n")

        # COMPANIES (NAMES)
        # Filter out name dups that are already caught by domain to avoid noise?
        # Often helpful to see both.
        msg = f"Found {len(dup_comp_names)} names with duplicate Company records."
        print(f"\nCOMPANIES (BY NAME): {msg}")
        f.write(f"\n\nCOMPANIES (BY NAME): {msg}\n")
        if dup_comp_names:
            f.write("-" * 40 + "\n")
            for name, recs in dup_comp_names.items():
                # Check if these records were already listed in domain dups?
                # It's complex to dedup the report perfectly, listing them is safer.
                line = f"\nName: {name} ({len(recs)} records)"
                print(line)
                f.write(line + "\n")
                
                recs.sort(key=lambda x: x['created_at'])
                for r in recs:
                    info = f"  - ID: {r['id']} | Domains: {r['domains']} | Created: {r['created_at']}"
                    print(info)
                    f.write(info + "\n")

    print(f"\nFull report saved to 'duplicates_report.txt'")

if __name__ == "__main__":
    main()

