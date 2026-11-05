# D-Track Mobile App API (Vercel Serverless + Supabase Postgres)

A serverless Node.js Express REST API to capture and retrieve device login events, optimized for deployment on **Vercel** connected to **Supabase PostgreSQL**.

---

## 🚀 Key Features

- **Vercel Serverless Ready**: Packaged as a serverless function (`api/index.js`) with automatic route rewrites (`vercel.json`).
- **Supabase Optimized**:
  - Configured for SSL.
  - Serverless connection pool sizing (`max: 5`, idle timeouts) to prevent connection exhaustion.
  - Recommends Supabase Transaction Pooler (`:6543`) designed for serverless architectures.
- **Clean & Fast**: The API is focused strictly on inserting and reading data. Database schema is kept cleanly in `schema.sql` to run once in Supabase.
- **Dual Mode**: Can run as a Vercel Serverless Function in production OR as a local Express server (`npm start`) for rapid development.

---

## 📡 API Endpoints

### 1. `POST /api/logs` (or `/api/user-login`)
Inserts a new device login event into your Supabase database.

#### **Request Headers:**
```http
Content-Type: application/json
```

#### **Request Payload (JSON):**
```json
{
  "event": "user_login",
  "emp_code": "10245",
  "device_name": "Xiaomi Redmi 12 5G",
  "android_version": "14",
  "mediadrm_id": "cd0f53b21cf95b58",
  "android_id": "cd0f53b21cf95b58",
  "app_version": "2.12.52",
  "login_time": "2026-11-05 20:15:00"
}
```

#### **Success Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Log record created successfully",
  "data": {
    "id": 1,
    "event": "user_login",
    "emp_code": "10245",
    "device_name": "Xiaomi Redmi 12 5G",
    "android_version": "14",
    "mediadrm_id": "cd0f53b21cf95b58",
    "android_id": "cd0f53b21cf95b58",
    "app_version": "2.12.52",
    "login_time": "2026-11-05T14:45:00.000Z",
    "created_at": "2026-11-05T15:20:00.000Z"
  }
}
```

---

### 2. `GET /api/logs` (or `/api/user-login`)
Retrieves stored login records in descending order (latest first).

#### **Query Parameters (Optional):**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `emp_code`| string | `null` | Filter by employee code (e.g., `?emp_code=10245`) |
| `event`   | string | `null` | Filter by event name (e.g., `?event=user_login`) |
| `limit`   | number | `50`   | Maximum number of logs to return (max `200`) |
| `offset`  | number | `0`    | Number of records to skip (for pagination) |

#### **Example Request:**
```http
GET /api/logs?emp_code=10245&limit=10
```

#### **Success Response (`200 OK`):**
```json
{
  "success": true,
  "total": 1,
  "limit": 10,
  "offset": 0,
  "count": 1,
  "data": [
    {
      "id": 1,
      "event": "user_login",
      "emp_code": "10245",
      "device_name": "Xiaomi Redmi 12 5G",
      "android_version": "14",
      "mediadrm_id": "cd0f53b21cf95b58",
      "android_id": "cd0f53b21cf95b58",
      "app_version": "2.12.52",
      "login_time": "2026-11-05T14:45:00.000Z",
      "created_at": "2026-11-05T15:20:00.000Z"
    }
  ]
}
```

---

### 3. `GET /api/logs/:emp_code`
Direct shortcut to fetch logs for an employee code:
```http
GET /api/logs/10245
```

---

### 4. `GET /api/health`
Health check endpoint testing the Supabase PostgreSQL connection:
```json
{
  "status": "healthy",
  "database": "connected",
  "platform": "Vercel Serverless",
  "timestamp": "2026-11-05T15:20:00.000Z"
}
```

---

## 🗄️ Database Schema

The table `login_logs` is created automatically on the first database call:

```sql
CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  event VARCHAR(100) NOT NULL,
  emp_code VARCHAR(100) NOT NULL,
  device_name VARCHAR(255),
  android_version VARCHAR(50),
  mediadrm_id VARCHAR(255),
  android_id VARCHAR(255),
  app_version VARCHAR(50),
  login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_logs_emp_code ON login_logs (emp_code);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs (login_time DESC);
```

---

## ☁️ Deploying to Vercel (Step-by-Step)

### Step 1: Copy Supabase Connection String
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. Go to **Project Settings** (gear icon) -> **Database**.
3. Under **Connection string**, select the **URI** tab.
4. Select **Mode: Transaction** (under Connection Pooler, port `6543`):
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   > 💡 **Why Transaction Pooler?** Serverless functions on Vercel spin up and down dynamically. Using Supabase's Transaction Pooler ensures thousands of serverless requests do not exhaust database connections.

---

### Step 2: Deploy to Vercel

#### Option A: Via GitHub & Vercel Dashboard (Recommended)
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: serverless express api for vercel"
   git branch -M main
   git remote add origin <YOUR_GITHUB_REPO_URL>
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repository.
3. In the **Environment Variables** section, add:
   - **Key**: `DATABASE_URL`
   - **Value**: *(Your Supabase Pooler URI from Step 1)*
4. Click **Deploy**.

#### Option B: Via Vercel CLI
```bash
# Run deployment directly from your terminal:
npx vercel
```
When prompted, select your project settings and add `DATABASE_URL` in your Vercel Project Settings -> Environment Variables.

---

## 🧪 Testing with cURL

### Insert a Log (POST):
```bash
curl -X POST https://your-project.vercel.app/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user_login",
    "emp_code": "10245",
    "device_name": "Xiaomi Redmi 12 5G",
    "android_version": "14",
    "mediadrm_id": "cd0f53b21cf95b58",
    "android_id": "cd0f53b21cf95b58",
    "app_version": "2.12.52",
    "login_time": "2026-11-05 20:15:00"
  }'
```

### Fetch Logs (GET):
```bash
curl -X GET https://your-project.vercel.app/api/logs?emp_code=10245
```
