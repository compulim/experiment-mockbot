# FROM node:lts-alpine
# FROM mcr.microsoft.com/devcontainers/javascript-node:22
FROM mcr.microsoft.com/azurelinux/distroless/nodejs:20
# FROM mcr.microsoft.com/azurelinux/base/nodejs:20

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /usr/src/app
COPY [".", "."]
# RUN chown -R node /usr/src/app

# USER node
CMD ["node", "."]
