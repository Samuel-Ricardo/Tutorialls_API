FROM node:20-slim as build

USER node
WORKDIR /home/node/app

COPY --chown=node:node package*.json ./
RUN npm ci

COPY --chown=node:node . .
RUN npm run build:docker

#CMD ["npm", "run", "start:dev"]
#CMD [ "tails", "-f", "/dev/null" ]

FROM node:20-slim as production

USER node
WORKDIR /home/node/app

COPY --chown=node:node --from=build /home/node/app/node_modules ./node_modules
COPY --chown=node:node --from=build /home/node/app/package*.json ./
COPY --chown=node:node --from=build /home/node/app/dist ./dist

CMD [ "npm", "run", "start:docker" ]




