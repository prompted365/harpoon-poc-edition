# Multi-stage build for lightweight deployment
FROM rust:1.76-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Set up workspace
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

# Build only the service (no Python dependencies)
RUN cargo build --release -p service

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /build/target/release/service /usr/local/bin/service

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Environment
ENV RUST_LOG=info
ENV SERVICE_HOST=0.0.0.0
ENV SERVICE_PORT=8080

# Run the service
CMD ["service"]
