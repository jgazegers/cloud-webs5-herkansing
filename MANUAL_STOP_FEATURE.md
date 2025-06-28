# Competition Manual Stop Feature

## Overview
Competition owners can now manually stop their competitions at any time. This feature is useful for competitions that run indefinitely or when the owner wants to end a competition early.

## Features

### Optional Competition Dates
- **Start Date**: Optional - if not provided, competition starts immediately
- **End Date**: Optional - if not provided, competition runs until manually stopped
- Both dates can be omitted for indefinite competitions

### Manual Stop Endpoint
`PATCH /api/competitions/{competitionId}/stop`

**Authentication**: Required (Bearer token)
**Authorization**: Only the competition owner can stop their competition

**Responses**:
- `200 OK`: Competition stopped successfully
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Only competition owner can stop
- `404 Not Found`: Competition not found
- `400 Bad Request`: Competition already stopped/ended or has winner

### Status Tracking
Competitions now have a status field:
- `active`: Competition is running
- `stopped`: Competition was manually stopped by owner
- `ended`: Competition finished and winner was selected

### Message Queue Integration
When a competition is stopped:
1. Competition status is updated to 'stopped'
2. A `competition.stopped` event is published to RabbitMQ
3. Winner service receives the event and triggers winner selection
4. Competition status is updated to 'ended' once winner is selected

## Winner Selection for Stopped Competitions

### Automatic Processing
- Winner service listens for `competition.stopped` events
- Automatically triggers winner selection when competition is stopped
- Updates competition status to 'ended' after winner is selected

### Manual Trigger Endpoints
- `POST /trigger-winner-selection` - Process all ended/stopped competitions
- `POST /trigger-winner-selection/{competitionId}` - Process specific competition

## API Examples

### Create indefinite competition
```http
POST /api/competitions
Content-Type: multipart/form-data

# Include title, description, location, targetImage
# Omit startDate and endDate
```

### Create competition with only start date
```http
POST /api/competitions
Content-Type: multipart/form-data

# Include startDate
# Omit endDate - runs until manually stopped
```

### Stop a competition
```http
PATCH /api/competitions/{competitionId}/stop
Authorization: Bearer {ownerToken}
```

### Filter stopped competitions
```http
GET /api/competitions?status=stopped
```

## Error Handling
- Competitions with winners cannot be stopped
- Already stopped competitions cannot be stopped again
- Only competition owners can stop their competitions
- Graceful handling if message queue is unavailable
