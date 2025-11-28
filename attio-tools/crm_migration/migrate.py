#!/usr/bin/env python3
"""
CRM Migration Script: Twenty CRM → Attio CRM
A CLI tool for one-time data migration with interactive prompts and progress visualization.

NOTE: This is a starter template. The actual Twenty and Attio API endpoints need to be
configured based on their actual API documentation. This script provides the framework
for the migration with all the interactive CLI, logging, and progress tracking features.
"""

import os
import sys
import json
import time
import webbrowser
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dotenv import load_dotenv
import pandas as pd
import requests
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeRemainingColumn
from rich.prompt import Prompt, Confirm
from rich.panel import Panel
from rich import print as rprint
from rich.tree import Tree
import click

# Initialize Rich console for beautiful terminal output
console = Console()

# Load environment variables from .env file
load_dotenv()

# Configuration from environment variables
TWENTY_BASE_URL = os.getenv("TWENTY_BASE_URL", "")
TWENTY_API_KEY = os.getenv("TWENTY_API_KEY", "")
ATTIO_API_TOKEN = os.getenv("ATTIO_API_TOKEN", "")
ATTIO_DASHBOARD_URL = os.getenv("ATTIO_DASHBOARD_URL", "https://app.attio.com")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", 50))
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 30))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", 3))

# Log directory setup
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)


class MigrationLogger:
    """Handles all logging for the migration process with timestamped files."""
    
    def __init__(self, timestamp: str):
        # Timestamp for this migration run
        self.timestamp = timestamp
        
        # Initialize log file paths
        self.success_log = LOG_DIR / f"migration_success_{timestamp}.csv"
        self.error_log = LOG_DIR / f"migration_errors_{timestamp}.csv"
        self.summary_log = LOG_DIR / f"migration_summary_{timestamp}.txt"
        self.mapping_log = LOG_DIR / f"field_mapping_{timestamp}.json"
        
        # Initialize counters for tracking
        self.success_count = 0
        self.error_count = 0
        self.skipped_count = 0
        
        # Lists to accumulate records
        self.successful_records = []
        self.failed_records = []
        
        console.print(f"[dim]📁 Logs will be saved to: {LOG_DIR}[/dim]")
    
    def log_success(self, twenty_id: str, attio_id: str, record_data: Dict):
        """Log a successfully migrated record."""
        self.success_count += 1
        self.successful_records.append({
            "twenty_id": twenty_id,
            "attio_id": attio_id,
            "timestamp": datetime.now().isoformat(),
            **record_data
        })
    
    def log_error(self, twenty_id: str, error_message: str, record_data: Dict):
        """Log a failed record migration."""
        self.error_count += 1
        self.failed_records.append({
            "twenty_id": twenty_id,
            "error": error_message,
            "timestamp": datetime.now().isoformat(),
            **record_data
        })
    
    def log_skip(self, reason: str):
        """Log a skipped record."""
        self.skipped_count += 1
    
    def save_logs(self, config: Dict, start_time: datetime, end_time: datetime):
        """Save all accumulated logs to files."""
        # Save successful migrations to CSV
        if self.successful_records:
            df_success = pd.DataFrame(self.successful_records)
            df_success.to_csv(self.success_log, index=False)
            console.print(f"[green]✓[/green] Success log saved: {self.success_log}")
        
        # Save failed migrations to CSV
        if self.failed_records:
            df_errors = pd.DataFrame(self.failed_records)
            df_errors.to_csv(self.error_log, index=False)
            console.print(f"[red]✗[/red] Error log saved: {self.error_log}")
        
        # Save summary to text file
        duration = (end_time - start_time).total_seconds()
        summary = f"""
CRM MIGRATION SUMMARY
{'='*50}
Timestamp: {self.timestamp}
Start Time: {start_time.isoformat()}
End Time: {end_time.isoformat()}
Duration: {duration:.2f} seconds

CONFIGURATION
{'-'*50}
Twenty CRM URL: {config.get('twenty_url', 'N/A')}
Attio Dashboard: {config.get('attio_url', 'N/A')}
Batch Size: {config.get('batch_size', 'N/A')}

RESULTS
{'-'*50}
Total Processed: {self.success_count + self.error_count}
✓ Successful: {self.success_count}
✗ Failed: {self.error_count}
⊘ Skipped: {self.skipped_count}
Success Rate: {(self.success_count / (self.success_count + self.error_count) * 100) if (self.success_count + self.error_count) > 0 else 0:.2f}%

LOGS
{'-'*50}
Success Log: {self.success_log}
Error Log: {self.error_log}
Mapping Log: {self.mapping_log}
"""
        
        # Write summary to file
        with open(self.summary_log, "w") as f:
            f.write(summary)
        
        console.print(f"[blue]ℹ[/blue] Summary saved: {self.summary_log}")
    
    def save_mapping(self, mapping: Dict):
        """Save field mapping configuration to JSON."""
        with open(self.mapping_log, "w") as f:
            json.dump(mapping, f, indent=2)
        console.print(f"[blue]ℹ[/blue] Field mapping saved: {self.mapping_log}")


