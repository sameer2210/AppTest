# Step Race API Documentation

## Overview

This document describes the backend API endpoints required for the Step Race feature, which allows users to race against real opponents or their "shadow" (clone) versions with daily step decay.

## Key Concepts

### Shadow/Clone System

- A shadow represents a user's best step score when they are offline or inactive
- Shadow scores decay by 10% daily when the original user is inactive
- If the user becomes active again and exceeds their previous best score, that becomes the new best score
- Shadows allow users to race even when opponents are not online

### Race Duration

- Default race duration: 24 hours
- Race is purely step-based (no distance or time constraints)
- Winner is determined by who has more steps when the race ends

## Data Models

### StepRace

```typescript
{
  raceId: string;
  userId: string;
  opponent: StepRaceOpponent;
  userSteps: number;
  opponentSteps: number;
  status: "lobby" | "searching" | "active" | "completed" | "expired";
  startTime: string; // ISO date string
  endTime: string; // ISO date string (24 hours after start)
  duration: number; // Duration in hours (default 24)
  winner?: "user" | "opponent" | "draw";
  createdAt: string;
  updatedAt: string;
}
```

### StepRaceOpponent

```typescript
{
  uid: string;
  username: string;
  profileImageUrl?: string;
  type: "real" | "shadow" | "random";
  currentSteps: number;
  shadowData?: StepRaceShadow;
}
```

### StepRaceShadow

```typescript
{
  uid: string;
  username: string;
  profileImageUrl?: string;
  bestStepCount: number;
  originalBestStepCount: number; // For tracking decay
  lastActiveDate: string; // ISO date string
  decayRate: number; // 0.10 for 10% daily decay
  isOnline: boolean;
}
```

### StepRaceStats

```typescript
{
  racesToday: number;
  wins: number;
  losses: number;
  streak: number;
  totalRaces: number;
  currentRace?: StepRace;
}
```

## API Endpoints

### 1. Get Step Race Statistics

**Endpoint:** `GET /api/step-race/stats/{userId}`

**Description:** Get current step race statistics for a user including today's races, wins, losses, streak, and any active race.

**Response:**

```json
{
  "racesToday": 3,
  "wins": 2,
  "losses": 1,
  "streak": 2,
  "totalRaces": 15,
  "currentRace": {
    "raceId": "race_123",
    "userId": "user_456",
    "opponent": {
      "uid": "opp_789",
      "username": "JohnDoe",
      "profileImageUrl": "https://...",
      "type": "shadow",
      "currentSteps": 8500,
      "shadowData": {
        "uid": "opp_789",
        "username": "JohnDoe",
        "profileImageUrl": "https://...",
        "bestStepCount": 10000,
        "originalBestStepCount": 10000,
        "lastActiveDate": "2026-07-30T10:00:00Z",
        "decayRate": 0.1,
        "isOnline": false
      }
    },
    "userSteps": 7200,
    "opponentSteps": 8500,
    "status": "active",
    "startTime": "2026-08-01T10:00:00Z",
    "endTime": "2026-08-02T10:00:00Z",
    "duration": 24,
    "winner": null,
    "createdAt": "2026-08-01T10:00:00Z",
    "updatedAt": "2026-08-01T12:00:00Z"
  }
}
```

---

### 2. Search Opponents

**Endpoint:** `GET /api/step-race/search?q={query}`

**Description:** Search for users by username to challenge them to a step race.

**Query Parameters:**

- `q` (required): Search query string (minimum 2 characters)

**Response:**

```json
[
  {
    "uid": "user_123",
    "username": "JohnDoe",
    "profileImageUrl": "https://...",
    "bestStepCount": 10000,
    "isOnline": true,
    "lastActiveDate": "2026-08-01T10:00:00Z"
  },
  {
    "uid": "user_456",
    "username": "JaneSmith",
    "profileImageUrl": "https://...",
    "bestStepCount": 8500,
    "isOnline": false,
    "lastActiveDate": "2026-07-28T15:30:00Z"
  }
]
```

---

### 3. Get Random Shadow Opponents

**Endpoint:** `GET /api/step-race/shadows?count={count}`

**Description:** Get random shadow opponents for users who want to race against offline users' best scores.

**Query Parameters:**

- `count` (optional): Number of opponents to return (default: 5)

**Response:**

```json
[
  {
    "uid": "shadow_123",
    "username": "FastRunner",
    "profileImageUrl": "https://...",
    "bestStepCount": 15000,
    "originalBestStepCount": 15000,
    "lastActiveDate": "2026-07-25T10:00:00Z",
    "decayRate": 0.1,
    "isOnline": false
  },
  {
    "uid": "shadow_456",
    "username": "MarathonMaster",
    "profileImageUrl": "https://...",
    "bestStepCount": 12000,
    "originalBestStepCount": 12000,
    "lastActiveDate": "2026-07-28T14:00:00Z",
    "decayRate": 0.1,
    "isOnline": false
  }
]
```

