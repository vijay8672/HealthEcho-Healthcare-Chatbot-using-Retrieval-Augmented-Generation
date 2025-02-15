# Use the official Nginx image as the base image
FROM nginx:alpine

# Set the working directory
WORKDIR /usr/share/nginx/html

# Copy HTML and CSS files from docker_frontend to Nginx directory
COPY docker_frontend/index.html .
COPY docker_frontend/styles.css .

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
