# CRM Migration Tool

A CLI tool for migrating CRM data from **Twenty CRM** (self-hosted on Railway) to **Attio CRM** with interactive prompts, progress visualization, and comprehensive logging.

## Features

- ✨ **Interactive CLI** with beautiful Rich console output
- 🔄 **Robust API communication** with retry logic and error handling
- 📊 **Progress visualization** with real-time status updates
- 🗂️ **Comprehensive logging** for post-migration analysis
- ✅ **Pre-migration validation** and dry-run mode
- 🎯 **Interactive record selection** (all, filter, or manual)
- 🔐 **Secure credential management** via environment variables

## Setup

### 1. Install Dependencies

```bash
cd crm_migration
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Twenty CRM Configuration (your Railway instance)
TWENTY_BASE_URL=https://your-app.up.railway.app
TWENTY_API_KEY=your_twenty_api_key_here

# Attio CRM Configuration
ATTIO_API_TOKEN=your_attio_api_token_here
ATTIO_DASHBOARD_URL=https://app.attio.com

# Optional: Migration Settings
BATCH_SIZE=50
REQUEST_TIMEOUT=30
MAX_RETRIES=3
```

### 3. Get API Credentials

**Twenty CRM API Key:**

1. Navigate to your Twenty CRM instance
2. Go to Settings > Developers
3. Generate a new API key

**Attio API Token:**

1. Visit <https://build.attio.com>
2. Create a new integration
3. Copy the API token

## Usage

### Run Migration

```bash
python migrate.py
```

The script will guide you through:

1. Configuration verification
2. Connection testing
3. Data extraction preview
4. Field mapping configuration
5. Record selection
6. Migration confirmation
7. Progress tracking
8. Results summary

### Dry Run Mode

Test the migration without actually creating records in Attio:

```bash
python migrate.py --dry-run
```

## Migration Logs

All migration runs generate timestamped logs in the `logs/` directory:

- `migration_success_YYYYMMDD_HHMMSS.csv` - Successfully migrated records
- `migration_errors_YYYYMMDD_HHMMSS.csv` - Failed records with error messages
- `migration_summary_YYYYMMDD_HHMMSS.txt` - Overall migration statistics
- `field_mapping_YYYYMMDD_HHMMSS.json` - Field mapping configuration used

## Project Structure

```
crm_migration/
├── migrate.py              # Main CLI script
├── requirements.txt         # Python dependencies
├── .env.example            # Configuration template
├── .env                    # Your actual config (not committed)
├── README.md               # This file
└── logs/                   # Migration logs (created at runtime)
```

## Safety Features

- **Environment variable validation** before execution
- **Connection testing** to both APIs before migration
- **Interactive confirmation** before irreversible operations
- **Batch processing** with checkpoint recovery
- **Detailed error logging** for troubleshooting
- **Dry-run mode** for testing

## Troubleshooting

### Connection Failed

- Verify your API credentials are correct
- Check that your Twenty CRM instance is accessible
- Ensure Attio API token has proper permissions

### Rate Limits

The script automatically handles rate limits with:

- Exponential backoff retry logic
- Batch processing to avoid overwhelming APIs
- Configurable request delays

### Failed Records

Check the error log CSV for specific failure reasons:

- Missing required fields
- Data type mismatches
- Validation errors

## Next Steps

After migration completes:

1. Review the summary log for overall statistics
2. Check error log if any records failed
3. Verify a sample of records in Attio dashboard
4. Compare record counts between systems

## Support

For issues related to:

- **Twenty CRM API**: <https://docs.twenty.com>
- **Attio API**: <https://developers.attio.com>
