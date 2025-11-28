#!/usr/bin/env python3
import os
import sys
import json
import requests
import click
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

# Initialize Rich console
console = Console()

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "crm_migration", ".env"))

ATTIO_API_TOKEN = os.getenv("ATTIO_API_TOKEN")
API_BASE_URL = "https://api.attio.com/v2"

if not ATTIO_API_TOKEN:
    console.print("[red]Error: ATTIO_API_TOKEN not found in .env file[/red]")
    sys.exit(1)

def get_headers():
    return {
        "Authorization": f"Bearer {ATTIO_API_TOKEN}",
        "Content-Type": "application/json"
    }

@click.group()
def cli():
    """Attio CRM CLI Tool"""
    pass

@cli.command()
def list_objects():
    """List all available objects in Attio."""
    url = f"{API_BASE_URL}/objects"
    try:
        response = requests.get(url, headers=get_headers())
        response.raise_for_status()
        data = response.json()
        
        table = Table(title="Attio Objects")
        table.add_column("Slug", style="cyan")
        table.add_column("Object ID", style="green")
        table.add_column("Singular", style="magenta")
        table.add_column("Plural", style="magenta")
        
        for obj in data.get("data", []):
            table.add_row(
                obj['api_slug'],
                obj['id']['object_id'],
                obj.get('singular_noun', '-'),
                obj.get('plural_noun', '-')
            )
            
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]Error fetching objects: {str(e)}[/red]")

@cli.command()
@click.argument('email')
def find_person(email):
    """Find a person by email address."""
    # To find by email, we technically need to assert unique or search.
    # We can use the PUT / assert_unique endpoint to find/create, 
    # OR we can filter via API if supported (Attio v2 filtering is via POST /query usually).
    # For CLI simplicity, we'll try to assert_unique with just email to retrieve the record without changing it 
    # (if it exists, it returns it; if not, it creates it - wait, that's dangerous for 'find').
    # Better to use POST /objects/people/records/query if available, but v2 uses a specific query structure.
    # Let's use the 'identify' trick (PUT) but be careful, or just list recent.
    
    # Actually, proper way is POST /v2/objects/people/records/query
    url = f"{API_BASE_URL}/objects/people/records/query"
    payload = {
        "filter": {
            "$and": [
                {
                    "field": "email_addresses",
                    "operator": "contains", 
                    "value": email 
                    # Note: 'contains' might not be exact. 'equals' is better if supported for email struct.
                    # Email attribute is complex. Attio filtering on complex attributes can be tricky.
                }
            ]
        },
        "limit": 1
    }
    
    # Simpler approach: Just verify connection by listing objects is usually enough for "connect via cli".
    # But let's try to fetch the object we just migrated if user asks.
    console.print("[yellow]Search not implemented in simple CLI yet. Use list-objects to verify connection.[/yellow]")

if __name__ == "__main__":
    cli()

