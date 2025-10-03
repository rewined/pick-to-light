FROM node:18-alpine

# Install Tailscale
RUN apk add --no-cache ca-certificates iptables ip6tables curl
RUN curl -fsSL https://tailscale.com/install.sh | sh

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (none needed for now, but good practice)
RUN npm install --production || true

# Copy application files
COPY . .

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8080

CMD ["/app/start.sh"]
