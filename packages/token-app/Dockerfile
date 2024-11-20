FROM mcr.microsoft.com/azurelinux/distroless/nodejs:20

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /usr/src/app
COPY [".", "."]

CMD ["node", "."]
