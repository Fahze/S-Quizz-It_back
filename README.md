# S-Quizz It! - Backend WebSocket API

A real-time quiz application backend built with Nitro and WebSockets, featuring salon-based multiplayer quizzes.

## Table of Contents

- [Quick Start](#quick-start)
- [WebSocket Connection](#websocket-connection)
- [Authentication](#authentication)
- [Available Actions](#available-actions)
- [Game Flow](#game-flow)
- [Message Formats](#message-formats)
- [Error Handling](#error-handling)

## Quick Start

Look at the [Nitro quick start](https://nitro.unjs.io/guide#quick-start) to learn more about the framework.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## WebSocket Connection

### Connection URL

```
ws://localhost:3000/_ws
```

### Required Protocol Header

The WebSocket connection must include authentication in the protocol header:

```javascript
const ws = new WebSocket('ws://localhost:3000/_ws', ['auth', 'your-jwt-token-here']);
```

## Authentication

All WebSocket connections require a valid Supabase JWT token passed in the protocol header. The server will:

1. Extract the token from `sec-websocket-protocol` header
2. Validate the token with Supabase
3. Attach user and profile information to the peer
4. Subscribe the user to the general 'salons' topic

**Invalid authentication will result in connection closure.**

## Available Actions

### 1. Fetch Salons

**Message:** `"fetch"`

**Description:** Retrieves all available normal salons and current salon states.

**Response:**

```json
{
  "type": "salons_init",
  "salons": [
    {
      "id": 1,
      "label": "Salon-ABC123",
      "difficulte": 1,
      "type": "normal",
      "j_max": 4,
      "j_actuelle": 2,
      "commence": false
    }
  ]
}
```

### 2. Create Normal Salon

**Message:** `"create:{\"difficulte\":2,\"j_max\":6,\"label\":\"My Salon\"}"`

**Parameters:**

- `difficulte` (number): Difficulty level (1-3)
- `j_max` (number): Maximum players
- `label` (string): Salon name

**Success Response:**

```json
{
  "type": "success",
  "message": "Salon normal créé avec succès"
}
```

### 3. Create/Join Rapid Salon

**Message:** `"rapide"`

**Description:** Creates a new rapid salon or joins an existing one. Rapid salons:

- Have difficulty level 2
- Maximum 4 players
- Players are automatically set as ready

**Success Response:**

```json
{
  "type": "success",
  "message": "Salon rapide créé avec succès"
}
```

### 4. Join Salon

**Message:** `"connect-{salonId}"`

**Example:** `"connect-123"`

**Description:** Join a specific salon by ID.

**Success Response:**

```json
{
  "user": "salon-123",
  "type": "join",
  "salonId": 123,
  "players": {
    "peer1": {
      "userId": "user1",
      "profile": {
        "id": "profile1",
        "pseudo": "Player1",
        "avatar": "avatar.jpg",
        "elo": 1200
      },
      "score": 0,
      "connected": true,
      "isReady": false,
      "finished": false
    }
  },
  "message": "Vous avez rejoint le salon Salon-ABC123"
}
```

### 5. Leave Salon

**Message:** `"leave-{salonId}"`

**Example:** `"leave-123"`

**Description:** Leave the specified salon.

### 6. Toggle Ready Status

**Message:** `"ready-{salonId}"`

**Example:** `"ready-123"`

**Description:** Toggle your ready status in the salon. All players must be ready to start the game.

**Response:**

```json
{
  "user": "salon-123",
  "type": "ready",
  "salonId": 123,
  "message": "peer123 est prêt"
}
```

### 7. Start Game

**Message:** `"start-{salonId}"`

**Example:** `"start-123"`

**Description:** Start the game if all players are ready.

**Success Response:** 3-second countdown followed by:

```json
{
  "user": "salon-123",
  "type": "game-start",
  "salonId": 123,
  "message": {
    "joueurs": {...},
    "partieCommencee": true,
    "questions": [...],
    "currentQuestionIndex": 0
  }
}
```

### 8. Answer Question

**Message:** `"answer:{\"salonId\":123,\"questionId\":456,\"tempsReponse\":5000,\"answerId\":789}"`

**Parameters:**

- `salonId` (number): Current salon ID
- `questionId` (number): Question being answered
- `tempsReponse` (number): Response time in milliseconds
- `answerId` (number, optional): For multiple choice questions
- `answerText` (string, optional): For text-based questions

**Response:**

```json
{
  "user": "salon-123",
  "type": "answer_result",
  "salonId": 123,
  "questionId": 456,
  "correct": true,
  "pointsGagnes": 150
}
```

## Game Flow

### 1. Salon Creation/Joining

1. Connect to WebSocket with authentication
2. Create or join a salon
3. Wait for other players

### 2. Game Preparation

1. All players toggle ready status
2. Any player can start the game when all are ready
3. 3-second countdown begins

### 3. Game Play

1. Questions are sent automatically
2. Players submit answers with timing
3. Results are calculated and broadcast
4. Next question is sent when all players have answered

### 4. Game End

1. After final question, rankings are calculated
2. Final results are broadcast
3. Salon is automatically cleaned up after 1 minute

## Message Formats

### Server Messages

All server messages follow this structure:

```json
{
  "user": "server" | "salon-{id}",
  "type": "error" | "salons_init" | "join" | "leave" | "ready" | "game-start" | "answer_result",
  "salonId": 123,
  "message": "..."
}
```