**Note:** The frontend will calculate the decayed steps using the formula:

```
decayedSteps = originalSteps * (1 - decayRate)^daysInactive
```

---

### 4. Create Step Race

**Endpoint:** `POST /api/step-race/create`

**Description:** Create a new step race against an opponent (real or shadow).

**Request Body:**

```json
{
  "opponentUid": "user_123",
  "opponentType": "shadow",
  "duration": 24
}
```

**Parameters:**

- `opponentUid` (required): UID of the opponent
- `opponentType` (required): Type of opponent ("real" or "shadow")
- `duration` (optional): Race duration in hours (default: 24)

**Response:**

```json
{
  "raceId": "race_123",
  "userId": "user_456",
  "opponent": {
    "uid": "user_123",
    "username": "JohnDoe",
    "profileImageUrl": "https://...",
    "type": "shadow",
    "currentSteps": 8500,
    "shadowData": {
      "uid": "user_123",
      "username": "JohnDoe",
      "profileImageUrl": "https://...",
      "bestStepCount": 10000,
      "originalBestStepCount": 10000,
      "lastActiveDate": "2026-07-30T10:00:00Z",
      "decayRate": 0.1,
      "isOnline": false
    }
  },
  "userSteps": 0,
  "opponentSteps": 8500,
  "status": "active",
  "startTime": "2026-08-01T10:00:00Z",
  "endTime": "2026-08-02T10:00:00Z",
  "duration": 24,
  "winner": null,
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-01T10:00:00Z"
}
```

---

### 5. Get Active Race

**Endpoint:** `GET /api/step-race/active/{userId}`

**Description:** Get the currently active race for a user, if any.

**Response:**

```json
{
  "raceId": "race_123",
  "userId": "user_456",
  "opponent": {
    "uid": "user_123",
    "username": "JohnDoe",
    "profileImageUrl": "https://...",
    "type": "shadow",
    "currentSteps": 8500,
    "shadowData": {
      "uid": "user_123",
      "username": "JohnDoe",
      "profileImageUrl": "https://...",
      "bestStepCount": 10000,
      "originalBestStepCount": 10000,
      "lastActiveDate": "2026-07-30T10:00:00Z",
      "decayRate": 0.1,
      "isOnline": false
    }
  },
  "userSteps": 7200,
  "opponentSteps": 8500,
  "status": "active",
  "startTime": "2026-08-01T10:00:00Z",
  "endTime": "2026-08-02T10:00:00Z",
  "duration": 24,
  "winner": null,
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-01T12:00:00Z"
}
```

**Note:** Returns `null` or `404` if no active race exists.

---

### 6. Update Race Progress

**Endpoint:** `POST /api/step-race/update`

**Description:** Update the user's current step count in an active race. This should be called periodically (e.g., every few minutes) or when the user's step count changes significantly.

**Request Body:**

```json
{
  "raceId": "race_123",
  "userSteps": 7500
}
```

**Parameters:**

- `raceId` (required): ID of the race to update
- `userSteps` (required): Current step count of the user

**Response:** `200 OK` with empty body or success message

---

### 7. Complete Race

**Endpoint:** `POST /api/step-race/complete`

**Description:** Complete a race when the duration ends. This determines the winner based on final step counts and updates statistics.

**Request Body:**

```json
{
  "raceId": "race_123"
}
```

**Parameters:**

- `raceId` (required): ID of the race to complete

**Response:**

```json
{
  "raceId": "race_123",
  "userId": "user_456",
  "opponent": {
    "uid": "user_123",
    "username": "JohnDoe",
    "profileImageUrl": "https://...",
    "type": "shadow",
    "currentSteps": 8500,
    "shadowData": {
      "uid": "user_123",
      "username": "JohnDoe",
      "profileImageUrl": "https://...",
      "bestStepCount": 10000,
      "originalBestStepCount": 10000,
      "lastActiveDate": "2026-07-30T10:00:00Z",
      "decayRate": 0.1,
      "isOnline": false
    }
  },
  "userSteps": 9200,
  "opponentSteps": 8500,
  "status": "completed",
  "startTime": "2026-08-01T10:00:00Z",
  "endTime": "2026-08-02T10:00:00Z",
  "duration": 24,
  "winner": "user",
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-02T10:00:00Z"
}
```

---

### 8. Get Leaderboard

**Endpoint:** `GET /api/step-race/leaderboard?limit={limit}`

**Description:** Get the step race leaderboard showing top performers.

**Query Parameters:**

- `limit` (optional): Number of top players to return (default: 10)

**Response:**

