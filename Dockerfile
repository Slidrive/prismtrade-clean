FROM python:3.11-slim

WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy and build frontend
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend/ .
RUN npm run build

# Copy backend code
WORKDIR /app
COPY . .

# Expose port
EXPOSE 5000

# Start app
CMD gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120 --workers 4
