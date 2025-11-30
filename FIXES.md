# API Integration Fixes

## Issues Fixed

### 1. Twenty CRM API Endpoint Compatibility
**Problem**: The application was using the old Twenty GraphQL API v1 endpoints (`/api/v1/*`), but your Twenty instance uses the REST API (`/rest/*`).

**Error**: `Expected JSON from https://crm.getbeton.org/api/v1/users/me, but got text/html; charset=UTF-8`

**Solution**: Updated all Twenty API service methods in `app/src/server/services/twenty.ts` to use the correct REST API endpoints:

- **Token Validation**: `/api/v1/users/me` → `/rest/people?limit=1`
- **List Entities**: `/api/v1/entities` → `/rest/metadata/objects`
- **List Fields**: `/api/v1/entities/{name}/fields` → `/rest/metadata/objects/{name}`
- **Sample Records**: `/api/v1/entities/{name}/records?limit=N` → `/rest/{name}?limit=N`

### 2. Excessive API Polling
**Problem**: The frontend was polling the backend every 4-6 seconds, causing hundreds of unnecessary requests.

**Logs**: Continuous requests to `migrations.listRuns` and `migrations.notifications`

**Solution**: Reduced polling intervals in `app/src/app/page.tsx`:
- `refetchInterval: 4000` → `30000` (30 seconds)
- `refetchInterval: 6000` → `30000` (30 seconds)

### 3. Attio API Token Validation Endpoint
**Problem**: The application was using `/v2/me` which doesn't exist in Attio's API v2.

**Error**: `Could not find endpoint "GET /v2/me"`

**Solution**: Updated the validation endpoint in `app/src/server/services/attio.ts`:
- `/v2/me` → `/v2/self` (the "Identify" endpoint)

### 4. Missing Webhook Field & Continue Button Not Activating
**Problem**:
- The "Continue" button wouldn't activate even after validating Twenty credentials
- The webhook field was required but not visible in the UI
- The field definition was missing from the `credentialFields` array

**Solution**:
- Added the `NOTIFICATION_WEBHOOK` field definition to the `credentialFields` array
- Made the webhook field optional (removed from `requiredConnectTypes`)
- Now you only need to validate Twenty and Attio tokens to proceed

### 5. Improved Error Messages
**Problem**: Generic error messages didn't help diagnose the API endpoint issues.

**Solution**: Enhanced error handling in `app/src/server/services/http.ts` to provide specific guidance when HTML is returned instead of JSON.

## Testing

To verify the fixes work:

1. Navigate to the app at http://localhost:3000
2. In the "Connect data sources" step:
   - Set Twenty base URL to: `https://crm.getbeton.org`
   - Set Twenty API token to your Bearer token
   - Click "Save Twenty access" - it should now validate successfully
3. Validate your Attio API token
4. The "Continue" button should now be enabled
5. The webhook field is now visible but optional
6. Check the browser console and server logs - polling should be much less frequent

## API Documentation References

### Twenty CRM
- [Twenty REST API Documentation](https://twenty.com/developers/rest-api/metadata)
- [Twenty API & Webhooks](https://twenty.com/developers/section/api-and-webhooks/api)

### Attio
- [Attio API Authentication](https://docs.attio.com/rest-api/how-to/authentication)
- [Attio Identify Endpoint](https://developers.attio.com/reference/get_v2-self)
- [Generate Attio API Key](https://attio.com/help/apps/other-apps/generating-an-api-key)

Your Twenty CRM instance follows the standard Twenty REST API format where:
- Core data endpoints: `/rest/{objectName}` (e.g., `/rest/people`, `/rest/companies`)
- Metadata endpoints: `/rest/metadata/*` (e.g., `/rest/metadata/objects`)
- Authentication: `Authorization: Bearer {token}` header
