FROM node:18-alpine

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /usr/src/app
COPY [".", "."]
RUN chown -R node /usr/src/app

USER node
CMD ["node", "."]
