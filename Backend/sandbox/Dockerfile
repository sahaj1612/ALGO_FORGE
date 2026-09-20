FROM alpine:3.20

# Install compilers and runtime dependencies
RUN apk add --no-cache gcc g++ musl-dev openjdk21 python3 bash

# Create non-root runner user with UID/GID 1000 for rootless execution
RUN addgroup -g 1000 sandbox && \
    adduser -u 1000 -G sandbox -D -s /bin/bash sandbox && \
    mkdir -p /workspace /tmp && \
    chown -R sandbox:sandbox /workspace /tmp

USER sandbox:sandbox
WORKDIR /workspace