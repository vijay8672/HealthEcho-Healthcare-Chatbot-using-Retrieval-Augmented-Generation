# Use Nginx as the base image
FROM nginx:alpine 

# Copy HTML and CSS files to Nginx directory
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
