from mcp.server.fastmcp import FastMCP
import os
import requests
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "crm_migration", ".env"))

ATTIO_API_TOKEN = os.getenv("ATTIO_API_TOKEN")
API_BASE_URL = "https://api.attio.com/v2"

if not ATTIO_API_TOKEN:
    raise ValueError("ATTIO_API_TOKEN not found in environment variables")

# Initialize FastMCP server
mcp = FastMCP("attio-server")

def get_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {ATTIO_API_TOKEN}",
        "Content-Type": "application/json"
    }

@mcp.tool()
def attio_list_objects() -> str:
    """List all available objects in the Attio workspace."""
    url = f"{API_BASE_URL}/objects"
    response = requests.get(url, headers=get_headers())
    response.raise_for_status()
    data = response.json()
    
    # Format output
    objects = data.get("data", [])
    output = "Available Attio Objects:\n"
    for obj in objects:
        output += f"- {obj['api_slug']} (ID: {obj['id']['object_id']})\n"
    return output

@mcp.tool()
def attio_create_person(
    full_name: str, 
    email: str, 
    job_title: Optional[str] = None, 
    company: Optional[str] = None,
    linkedin: Optional[str] = None
) -> str:
    """Create a new person record in Attio."""
    url = f"{API_BASE_URL}/objects/people/records"
    
    # Construct payload
    values = {
        "name": [{"full_name": full_name}],
        "email_addresses": [{"email_address": email}]
    }
    
    if job_title:
        values["job_title"] = [{"value": job_title}]
    
    if linkedin:
        values["linkedin"] = [{"value": linkedin}]
        
    # Note: Company is a relationship link, requires ID lookup, skipping for simple version
    
    payload = {"data": {"values": values}}
    
    # Use PUT for upsert logic (match on email)
    response = requests.put(
        url, 
        headers=get_headers(), 
        json=payload, 
        params={"matching_attribute": "email_addresses"}
    )
    
    if response.status_code not in [200, 201]:
        return f"Error creating person: {response.text}"
        
    data = response.json()
    record_id = data.get("data", {}).get("id", {}).get("record_id", "unknown")
    return f"Successfully created/updated person: {full_name} (ID: {record_id})"

@mcp.tool()
def attio_get_record(object_slug: str, record_id: str) -> str:
    """Get details of a specific record."""
    url = f"{API_BASE_URL}/objects/{object_slug}/records/{record_id}"
    response = requests.get(url, headers=get_headers())
    
    if response.status_code != 200:
        return f"Error fetching record: {response.text}"
        
    return str(response.json())

if __name__ == "__main__":
    mcp.run()

