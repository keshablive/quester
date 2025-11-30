# Stage 1: Base
# Common dependencies for both dev and prod
FROM golang:1.24-alpine AS base
WORKDIR /app
# Install system dependencies
# ffmpeg: for video processing
# git: for go mod download
# make: for build scripts
RUN apk add --no-cache ffmpeg git make ca-certificates tzdata

# Stage 2: Development
# Used for local development with Air (live reload) & Delve (debugging)
FROM base AS dev

# Copy go mod/sum first for caching
COPY server/go.mod server/go.sum ./
RUN go mod download

# Install Air for live reloading (after go mod download for better caching)
RUN go install github.com/air-verse/air@v1.61.0
# Install Delve for debugging
RUN go install github.com/go-delve/delve/cmd/dlv@latest

# Copy source code (though in docker-compose we mount it, this is a fallback)
COPY server/ .

# Expose port and debug port
EXPOSE 8000 2345

# Default command is air
CMD ["air", "-c", ".air.toml"]

# Stage 3: Builder
# Compiles the application for production
FROM base AS builder
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ .
# Build optimized binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o bin/server cmd/server/main.go

# Stage 4: Production
# Minimal runtime image
FROM alpine:latest AS prod
WORKDIR /app
RUN apk add --no-cache ffmpeg ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/bin/server .
# Copy migrations
COPY --from=builder /app/internal/migrations ./internal/migrations
# Copy keys
COPY --from=builder /app/.keys ./.keys

EXPOSE 8000
CMD ["./server"]
