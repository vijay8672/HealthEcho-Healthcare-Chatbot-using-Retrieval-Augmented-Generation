# Use the official Nginx image as the base image
FROM nginx:alpine

# Copy static files to Nginx’s default directory
COPY ./docker_frontend/ /usr/share/nginx/html/

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
