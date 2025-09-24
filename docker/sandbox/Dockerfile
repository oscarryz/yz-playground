# Docker image for Yz code execution sandbox
# Based on Ubuntu with isolate for secure code execution

FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libcap-dev \
    libsystemd-dev \
    golang-go \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install isolate
RUN git clone https://github.com/ioi/isolate.git /tmp/isolate && \
    cd /tmp/isolate && \
    make isolate && \
    make install && \
    rm -rf /tmp/isolate

# Install Yz compiler
RUN git clone https://github.com/oscarryz/yz.git /tmp/yz && \
    cd /tmp/yz && \
    go build -o /usr/local/bin/yzc ./cmd/yzc && \
    chmod +x /usr/local/bin/yzc && \
    rm -rf /tmp/yz

# Create workspace directory
RUN mkdir -p /workspace

# Create non-root user for sandbox execution
RUN useradd -m -s /bin/bash yzuser && \
    chown -R yzuser:yzuser /workspace && \
    chmod +x /usr/local/bin/yzc

# Set up isolate configuration
COPY isolate.conf /etc/isolate.conf
RUN chmod 644 /etc/isolate.conf

# Yz compiler is now installed in /usr/local/bin/yzc

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]
