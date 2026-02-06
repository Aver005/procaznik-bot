FROM oven/bun:1 AS base
WORKDIR /usr/src/app

COPY package.json bun.lock config.json ./
RUN bun install --frozen-lockfile --production

COPY . .

# Create data directory and set permissions
RUN mkdir -p data && chown -R bun:bun data

USER bun
CMD ["bun", "start"]
