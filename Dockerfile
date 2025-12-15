FROM node:22-alpine

# Install system dependencies
# Alpine uses apk which is much faster than apt
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++ \
    curl \
    unzip \
    git \
    cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (skip postinstall because src isn't copied yet)
RUN npm install --ignore-scripts

# Copy source
COPY src ./src

# Build whisper.cpp from source
RUN git clone https://github.com/ggerganov/whisper.cpp.git /whisper \
    && cd /whisper \
    && make \
    && cp main /usr/local/bin/whisper \
    && cd /app \
    && rm -rf /whisper

# Create models directory and download model
RUN npx ts-node src/scripts/download-model.ts

# Build TypeScript
RUN npm run build

# Create directories for runtime data
RUN mkdir -p logs temp_chunks

# Environment defaults
ENV NODE_ENV=production
ENV WHISPER_MODEL_PATH=/app/models/ggml-base.en.bin
ENV STREAM_URL=""
ENV MONGO_URI=""

# Start the application
CMD ["node", "dist/index.js"]
