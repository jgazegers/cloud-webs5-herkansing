# Winner Service

The Winner Service is responsible for automatically selecting winners for competitions when they end. It tracks competitions, submissions, and their comparison results to determine the best submission based on score and timing.

## Functionality

### Core Features
- **Competition Tracking**: Monitors competitions created in the system
- **Submission Tracking**: Tracks all submissions for each competition
- **Comparison Result Tracking**: Stores image comparison scores from the image-comparison-service
- **Automatic Winner Selection**: Selects winners when competitions end
- **Winner Notification**: Publishes `winner.selected` events for other services to consume

### Winner Selection Algorithm
The winner is selected based on the following criteria:
1. **Primary**: Highest comparison score (0-100)
2. **Tiebreaker**: Earliest submission time (incentivizes early participation)

### Events Consumed
- `competition.created` - Stores competition data for tracking
- `submission.created` - Stores submission data for tracking  
- `comparison.completed` - Stores comparison results and triggers winner selection for ended competitions

### Events Published
- `winner.selected` - Notifies other services when a winner is chosen

## Message Queue Integration

The service uses RabbitMQ to:
- Listen for events from other microservices
- Publish winner selection events
- Uses topic exchanges for routing

## Scheduled Tasks

- Runs every minute to check for competitions that have ended
- Automatically selects winners for competitions that:
  - Have passed their end date
  - Don't already have a winner selected
  - Have at least one completed comparison result

## HTTP Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Statistics
```
GET /stats
```
Returns winner selection statistics:
- Total competitions tracked
- Competitions with winners selected
- Competitions awaiting winners
- Ended competitions without winners

### Manual Trigger
```
POST /trigger-winner-selection
```
Manually triggers winner selection process (useful for testing).

## Database Schema

### Competition
```typescript
{
  _id: string
  title: string
  description: string
  targetImage: string
  location: { name: string, coordinates: { latitude: number, longitude: number } }
  startDate: Date
  endDate: Date
  owner: string
  winnerSubmissionId?: string
  isWinnerSelected: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Submission
```typescript
{
  _id: string
  competitionId: string
  owner: string
  submissionData: string
  createdAt: Date
  updatedAt: Date
}
```

### ComparisonResult
```typescript
{
  submissionId: string
  competitionId: string
  score: number // 0-100
  status: 'pending' | 'completed' | 'failed'
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}
```

## Environment Variables

- `PORT`: HTTP server port (default: 3005)
- `MONGODB_URI`: MongoDB connection string
- `RABBITMQ_URL`: RabbitMQ connection string
- `NODE_ENV`: Environment (development/production)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Docker

The service is configured to run in Docker via docker-compose:

```yaml
winner-service:
  build:
    context: ./winner-service
    dockerfile: ../Dockerfile.dev
  container_name: winner-service
  ports:
    - "3005:3005"
  env_file:
    - ./winner-service/.env
    - .env
  depends_on:
    - mongo
    - rabbitmq
```

## Integration with Other Services

### Competition Service
- **Receives**: `competition.created` events
- **Sends**: `winner.selected` events (for updating competition records)

### Submission Service  
- **Receives**: `submission.created` events

### Image Comparison Service
- **Receives**: `comparison.completed` events

This service is designed to be autonomous and resilient, automatically handling winner selection without requiring manual intervention.
