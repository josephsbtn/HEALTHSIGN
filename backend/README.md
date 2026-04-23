# Hand Sign Detection Backend

Production-ready real-time hand sign detection backend using Express.js and WebSocket.

## 🏗️ Architecture

```
Express HTTP Server
├── Health Endpoints (GET /)
├── WebSocket Server (ws://)
│   ├── Connection Management
│   ├── Stream Controller
│   └── Session Management
├── AI Service Layer
│   ├── API Integration
│   └── Mock Fallback
└── Refinement Service (Optional)
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server
PORT=5000
NODE_ENV=development

# AI Service
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT=5000

# Text Refinement
ENABLE_REFINEMENT=true
REFINEMENT_SERVICE_URL=http://localhost:8001

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_STREAM_TIMEOUT=1500

# Mock Service
USE_MOCK_AI=true
MOCK_AI_DELAY_MIN=50
MOCK_AI_DELAY_MAX=150

# Logging
LOG_LEVEL=debug
```

## 📡 WebSocket Protocol

### Connection

```
ws://localhost:5000
```

### Message Format

#### 1. Send Frame

Client sends:

```json
{
  "type": "frame",
  "frame": "<base64-encoded-image-or-buffer>"
}
```

Server responds:

```json
{
  "type": "stream",
  "alphabet": "A",
  "timestamp": "2024-04-23T10:30:45.123Z"
}
```

#### 2. End Stream

Client sends:

```json
{
  "type": "end"
}
```

Server responds:

```json
{
  "type": "final",
  "text": "AKUMULASI",
  "timestamp": "2024-04-23T10:30:46.500Z"
}
```

Or server auto-ends after configured timeout (default: 1500ms).

## 🏥 Health Endpoints

### GET /

```bash
curl http://localhost:5000
```

Response:

```json
{
  "status": "ok",
  "message": "Hand Sign Detection Backend",
  "version": "1.0.0",
  "activeSessions": 2
}
```

### GET /health

```bash
curl http://localhost:5000/health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-04-23T10:30:45.123Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 50000000,
    "heapTotal": 30000000,
    "heapUsed": 15000000
  },
  "activeSessions": 2,
  "environment": "development"
}
```

## 📁 Project Structure

```
backend/
├── server.js                    # Main Express application
├── config.js                    # Configuration management
├── constants.js                 # Constants and enums
├── logger.js                    # Logging utility
├── middleware.js                # Express middleware
├── utils.js                     # Helper functions
├── package.json                 # Dependencies
├── .env                         # Environment variables
└── service/
    ├── aiService.js             # AI detection service
    ├── refinementService.js      # Text refinement service
    ├── streamController.js       # Stream handling logic
    └── webSocket.js             # WebSocket server management
```

## 🔧 Core Modules

### aiService.js

Handles frame detection via external AI API or mock fallback.

```javascript
import { detectAlphabet } from "./service/aiService.js";

const result = await detectAlphabet(frameData);
// Returns: { alphabet: "A" }
```

**Features:**

- Async API calls via axios
- Automatic mock fallback on API failure
- Configurable timeout
- Detailed error logging

### refinementService.js

Optional text refinement after stream ends.

```javascript
import { refineText } from "./service/refinementService.js";

const refined = await refineText("AKUMULASI");
// Returns: "AKUMULASI" (with refinements applied)
```

**Features:**

- Controlled via `ENABLE_REFINEMENT` env var
- Mock implementation by default
- Extensible for external APIs

### streamController.js

Manages per-connection streaming logic.

```javascript
import { StreamSession, handleMessage } from "./service/streamController.js";

const session = new StreamSession(ws, clientId);
await handleMessage(ws, message, session);
```

**Features:**

- Per-connection buffer management
- Timeout-based stream ending
- Async frame processing
- Clean session lifecycle

### webSocket.js

WebSocket server lifecycle and connection management.

```javascript
import { initWebSocketServer, getSessionCount } from "./service/webSocket.js";

initWebSocketServer(expressHttpServer);
console.log(`Active sessions: ${getSessionCount()}`);
```

