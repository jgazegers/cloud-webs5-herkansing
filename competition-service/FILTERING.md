# Competition Filtering

The competition service now supports filtering competitions through query parameters. You can use these filters individually or combine them.

## Available Filters

### 1. Location Name Filter
Filter competitions by location name using case-insensitive partial matching.

**Parameter:** `location`  
**Example:** `/api/competitions?location=park`  
**Description:** Finds all competitions where the location name contains "park" (case-insensitive).

### 2. Owner Filter
Filter competitions by the username of the competition creator.

**Parameter:** `owner`  
**Example:** `/api/competitions?owner=CompetitionOwner`  
**Description:** Finds all competitions created by the specified user.

### 3. Status Filter
Filter competitions by their current status based on start and end dates.

**Parameter:** `status`  
**Values:**
- `active` - Competitions currently running (startDate ≤ now ≤ endDate)
- `upcoming` - Competitions that haven't started yet (startDate > now)
- `ended` - Competitions that have finished (endDate < now)

**Examples:**
- `/api/competitions?status=active`
- `/api/competitions?status=upcoming`
- `/api/competitions?status=ended`

### Custom Date Range Filters
For more precise date filtering, you can use these additional parameters:

**Parameters:**
- `startAfter` - Find competitions that start after the specified date
- `endBefore` - Find competitions that end before the specified date

**Examples:**
- `/api/competitions?startAfter=2026-06-01`
- `/api/competitions?endBefore=2026-07-01`
- `/api/competitions?startAfter=2026-06-01&endBefore=2026-07-01`

## Combining Filters

You can combine multiple filters by using multiple query parameters:

**Example:** `/api/competitions?location=park&status=active&owner=CompetitionOwner`

This will find all active competitions in locations containing "park" created by "CompetitionOwner".

## Response Format

The response includes an `appliedFilters` object showing which filters were used:

```json
{
  "totalCompetitions": 5,
  "appliedFilters": {
    "location": "park",
    "owner": "CompetitionOwner",
    "status": "active",
    "startAfter": null,
    "endBefore": null
  },
  "competitions": [...]
}
```

## Database Indexes

The following indexes have been added for optimal query performance:
- `startDate` (ascending)
- `endDate` (ascending)
- `owner` (ascending)
- `location.name` (text search)
- `startDate + endDate` (compound index for date ranges)
