FROM python:3.9-slim

# Install library sistem untuk OpenCV & Mediapipe
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements & install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Port default AI Service kamu
EXPOSE 5001

# Jalankan Uvicorn dengan host 0.0.0.0 agar bisa diakses dari luar container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5001"]