FROM node:22-slim

# Install dependencies needed for installing foundry
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install byreal-cli
RUN npm install -g @byreal-io/byreal-cli@0.3.6

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:${PATH}"
RUN foundryup

WORKDIR /app
COPY package.json index.js ./

EXPOSE 3001
CMD ["node", "index.js"]
