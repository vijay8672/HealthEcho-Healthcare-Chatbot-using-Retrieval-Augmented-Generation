# Use the official Python image as the base
FROM python:3.9-slim 

# Set the working directory
WORKDIR /app

# Copy all backend files to the container
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port on which the Flask app will run
EXPOSE 5000

# Run the Flask application
CMD ["python", "app.py"]