**Features:**

- Graceful connection handling
- Automatic cleanup on disconnect
- Heartbeat/ping-pong for connection stability
- Session tracking

## 🛡️ Error Handling

### AI Service Failures

- Automatic fallback to mock detection
- Configurable timeouts
- Detailed error logging

### WebSocket Disconnections

- Graceful cleanup of resources
- Buffer reset on disconnect
- Connection state tracking

### Invalid Messages

- JSON validation
- Message type checking
- Detailed error responses

## 🎯 Features

✅ Real-time frame streaming  
✅ Per-connection alphabet buffering  
✅ Timeout-based stream ending  
✅ Optional text refinement  
✅ Mock AI service with fallback  
✅ Multiple concurrent connections  
✅ Heartbeat/keep-alive mechanism  
✅ Graceful shutdown  
✅ Comprehensive logging  
✅ Production-ready error handling

## 📊 Example Client (Node.js)

```javascript
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:5000");

ws.on("open", () => {
  console.log("Connected");

  // Send frames
  ws.send(
    JSON.stringify({
      type: "frame",
      frame: "BASE64_ENCODED_IMAGE",
    }),
  );
});

ws.on("message", (data) => {
  const message = JSON.parse(data);

  if (message.type === "stream") {
    console.log("Received alphabet:", message.alphabet);
  } else if (message.type === "final") {
    console.log("Final text:", message.text);
  }
});

ws.on("close", () => {
  console.log("Disconnected");
});
```

## 🔍 Monitoring

### Active Sessions

```javascript
import { getActiveSessions, getSessionCount } from "./service/webSocket.js";

console.log(`Active sessions: ${getSessionCount()}`);
getActiveSessions().forEach((session) => {
  console.log(`Client: ${session.clientId}, Buffer: ${session.buffer}`);
});
```

### Logs

Set `LOG_LEVEL` in `.env`:

- `debug`: Verbose logging
- `info`: Standard logging
- `warn`: Warnings and errors
- `error`: Only errors

## 🚨 Graceful Shutdown

The server handles `SIGTERM` and `SIGINT`:

1. Closes all WebSocket connections
2. Resets all session buffers
3. Closes HTTP server
4. Exits process

## 🔒 Security Notes

- ✅ CORS enabled (configurable)
- ✅ Request size limits (10MB)
- ✅ Input validation
- ⚠️ Add authentication as needed
- ⚠️ Implement rate limiting in production
- ⚠️ Use HTTPS/WSS in production

## 📈 Performance Considerations

- **Connection Limits**: Adjust based on server capacity
- **Memory**: Monitor with `/health` endpoint
- **Timeout Values**: Tune based on AI service latency
- **Buffer Size**: Unbounded by default (add limits if needed)
- **Heartbeat Interval**: Keep-alive at 30s intervals

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 5000
lsof -i :5000
kill -9 <PID>
```

### AI Service Connection Issues

- Set `USE_MOCK_AI=true` to use mock detection
- Check `AI_SERVICE_URL` configuration
- Review logs for detailed error messages

### WebSocket Connection Failures

- Ensure client is using correct `ws://` protocol
- Check CORS settings if cross-origin
- Verify firewall allows WebSocket connections

## 📝 API Response Examples

### Stream Message

```json
{
  "type": "stream",
  "alphabet": "A",
  "timestamp": "2024-04-23T10:30:45.123Z"
}
```

### Final Message

```json
{
  "type": "final",
  "text": "AKUMULASI",
  "timestamp": "2024-04-23T10:30:46.500Z"
}
```

## 🎓 Next Steps

1. **Connect to Real AI Service**: Update `AI_SERVICE_URL` in config
2. **Implement Refinement**: Update `refinementService.js`
3. **Add Database**: Store frame/result history
4. **Implement Authentication**: Add user/API key validation
5. **Add Rate Limiting**: Prevent abuse
6. **Deploy**: Use Docker/Kubernetes for production

## 📄 License

ISC
