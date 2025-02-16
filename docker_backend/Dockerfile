# Base image with Python
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the project files
COPY . .

# Expose the port Flask will run on
EXPOSE 5000

# Set environment variables (optional, for production)
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Start the Flask app
CMD ["python", "app.py"]
