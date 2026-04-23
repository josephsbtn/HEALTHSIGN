# 🧪 COMPREHENSIVE TEST SUITE & VALIDATION GUIDE

## Running Tests

### Prerequisites

```bash
npm install --save-dev jest @babel/preset-env @babel/register
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
npm test -- __tests__/utils.test.js
npm test -- __tests__/aiService.test.js
npm test -- __tests__/streamController.test.js
npm test -- __tests__/historyService.test.js
npm test -- __tests__/integration.test.js
```

### Run with Coverage

```bash
npm test -- --coverage
```

### Watch Mode (Development)

```bash
npm test -- --watch
```

---

## Test Files Overview

### 1. `__tests__/utils.test.js`

**What it tests:** Utility functions and message formatting

**Test Cases:**

- Message validation (frame, end, connect types)
- Error handling for invalid messages
- Response formatting (stream, final, error)
- Client ID generation uniqueness

**Coverage:** 100% of utils.js

---

### 2. `__tests__/aiService.test.js`

**What it tests:** AI detection service

**Test Cases:**

- Mock detection returns valid alphabets
- API fallback on error
- Timeout handling
- Empty/null frame handling
- Invalid response handling

**Coverage:**

- ✅ detectAlphabet
- ✅ detectAlphabetMock
- ✅ detectAlphabetFromAPI

---

### 3. `__tests__/streamController.test.js`

**What it tests:** Stream session management and message handling

**Test Cases:**

- Session creation and lifecycle
- Buffer accumulation
- Stream response sending
- End message handling
- Race condition prevention (double finalization)
- Timeout handling
- Input validation
- Malformed JSON handling

**Coverage:**

- ✅ StreamSession class (all methods)
- ✅ handleMessage function
- ✅ handleFrameMessage
- ✅ handleEndMessage

---

### 4. `__tests__/integration.test.js`

**What it tests:** Full end-to-end pipeline

**Scenarios:**

1. **Complete Flow:** Connect → Send Frames → End → Save
   - Verify all steps execute correctly
   - Confirm history is attempted to be saved
   - Check streaming responses are sent

2. **Timeout Handling:** Frame times out if no further frames sent
   - Verify timeout fires after 1500ms
   - Confirm final response sent

3. **Buffer Overflow:** Buffer exceeds MAX_BUFFER_SIZE
   - Verify stream ends automatically
   - Final response sent

4. **Frame Size Validation:** Oversized frames rejected
   - Error response sent
   - No processing occurs

5. **Concurrent Operations:** Multiple frames sent rapidly
   - All processed safely
   - No race conditions

6. **Error Scenarios:** DB failure, disconnection
   - System continues gracefully
   - Final response still sent

---

### 5. `__tests__/historyService.test.js`

**What it tests:** Database operations

**Test Cases:**

- Create with valid data
- Create with missing fields (reject)
- Query by patientId
- Query all records
- Delete by patientId
- Error handling
- Empty results
- Data validation (special chars, long text)

**Coverage:**

- ✅ createHistory
- ✅ getHistoryByPatient
- ✅ getAllHistory
- ✅ deleteHistoryByPatient

---

## Manual Testing Checklist

### 1. Environment Setup

```bash
# Clear previous runs
rm -rf node_modules package-lock.json

# Install fresh
npm install

# Create .env from .env.example
cp .env.example .env

# Edit .env with local values
nano .env
```

### 2. Database Connectivity

```bash
# Verify MongoDB connection
# Check MONGO_URI in .env is correct

npm start
# Check logs:
# ✓ Connected to MongoDB
# ✓ Database ready for operations
```

### 3. WebSocket Connection

**Test Client Code:**

```javascript
const WebSocket = require("ws");

const ws = new WebSocket("ws://localhost:8000");

ws.on("open", () => {
  console.log("✓ Connected to backend");

  // Send connect with patient ID
  ws.send(
    JSON.stringify({
      type: "connect",
      patientId: "test_patient_001",
    }),
  );
});

ws.on("message", (data) => {
  const msg = JSON.parse(data);
  console.log(`[${msg.type}]`, msg);
});

ws.on("close", () => {
  console.log("Disconnected");
});

// Send test frames
setTimeout(() => {
  ws.send(
    JSON.stringify({
      type: "frame",
      frame: "test_frame_1",
    }),
  );
}, 1000);
```

### 4. API Service Tests

```bash
# Test health endpoint
curl http://localhost:8000/
curl http://localhost:8000/health

# Expected response:
# { "status": "ok", "activeSessions": 0, ... }
```

### 5. Error Scenarios

**Test Invalid Message:**

```bash
wscat -c ws://localhost:8000
> {"type": "invalid"}
# Should receive error response
```

**Test Oversized Frame:**

```bash
# In client, send 10MB frame
ws.send(JSON.stringify({
  type: 'frame',
  frame: 'x'.repeat(10 * 1024 * 1024)
}));
# Should receive size error
```

**Test Disconnection:**