```json
[
  {
    "uid": "user_1",
    "username": "ChampionRunner",
    "profileImageUrl": "https://...",
    "totalWins": 45,
    "currentStreak": 8,
    "bestStepCount": 25000
  },
  {
    "uid": "user_2",
    "username": "SpeedDemon",
    "profileImageUrl": "https://...",
    "totalWins": 38,
    "currentStreak": 3,
    "bestStepCount": 22000
  }
]
```

---

## Shadow Decay Logic

### Formula

The shadow score decay is calculated as follows:

```
daysInactive = floor((currentDate - lastActiveDate) / (1000 * 60 * 60 * 24))
decayedSteps = originalBestStepCount * (1 - decayRate)^daysInactive
```

### Example

- Original best score: 10,000 steps
- Last active: 3 days ago
- Decay rate: 10% (0.10)

```
daysInactive = 3
decayedSteps = 10000 * (0.9)^3 = 10000 * 0.729 = 7,290 steps
```

### Updating Best Scores

When a user becomes active again and exceeds their previous best score:

1. Update `bestStepCount` to the new higher value
2. Update `originalBestStepCount` to the new value
3. Update `lastActiveDate` to current date
4. Reset decay calculation for future inactive periods

---

## Database Schema Recommendations

### step_races Collection

```javascript
{
  _id: ObjectId,
  raceId: String (unique),
  userId: String (indexed),
  opponent: {
    uid: String,
    username: String,
    profileImageUrl: String,
    type: String, // "real" | "shadow" | "random"
    currentSteps: Number,
    shadowData: {
      uid: String,
      username: String,
      profileImageUrl: String,
      bestStepCount: Number,
      originalBestStepCount: Number,
      lastActiveDate: Date,
      decayRate: Number,
      isOnline: Boolean
    }
  },
  userSteps: Number,
  opponentSteps: Number,
  status: String, // "lobby" | "searching" | "active" | "completed" | "expired"
  startTime: Date (indexed),
  endTime: Date (indexed),
  duration: Number,
  winner: String, // "user" | "opponent" | "draw"
  createdAt: Date,
  updatedAt: Date
}
```

### user_step_stats Collection (for tracking daily best scores)

```javascript
{
  _id: ObjectId,
  userId: String (indexed),
  date: Date (indexed), // Daily partition
  bestStepCount: Number,
  lastActiveDate: Date,
  isOnline: Boolean
}
```

### race_statistics Collection (for aggregated stats)

```javascript
{
  _id: ObjectId,
  userId: String (unique, indexed),
  totalRaces: Number,
  totalWins: Number,
  totalLosses: Number,
  currentStreak: Number,
  bestStreak: Number,
  racesToday: Number,
  lastRaceDate: Date,
  updatedAt: Date
}
```

---

## Background Jobs

### 1. Race Completion Job

- **Frequency:** Every minute
- **Purpose:** Check for races that have ended and auto-complete them
- **Logic:**
  1. Find all active races where `endTime < now`
  2. For each race, call the completion logic
  3. Determine winner based on final step counts
  4. Update statistics

### 2. Shadow Score Update Job

- **Frequency:** Hourly
- **Purpose:** Update shadow scores for inactive users
- **Logic:**
  1. Find users who have been inactive for > 24 hours
  2. Recalculate their shadow scores based on decay formula
  3. Update shadow data in the database

### 3. Daily Stats Reset Job

- **Frequency:** Daily at midnight (UTC)
- **Purpose:** Reset daily race counters
- **Logic:**
  1. Reset `racesToday` to 0 for all users
  2. Update `lastRaceDate` for tracking

---

## Error Handling

All endpoints should return appropriate HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found (e.g., race doesn't exist)
- `500 Internal Server Error`: Server error

Error response format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

---

## Security Considerations

1. **Authentication:** All endpoints (except public ones) require valid JWT authentication
2. **Authorization:** Users can only access their own races and statistics
3. **Rate Limiting:** Implement rate limiting on search and create endpoints to prevent abuse
4. **Input Validation:** Validate all input parameters to prevent injection attacks
5. **Data Privacy:** Ensure user profile images and personal data are properly secured

---

## Testing Recommendations

1. **Unit Tests:** Test individual endpoint logic
2. **Integration Tests:** Test complete race flow (create → update → complete)
3. **Shadow Decay Tests:** Verify decay calculations over various time periods
4. **Concurrent Race Tests:** Test handling of multiple simultaneous races
5. **Edge Cases:** Test race expiration, user deletion, network failures

---

## Frontend Integration Notes

The frontend has been implemented with the following assumptions:

- All endpoints return JSON responses
- Authentication is handled via JWT Bearer tokens
- Race duration is configurable but defaults to 24 hours
- Shadow decay is calculated on the frontend for display purposes
- Active race status is checked on app mount and periodically refreshed

The frontend will handle:

- Real-time timer updates for active races
- Step count synchronization with device pedometer
- Race expiration detection and automatic completion
- Shadow score decay calculation for display
- Statistics caching with 30-second refresh interval