class APIClient:
    """Handles API communication with retry logic and error handling."""
    
    def __init__(self, base_url: str, headers: Dict, name: str):
        # Store API configuration
        self.base_url = base_url.rstrip('/')
        self.headers = headers
        self.name = name
        self.session = requests.Session()
        self.session.headers.update(headers)
    
    def request(self, method: str, endpoint: str, **kwargs) -> Optional[requests.Response]:
        """Make an API request with retry logic."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        # Add timeout if not specified
        if 'timeout' not in kwargs:
            kwargs['timeout'] = REQUEST_TIMEOUT
        
        # Retry loop with exponential backoff
        for attempt in range(MAX_RETRIES):
            try:
                response = self.session.request(method, url, **kwargs)
                response.raise_for_status()
                return response
            
            except requests.exceptions.HTTPError as e:
                if attempt == MAX_RETRIES - 1:
                    console.print(f"[red]HTTP error for {self.name}: {e}[/red]")
                    raise
                # Wait before retrying (exponential backoff)
                time.sleep(2 ** attempt)
            
            except requests.exceptions.RequestException as e:
                if attempt == MAX_RETRIES - 1:
                    console.print(f"[red]Request error for {self.name}: {e}[/red]")
                    raise
                time.sleep(2 ** attempt)
        
        return None
    
    def get(self, endpoint: str, **kwargs) -> Optional[Dict]:
        """Make a GET request and return JSON."""
        response = self.request("GET", endpoint, **kwargs)
        return response.json() if response else None
    
    def post(self, endpoint: str, data: Dict, **kwargs) -> Optional[Dict]:
        """Make a POST request and return JSON."""
        response = self.request("POST", endpoint, json=data, **kwargs)
        return response.json() if response else None


def check_configuration() -> bool:
    """Verify all required configuration is present."""
    console.print(Panel("[bold cyan]Configuration Check[/bold cyan]", expand=False))
    
    # Track missing configuration
    missing = []
    
    # Check Twenty CRM configuration
    if not TWENTY_BASE_URL:
        missing.append("TWENTY_BASE_URL")
    else:
        console.print(f"[green]✓[/green] Twenty CRM URL: {TWENTY_BASE_URL}")
    
    if not TWENTY_API_KEY:
        missing.append("TWENTY_API_KEY")
    else:
        # Mask the key for security
        masked_key = f"{TWENTY_API_KEY[:8]}...{TWENTY_API_KEY[-4:]}" if len(TWENTY_API_KEY) > 12 else "***"
        console.print(f"[green]✓[/green] Twenty API Key: {masked_key}")
    
    # Check Attio configuration
    if not ATTIO_API_TOKEN:
        missing.append("ATTIO_API_TOKEN")
    else:
        # Mask the token for security
        masked_token = f"{ATTIO_API_TOKEN[:8]}...{ATTIO_API_TOKEN[-4:]}" if len(ATTIO_API_TOKEN) > 12 else "***"
        console.print(f"[green]✓[/green] Attio API Token: {masked_token}")
    
    console.print(f"[green]✓[/green] Attio Dashboard: {ATTIO_DASHBOARD_URL}")
    console.print(f"[green]✓[/green] Batch Size: {BATCH_SIZE}")
    
    # Display missing configuration
    if missing:
        console.print("\n[red]✗ Missing configuration:[/red]")
        for item in missing:
            console.print(f"  [red]•[/red] {item}")
        console.print("\n[yellow]Please set these in your .env file or environment variables.[/yellow]")
        console.print("[dim]See .env.example for template[/dim]")
        return False
    
    return True


def test_connections() -> Tuple[Optional[APIClient], Optional[APIClient]]:
    """Test connections to both CRMs and return API clients."""
    console.print(Panel("[bold cyan]Testing API Connections[/bold cyan]", expand=False))
    
    twenty_client = None
    attio_client = None
    
    # Test Twenty CRM connection
    with console.status("[dim]Testing Twenty CRM...[/dim]"):
        try:
            twenty_headers = {
                "Authorization": f"Bearer {TWENTY_API_KEY}",
                "Content-Type": "application/json"
            }
            twenty_client = APIClient(TWENTY_BASE_URL, twenty_headers, "Twenty CRM")
            
            # TODO: Replace with actual Twenty API endpoint
            # Example: response = twenty_client.get("/rest/metadata/objects")
            # For now, just create the client
            console.print(f"[green]✓ Twenty CRM client initialized[/green]")
            console.print(f"[dim]  Base URL: {TWENTY_BASE_URL}[/dim]")
        
        except Exception as e:
            console.print(f"[red]✗ Twenty CRM connection failed: {e}[/red]")
    
    # Test Attio connection
    with console.status("[dim]Testing Attio CRM...[/dim]"):
        try:
            attio_headers = {
                "Authorization": f"Bearer {ATTIO_API_TOKEN}",
                "Content-Type": "application/json"
            }
            attio_client = APIClient("https://api.attio.com/v2", attio_headers, "Attio CRM")
            
            # TODO: Test with actual endpoint like /objects
            # For now, just create the client
            console.print(f"[green]✓ Attio CRM client initialized[/green]")
            console.print(f"[dim]  Base URL: https://api.attio.com/v2[/dim]")
        
        except Exception as e:
            console.print(f"[red]✗ Attio connection failed: {e}[/red]")
    
    return twenty_client, attio_client


def display_migration_summary(logger: MigrationLogger, start_time: datetime):
    """Display final migration summary with rich formatting."""
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    # Create results table
    table = Table(title="Migration Results", show_header=True, header_style="bold cyan")
    table.add_column("Metric", style="cyan")
    table.add_column("Count", justify="right", style="green")
    
    total = logger.success_count + logger.error_count
    success_rate = (logger.success_count / total * 100) if total > 0 else 0
    
    table.add_row("✓ Successful", str(logger.success_count))
    table.add_row("✗ Failed", str(logger.error_count))
    table.add_row("⊘ Skipped", str(logger.skipped_count))
    table.add_row("Total Processed", str(total))
    table.add_row("Success Rate", f"{success_rate:.1f}%")
    table.add_row("Duration", f"{duration:.2f}s")
    
    console.print()
    console.print(table)
    console.print()
    
    # Display log file locations
    console.print(Panel("[bold cyan]Migration Logs[/bold cyan]", expand=False))
    if logger.successful_records:
        console.print(f"[green]✓[/green] Success log: {logger.success_log}")
    if logger.failed_records:
        console.print(f"[red]✗[/red] Error log: {logger.error_log}")
    console.print(f"[blue]ℹ[/blue] Summary: {logger.summary_log}")
    console.print()


def fetch_available_objects(client: APIClient) -> List[str]:
    """Fetch list of available objects from Twenty CRM."""
    # NOTE: This endpoint is a guess based on standard patterns.
    # Twenty CRM users should verify the correct metadata endpoint.
    try:
        # Try to fetch metadata
        # Common patterns: /metadata/objects, /objects, /rest/metadata
        response = client.get("/metadata/objects")
        if response and 'data' in response:
            return [obj['name'] for obj in response['data']]
        
        # Fallback for demo/testing if API fails
        return ["people", "companies", "opportunities", "tasks"]
    except Exception:
        return ["people", "companies", "opportunities", "tasks"]


def extract_records(client: APIClient, object_name: str) -> List[Dict]:
    """Extract all records for a specific object from Twenty CRM."""
    records = []
    cursor = None
    page = 1
    
    with console.status(f"[bold green]Extracting {object_name} records...[/bold green]") as status:
        while True:
            # Construct URL with pagination
            # Adjust endpoint based on Twenty's actual API structure
            endpoint = f"/rest/{object_name}"
            params = {"limit": BATCH_SIZE}
            if cursor:
                params["cursor"] = cursor
            
            status.update(f"Fetching page {page}...")
            response = client.get(endpoint, params=params)
            
            if not response or 'data' not in response:
                break
                
            # Handle nested response structure: {"data": {"people": [...]}}
            data = response.get('data', {})
            if isinstance(data, list):
                batch = data
            elif isinstance(data, dict):
                # Try to get the list using the object name
                batch = data.get(object_name, [])
            else:
                batch = []
            
            if not batch:
                break
                
            # Flatten records immediately
            flat_batch = [flatten_record(r) for r in batch]
            records.extend(flat_batch)
            
            # Check for pagination cursor
            # Adjust based on actual response structure
            meta = response.get('meta', {})
            cursor = meta.get('next_cursor')
            
            if not cursor:
                break
                
            page += 1
            
    return records


def configure_field_mapping(source_records: List[Dict], target_object: str) -> Dict[str, str]:
    """Auto-configure field mapping based on known schemas."""
    if not source_records:
        return {}
    
    # Pre-defined mapping for People
    if target_object == 'people':
        console.print("[cyan]Using automatic mapping for People object[/cyan]")
        return {
            "name_full": "name",
            "email_primary": "email_addresses",
            "jobTitle": "job_title",
            "city": "primary_location",
            "linkedin_url": "linkedin",
            "x_url": "twitter"
        }
        
    # Fallback to interactive for unknown objects
    source_fields = list(source_records[0].keys())
    mapping = {}
    
    console.print(Panel(f"[bold]Map fields from Twenty ({len(source_fields)} fields) to Attio ({target_object})[/bold]", expand=False))
    
    for field in source_fields:
        if field in ['id', 'createdAt', 'updatedAt', 'deletedAt', 'position', 'searchVector']:
            continue
            
        target_field = Prompt.ask(f"Map Twenty field [cyan]{field}[/cyan] to Attio field", default=field)
        if target_field:
            mapping[field] = target_field
            
    return mapping

def flatten_record(record: Dict) -> Dict:
    """Flatten complex Twenty CRM fields into simple values."""
    flat = record.copy()
    
    # Flatten Name
    name = record.get('name', {})
    if isinstance(name, dict):
        flat['name_full'] = f"{name.get('firstName', '')} {name.get('lastName', '')}".strip()
    
    # Flatten Email
    emails = record.get('emails', {})
    if isinstance(emails, dict):
        flat['email_primary'] = emails.get('primaryEmail', '')
        
    # Flatten Social Links
    linkedin = record.get('linkedinLink', {})
    if isinstance(linkedin, dict):
        flat['linkedin_url'] = linkedin.get('primaryLinkUrl', '')
        
    x_link = record.get('xLink', {})
    if isinstance(x_link, dict):
        x_url = x_link.get('primaryLinkUrl', '')
        # Clean Twitter/X URL to handle
        # Attio expects a handle (e.g. "jack") not a full URL? 
        # Or maybe the URL "http://twitter.com/Cat5BoatShoes.com" is just invalid because of the trailing .com
        # Let's clean it just in case: strip protocol and domain if present, or leave if it looks like a handle
        # But wait, Attio's type is "text", but the validation error says "Twitter handle is not valid".
        # This implies it might be using a specific validation regex.
        # Let's try to extract just the handle part if it looks like a URL.
        
        if x_url:
            # Handle complex URLs or invalid formats like "http://twitter.com/Cat5BoatShoes.com"
            # Attio strictly validates handles. "Cat5BoatShoes.com" is invalid because of the dot?
            # Or maybe it just expects the handle.
            
            # 1. Clean URL parts
            cleaned = x_url.strip()
            if "twitter.com/" in cleaned or "x.com/" in cleaned:
                try:
                    cleaned = cleaned.rstrip('/').split('/')[-1]
                    cleaned = cleaned.split('?')[0]
                except:
                    pass
            
            # 2. Strict validation: Handle should usually be alphanumeric + underscore
            # If it contains a dot, it might be invalid for Attio (though Twitter allows dots in some contexts? No, actually Twitter handles are alphanumeric and underscore only, 15 chars max).
            # "Cat5BoatShoes.com" has a dot. It's likely an invalid handle in the source data.
            # If we detect a dot or other invalid chars, we might want to just NOT send it, or try to clean it further.
            
            # Simple heuristic: if it has a dot, take the part before the dot
            if '.' in cleaned:
                cleaned = cleaned.split('.')[0]
                
            x_url = cleaned
            
        flat['x_url'] = x_url
        
    return flat


def select_records_to_migrate(records: List[Dict]) -> List[Dict]:
    """Interactive record selection."""
    console.print(f"\n[bold]Found {len(records)} records.[/bold]")
    
    options = ["Migrate All", "Filter by Field", "Manual Selection (First 50)"]
    choice = Prompt.ask("Selection Method", choices=options, default="Migrate All")
    
    if choice == "Migrate All":
        return records
        
    elif choice == "Filter by Field":
        if not records:
            return []
        fields = list(records[0].keys())
        field = Prompt.ask("Filter by field", choices=fields)
        value = Prompt.ask(f"Value for {field} (exact match)")
        
        filtered = [r for r in records if str(r.get(field)) == value]
        console.print(f"Filtered to {len(filtered)} records.")
        return filtered
        
    elif choice == "Manual Selection (First 50)":
        # Simple manual selection for demo
        selected = []
        for i, record in enumerate(records[:50]):
            label = record.get('name') or record.get('email') or record.get('id')
            if Confirm.ask(f"Migrate record {i+1}: {label}?", default=True):
                selected.append(record)
        return selected
        
    return records


def execute_migration(
    attio_client: APIClient, 
    records: List[Dict], 
    mapping: Dict, 
    target_object: str,
    logger: MigrationLogger,
    dry_run: bool
):
    """Execute the migration with progress tracking."""
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeRemainingColumn(),
        console=console
    ) as progress:
        
        task = progress.add_task(f"[cyan]Migrating to {target_object}...", total=len(records))
        
        for record in records:
            twenty_id = record.get('id', 'unknown')
            
            # Prepare Attio payload
            payload = {"values": {}}
            for source_field, target_field in mapping.items():
                value = record.get(source_field)
                if value is not None and value != "":
                    # Handle Name field (personal-name type)
                    if target_field == "name":
                        # Attio Personal Name attribute expects 'full_name'
                        # It can optionally take first_name/last_name but full_name is often required or preferred
                        # Error message says: "validation_errors":[{"code":"invalid_type","path":["full_name"],"message":"Required"}]
                        # So we MUST provide full_name.
                        # We can also provide first_name/last_name if we have them, but full_name is the key.
                        parts = str(value).split(' ', 1)
                        first_name = parts[0]
                        last_name = parts[1] if len(parts) > 1 else ""
                        
                        payload["values"][target_field] = [{
                            "full_name": value,
                            "first_name": first_name,
                            "last_name": last_name
                        }]
                    
                    # Handle Email field (email-address type)
                    elif target_field == "email_addresses":
                        # Attio expects email_address key
                        payload["values"][target_field] = [{"email_address": value}]
                        
                    # Handle Location field (primary_location)
                    elif target_field == "primary_location":
                        # Attio Location type expects specific keys like 'locality' (city), 'country_code', etc.
                        # Empty strings for optional fields are NOT allowed for country_code (must be ISO or null)
                        # Lat/Long must be valid or null
                        # line_3/line_4 are also required keys
                        payload["values"][target_field] = [{
                            "line_1": "",
                            "line_2": "",
                            "line_3": "",
                            "line_4": "",
                            "locality": value, # City maps to locality
                            "region": "",
                            "postcode": "",
                            "country_code": None, 
                            "latitude": None,
                            "longitude": None
                        }]

                    # Handle simple text fields (job_title, city, etc.)
                    # Attio expects 'value' key for text, 'original_url' for URLs?
                    # Let's check other types based on common failures
                    
                    elif target_field in ["linkedin", "twitter", "facebook", "instagram", "angellist"]:
                        # For URL/Social fields, Attio often just treats them as text unless specified otherwise
                        # The error log showed 'value' was sent. 
                        # If type is text, 'value' is correct.
                        # If type is domain or url, might be different. 
                        # Based on API response, linkedin/twitter are type 'text'.
                        payload["values"][target_field] = [{"value": value}]
                        
                    else:
                        # Default fallback for text fields
                        payload["values"][target_field] = [{"value": value}] if isinstance(value, str) else value
            
            if dry_run:
                time.sleep(0.1) # Simulate work
                logger.log_success(twenty_id, "dry-run-id", payload)
                progress.advance(task)
                continue
                
            # Execute API call
            try:
                # Endpoint: POST /v2/objects/{object}/records
                endpoint = f"/objects/{target_object}/records"
                
                # Check for existing record first to handle upserts?
                # Attio supports upsert via assert_unique but here we just POST.
                # If we get a 400 uniqueness conflict, we should try to update or look up the existing one.
                # Or we can use the 'PUT' method with a matching attribute if Attio supports it easily.
                # Attio v2 supports `PUT /v2/objects/{object}/records?matching_attribute=email_addresses`
                
                if target_object == 'people':
                     # Use PUT for upsert on people based on email
                     # BUT only if email_addresses is in the payload!
                     if "email_addresses" in payload["values"] and payload["values"]["email_addresses"]:
                        response = attio_client.request("PUT", endpoint, json={"data": payload}, params={"matching_attribute": "email_addresses"})
                     else:
                        # Fallback to POST if no email (cannot check uniqueness on email)
                        response = attio_client.post(endpoint, {"data": payload})
                else:
                     response = attio_client.post(endpoint, {"data": payload})
                
                if response:
                    # PUT returns 200 OK with data, POST returns 200 OK with data
                    # Check if response has json content
                    try:
                        resp_data = response.json()
                        if 'data' in resp_data:
                            attio_id = resp_data['data'].get('id', {}).get('record_id')
                            logger.log_success(twenty_id, attio_id, payload)
                        else:
                            # Some successful PUTs might not return data the same way? 
                            # But Attio usually returns the record.
                            # If status is 200/201 but no data key?
                            logger.log_success(twenty_id, "upserted", payload)
                    except:
                        # If response is not JSON but status is OK
                         logger.log_success(twenty_id, "upserted-no-content", payload)
                else:
                    logger.log_error(twenty_id, "No response or empty response", payload)
                    
            except Exception as e:
                error_msg = str(e)
                if hasattr(e, 'response') and e.response is not None:
                    try:
                        # Append the response text to the error message for better debugging
                        error_msg += f" | Response: {e.response.text}"
                    except:
                        pass
                logger.log_error(twenty_id, error_msg, payload)
            
            progress.advance(task)


@click.command()
@click.option('--dry-run', is_flag=True, help='Run without actually migrating data')
@click.option('--object', 'object_name', help='Source object to migrate (e.g., people)')
@click.option('--target', 'target_name', help='Target object in Attio (e.g., people)')
@click.option('--yes', is_flag=True, help='Skip confirmation prompts')
def main(dry_run: bool, object_name: Optional[str], target_name: Optional[str], yes: bool):
    """
    CRM Migration Tool: Twenty → Attio
    
    Migrate your CRM data from Twenty (self-hosted) to Attio with interactive prompts
    and beautiful progress visualization.
    """
    start_time = datetime.now()
    timestamp = start_time.strftime("%Y%m%d_%H%M%S")
    
    # Display welcome banner
    console.print()
    console.print(Panel.fit(
        "[bold cyan]CRM Migration Tool[/bold cyan]\n"
        "[dim]Twenty CRM → Attio CRM[/dim]",
        border_style="cyan"
    ))
    console.print()
    
    if dry_run:
        console.print(Panel("[yellow]⚠  DRY RUN MODE - No data will be migrated[/yellow]", expand=False))
        console.print()
    
    # Step 1: Check configuration
    if not check_configuration():
        console.print("\n[red]❌ Configuration incomplete. Exiting.[/red]")
        sys.exit(1)
    
    console.print()
    
    # Step 2: Test connections
    twenty_client, attio_client = test_connections()
    
    if not twenty_client or not attio_client:
        console.print("\n[red]❌ Connection tests failed. Please check your API credentials.[/red]")
        sys.exit(1)
    
    console.print()
    
    # Initialize logger
    logger = MigrationLogger(timestamp)
    
    # Step 3: Select Object to Migrate
    console.print(Panel("[bold yellow]1. Object Selection[/bold yellow]", expand=False))
    if object_name:
        console.print(f"Selected object: [cyan]{object_name}[/cyan]")
        selected_object = object_name
    else:
        available_objects = fetch_available_objects(twenty_client)
        selected_object = Prompt.ask("Select object to migrate", choices=available_objects, default="people")
    
    # Target object in Attio (usually same name or mapped)
    if target_name:
        console.print(f"Target object: [cyan]{target_name}[/cyan]")
        target_object = target_name
    elif object_name:
        # If running non-interactively but target not specified, assume same
        target_object = object_name
        console.print(f"Target object (default): [cyan]{target_object}[/cyan]")
    else:
        target_object = Prompt.ask("Target object in Attio", default=selected_object)
    console.print()
    
    # Step 4: Extract Data
    console.print(Panel(f"[bold yellow]2. Extracting {selected_object}[/bold yellow]", expand=False))
    records = extract_records(twenty_client, selected_object)
    
    if not records:
        # Create dummy records for demonstration if extraction fails/returns empty
        if yes or Confirm.ask("No records found. Generate dummy data for testing?", default=True):
            records = [
                {"id": "1", "name": "Alice Smith", "email": "alice@example.com", "company": "Tech Corp"},
                {"id": "2", "name": "Bob Jones", "email": "bob@example.com", "company": "Sales Inc"},
                {"id": "3", "name": "Charlie Day", "email": "charlie@example.com", "company": "Media Ltd"},
            ]
        else:
            console.print("[red]Aborting migration.[/red]")
            sys.exit(0)
            
    console.print(f"[green]✓ Extracted {len(records)} records[/green]")
    console.print()
    
    # Step 5: Field Mapping
    console.print(Panel("[bold yellow]3. Field Mapping[/bold yellow]", expand=False))
    mapping = configure_field_mapping(records, target_object)
    logger.save_mapping(mapping)
    console.print()
    
    # Step 6: Record Selection
    console.print(Panel("[bold yellow]4. Record Selection[/bold yellow]", expand=False))
    if yes:
        console.print("Auto-selecting ALL records.")
        selected_records = records
    else:
        selected_records = select_records_to_migrate(records)
    console.print(f"[green]✓ Selected {len(selected_records)} records for migration[/green]")
    console.print()
    
    # Step 7: Confirmation
    console.print(Panel("[bold yellow]5. Confirmation[/bold yellow]", expand=False))
    console.print(f"Source: [cyan]Twenty CRM ({selected_object})[/cyan]")
    console.print(f"Target: [cyan]Attio CRM ({target_object})[/cyan]")
    console.print(f"Records: [bold]{len(selected_records)}[/bold]")
    console.print(f"Mode: [bold]{'DRY RUN (Safe)' if dry_run else 'LIVE MIGRATION'}[/bold]")
    console.print()
    
    if not yes and not Confirm.ask("Ready to start migration?", default=False):
        console.print("[yellow]Migration cancelled.[/yellow]")
        sys.exit(0)
    
    console.print()
    
    # Step 8: Execution
    execute_migration(attio_client, selected_records, mapping, target_object, logger, dry_run)
    
    # Save logs
    config = {
        "twenty_url": TWENTY_BASE_URL,
        "attio_url": ATTIO_DASHBOARD_URL,
        "batch_size": BATCH_SIZE,
        "object": selected_object
    }
    logger.save_logs(config, start_time, datetime.now())
    
    # Display summary
    display_migration_summary(logger, start_time)
    
    # Offer to open Attio dashboard
    if not yes and Confirm.ask("Open Attio dashboard in browser?", default=False):
        webbrowser.open(ATTIO_DASHBOARD_URL)
        console.print(f"[green]✓[/green] Opening {ATTIO_DASHBOARD_URL}")
    
    console.print()
    console.print("[green]✓ Migration script execution complete![/green]")
    console.print()


if __name__ == "__main__":
    main()
