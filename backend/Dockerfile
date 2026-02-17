# Use official Python runtime as a parent image
FROM python:3.11-alpine

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install dependencies
RUN apk add --no-cache \
    postgresql-dev \
    gcc \
    python3-dev \
    musl-dev

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create a non-root user and set permissions for /data (mounted via volume)
# Note: Since /data is mounted, we need to ensure the worker has permission.
# We'll create a user but the permission handling for volumes is often 
# handled by the host in dev environments, but we set it up here for correctness.
RUN adduser --disabled-password --gecos "" django-user
RUN chown -R django-user:django-user /app

USER django-user

# Port is exposed via docker-compose
