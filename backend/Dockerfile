FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

# Aggiungi --host per permettere connessioni dall'esterno del container
CMD ["npx", "serverless", "offline", "start", "--host", "0.0.0.0"]