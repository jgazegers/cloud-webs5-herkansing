# Submission Service - Competition Validation

## Overview
The submission service now includes comprehensive validation to ensure submissions are only accepted for active competitions.

## Validation Rules

### Competition Status Validation
When creating a submission, the service validates:

1. **Competition Exists**: Competition must exist in the local cache
2. **Competition Status**: Only `active` competitions accept submissions
3. **Competition Timing**: Submissions are validated against start/end dates
4. **Competition State**: Stopped or ended competitions reject submissions

### Validation Scenarios

#### ✅ **Accepted Submissions**
- Competition status is `active`
- Current time is after start date (if specified)
- Current time is before end date (if specified)
- No winner has been selected yet

#### ❌ **Rejected Submissions**

**Competition Not Started**
```json
{
  "error": "Competition has not started yet. Submissions will be accepted starting from 2025-07-01T10:00:00.000Z"
}
```

**Competition Ended Naturally**
```json
{
  "error": "Competition has ended and is no longer accepting submissions."
}
```

**Competition Manually Stopped**
```json
{
  "error": "Competition has been stopped by the owner and is no longer accepting submissions."
}
```

**Competition Ended (Winner Selected)**
```json
{
  "error": "Competition has ended and is no longer accepting submissions."
}
```

## Technical Implementation

### Local Competition Cache
- Stores competition metadata including status, dates, and state
- Updated via RabbitMQ events: `competition.created`, `competition.stopped`, `winner.selected`
- Provides fast validation without external API calls

### Event Handlers
- **Competition Created**: Stores competition data with full validation info
- **Competition Stopped**: Updates status to `stopped`
- **Winner Selected**: Updates status to `ended`

### Database Schema
```typescript
interface IValidCompetition {
  competitionId: string;
  title: string;
  owner: string;
  targetImage: string;
  startDate?: Date;        // Optional start date
  endDate?: Date;          // Optional end date  
  status: 'active' | 'stopped' | 'ended';
  createdAt: Date;
}
```

### API Response Codes
- `400 Bad Request`: Validation failed (competition ended, stopped, etc.)
- `404 Not Found`: Competition doesn't exist
- `201 Created`: Submission accepted

## Message Queue Integration

### Subscribed Events
- `competition.created` → Store competition data
- `competition.stopped` → Update status to stopped
- `winner.selected` → Update status to ended

### Published Events
- `submission.created` → Notify other services of new submission

## Error Handling
- Graceful degradation when RabbitMQ is unavailable
- Validation relies on local cache for performance
- Comprehensive error messages for different rejection scenarios
- Non-blocking event publishing (submission succeeds even if event fails)

## Testing
Use the REST client files to test different validation scenarios:
- `/rest/submission-validation-tests.http` - Comprehensive validation tests
- `/rest/submission-service.http` - General submission API tests
