FROM oven/bun:1 AS base
WORKDIR /usr/src/app

COPY package.json bun.lock config.json ./
RUN bun install --frozen-lockfile --production

COPY . .

USER bun
CMD ["bun", "start"]