```bash
# Connect and send frame
# Then disconnect
# Verify no crashes in server logs
# Verify session cleanup in logs
```

---

## Pre-Production Validation

### Security Checklist

- [ ] No hardcoded API keys in code
- [ ] MONGO_URI only in .env
- [ ] GEMINI_API_KEY only in .env
- [ ] .env is in .gitignore
- [ ] No credentials in git history

```bash
# Scan for hardcoded secrets
git log -p | grep -i "key\|password\|secret"
grep -r "mongodb+srv://" src/ service/ database/
```

### Performance Checks

- [ ] Startup time < 2 seconds
- [ ] Health endpoint responds < 50ms
- [ ] Frame processing < 200ms (with mock)
- [ ] Memory usage stable over 1 hour
- [ ] No memory leaks on disconnection

```bash
# Monitor memory
npm start &
sleep 60
ps aux | grep node
kill %1
```

### Error Handling Tests

- [ ] DB connection failure: Server exits cleanly
- [ ] Invalid JSON: Error response sent
- [ ] Oversized frame: Error response sent
- [ ] Timeout: Final response sent
- [ ] Refinement API failure: Fallback to mock
- [ ] AI API failure: Fallback to mock

---

## Stress Testing

### Simulate 10 Concurrent Connections

```bash
npm install -g artillery

# Create load-test.yml
```

```yaml
config:
  target: "ws://localhost:8000"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Stream Scenario"
    flow:
      - think: 1
      - ws.send:
          payload: '{"type":"connect","patientId":"patient_{{ $randomString(5) }}"}'
      - think: 0.2
      - ws.send:
          payload: '{"type":"frame","frame":"data_{{ $randomNumber(1,1000) }}"}'
      - think: 2
      - ws.send:
          payload: '{"type":"end"}'
```

```bash
artillery run load-test.yml
```

### Expected Results

- Zero errors
- Avg response time < 100ms
- Memory usage stable
- CPU usage < 50%

---

## Database Validation

### Verify Schema

```bash
# In MongoDB
use health_sign
db.histories.findOne()

# Should show:
{
  "_id": ObjectId(...),
  "patientId": "patient_xxx",
  "detectedText": "AKUMULASI",
  "refinedText": "AKUMULASI",
  "frameCount": 9,
  "createdAt": ISODate(...),
  "processedAt": ISODate(...),
  "__v": 0
}
```

### Check Indexes

```bash
db.histories.getIndexes()

# Should show:
# - { "patientId": 1, "createdAt": -1 }
# - { "createdAt": -1 }
```

---

## Deployment Commands

### Install Dependencies

```bash
npm ci  # Use ci for production (uses package-lock.json)
```

### Run Tests Before Deploy

```bash
npm test -- --coverage
# Coverage should be > 80%
```

### Environment Setup

```bash
# Verify .env
cat .env

# Should have:
# MONGO_URI=<production mongodb uri>
# GEMINI_API_KEY=<valid api key>
# NODE_ENV=production
# USE_MOCK_AI=false (to use real AI)
# ENABLE_REFINEMENT=true
```

### Start Production Server

```bash
NODE_ENV=production npm start
```

### Verify Server Health

```bash
curl http://localhost:8000/health
# Response: { "status": "healthy", ... }
```

---

## Monitoring in Production

### Key Metrics

```javascript
GET /health

Response fields to monitor:
- uptime: Restart detection
- memory.heapUsed: Memory leak detection
- activeSessions: Load tracking
```

### Alerting Rules

- Alert if uptime resets (unexpected restart)
- Alert if heap memory > 500MB
- Alert if activeSessions > 1000
- Alert if response time > 1s

### Logs to Monitor

```bash
# Stream logs
tail -f /var/log/healthsign-backend.log

# Alert on:
# ERROR
# CRITICAL
# Failed to save history
# Database connection error
```

---

## Rollback Plan

If deployment fails:

1. **Immediate Actions**

   ```bash
   pm2 stop healthsign-backend
   git checkout main  # or last known good commit
   npm install
   npm test
   ```

2. **Restart**

   ```bash
   pm2 start server.js --name healthsign-backend
   pm2 logs healthsign-backend
   ```

3. **Verify**
   ```bash
   curl http://localhost:8000/health
   ```

---

## Test Results Template

Document test results before each deploy:

```
Date: 2024-04-23
Environment: staging
Node Version: 18.x
MongoDB: 6.x

Test Results:
- Unit Tests: ✓ PASS (45/45 tests)
- Integration Tests: ✓ PASS (12/12 tests)
- Load Test (10 concurrent): ✓ PASS
- Memory Leak Test (1 hour): ✓ PASS

Performance:
- Startup: 1.2s
- Health endpoint: 15ms
- Frame processing: 85ms (avg)
- Final response: 200ms (avg)

Security:
- No hardcoded secrets: ✓
- Environment variables: ✓
- Input validation: ✓
- Error handling: ✓

Status: ✓ READY FOR PRODUCTION
Approved by: [name]
```
