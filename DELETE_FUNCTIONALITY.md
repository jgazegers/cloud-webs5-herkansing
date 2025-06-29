# Delete Functionality Implementation

This document describes the implementation of delete functionality for competitions and submissions in the cloud-webs5 project.

## Overview

The system now supports:
- **Competition deletion**: Competition owners can delete their own competitions
- **Submission deletion**: Submission owners can delete their own submissions, and competition owners can delete any submission on their competitions

## API Endpoints

### Competition Deletion

```http
DELETE /api/competitions/{competitionId}
Authorization: Bearer <token>
```

**Authorization**: Only the competition owner can delete their competition.

**Response** (200 OK):
```json
{
  "message": "Competition deleted successfully",
  "competition": {
    "id": "competition_id",
    "title": "Competition Title",
    "owner": "username",
    "deletedAt": "2025-06-29T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Only the competition owner can delete the competition
- `404 Not Found`: Competition not found
- `500 Internal Server Error`: Failed to delete competition

### Submission Deletion

```http
DELETE /api/submissions/{submissionId}
Authorization: Bearer <token>
```

**Authorization**: Either the submission owner OR the competition owner can delete the submission.

**Response** (200 OK):
```json
{
  "message": "Submission deleted successfully",
  "submission": {
    "id": "submission_id",
    "competitionId": "competition_id",
    "owner": "submission_owner",
    "deletedBy": "deleting_user",
    "deleteReason": "submission owner" | "competition owner",
    "deletedAt": "2025-06-29T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: You can only delete your own submissions or submissions from competitions you own
- `404 Not Found`: Submission not found
- `500 Internal Server Error`: Failed to delete submission

## Message Queue Events

### Competition Deleted Event

Published to: `competitions` exchange with routing key `competition.deleted`

```json
{
  "competitionId": "competition_id",
  "title": "Competition Title",
  "owner": "username",
  "deletedAt": "2025-06-29T10:00:00.000Z"
}
```

**Consumers**:
- **Submission Service**: Removes competition from local cache
- **Image Comparison Service**: Deletes competition data, submissions, and comparison results
- **Winner Service**: Deletes competition data, submissions, and comparison results

### Submission Deleted Event

Published to: `submissions` exchange with routing key `submission.deleted`

```json
{
  "submission": {
    "_id": "submission_id",
    "competitionId": "competition_id",
    "owner": "username",
    "deletedAt": "2025-06-29T10:00:00.000Z"
  }
}
```

**Consumers**:
- **Image Comparison Service**: Deletes submission data and comparison results
- **Winner Service**: Deletes submission data and comparison results

## Implementation Details

### Competition Service

**New Files**:
- `src/controllers/deleteCompetition.ts`: Handles competition deletion logic
- Added `CompetitionDeletedEvent` interface to `messageQueue.ts`
- Added `publishCompetitionDeleted()` method to `MessageQueue` class

**Updated Files**:
- `src/controllers/index.ts`: Exports new controller
- `src/routes/competitionRoutes.ts`: Adds DELETE route
- `src/messageQueue.ts`: Adds deletion event publishing

### Submission Service

**New Files**:
- `src/controllers/deleteSubmission.ts`: Handles submission deletion logic with authorization checks
- Added `SubmissionDeletedEvent` and `CompetitionDeletedEvent` interfaces to `messageQueue.ts`

**Updated Files**:
- `src/controllers/index.ts`: Exports new controller
- `src/routes/submissionRoutes.ts`: Adds DELETE route
- `src/services/eventService.ts`: Handles competition deletion events, publishes submission deletion events
- `src/messageQueue.ts`: Adds deletion event publishing and subscription

### Image Comparison Service

**Updated Files**:
- `src/messageQueue.ts`: Subscribes to deletion events
- `src/services/eventHandlers.ts`: Handles cleanup when competitions/submissions are deleted
- `src/index.ts`: Sets up new event handlers

### Winner Service

**Updated Files**:
- `src/messageQueue.ts`: Subscribes to deletion events
- `src/services/eventHandlers.ts`: Handles cleanup when competitions/submissions are deleted
- `src/index.ts`: Sets up new event handlers

## Data Cleanup Strategy

When a **competition is deleted**:
1. Competition record is removed from the competition service
2. All related submissions are cleaned up from other services
3. All comparison results are removed
4. Local caches are updated

When a **submission is deleted**:
1. Submission record is removed from the submission service
2. Related comparison results are cleaned up from other services
3. Winner calculations are automatically updated if needed

## Authorization Logic

### Competition Deletion
- Only the user who created the competition (owner) can delete it
- Authentication is required via JWT token

### Submission Deletion
- **Submission owner**: Can delete their own submission
- **Competition owner**: Can delete any submission from their competition
- **Other users**: Cannot delete submissions they don't own from competitions they don't own

## Error Handling

- All deletion operations are protected by proper authorization checks
- Database operations are wrapped in try-catch blocks
- Message queue failures don't prevent deletion (graceful degradation)
- Comprehensive error messages guide users on permission issues

## Testing

Use the provided REST client files:
- `rest/competition-service.http`: Contains competition deletion tests
- `rest/submission-service.http`: Contains submission deletion tests

Test scenarios include:
- Successful deletions by authorized users
- Authorization failures for unauthorized users
- Edge cases and error conditions

## Event Flow Example

### Competition Deletion Flow:
1. User sends DELETE request to competition service
2. Competition service validates ownership and deletes competition
3. `competition.deleted` event is published
4. Submission service removes competition from local cache
5. Image comparison service deletes all related data
6. Winner service deletes all related data

### Submission Deletion Flow:
1. User sends DELETE request to submission service
2. Submission service validates authorization (owner OR competition owner)
3. Submission is deleted from database
4. `submission.deleted` event is published
5. Image comparison service deletes comparison results
6. Winner service deletes submission data

This implementation ensures data consistency across all microservices while maintaining proper authorization and providing comprehensive cleanup of related data.
