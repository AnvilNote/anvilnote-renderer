# AnvilNote renderer image.
#
# Bundles the renderer, the Typst CLI, and the AnvilNote font bundle so PDF
# output is reproducible and never depends on system fonts. No Microsoft /
# commercial fonts are installed.

FROM node:22-bookworm-slim AS base

ARG TYPST_VERSION=0.14.2
WORKDIR /app

# Typst CLI (pinned). Installed from the official static release tarball.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl xz-utils \
 && curl -fsSL "https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/typst-x86_64-unknown-linux-musl.tar.xz" \
      -o /tmp/typst.tar.xz \
 && tar -xJf /tmp/typst.tar.xz -C /tmp \
 && mv /tmp/typst-x86_64-unknown-linux-musl/typst /usr/local/bin/typst \
 && rm -rf /tmp/typst* \
 && apt-get purge -y curl xz-utils \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Install dependencies against the lockfile first for layer caching.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# App sources.
COPY tsconfig.json ./
COPY src ./src
COPY templates ./templates

# Bundled fonts. The renderer compiles with --font-path /app/fonts and
# --ignore-system-fonts, so these are the ONLY fonts available.
COPY fonts /app/fonts
ENV ANVILNOTE_FONT_DIR=/app/fonts
ENV ANVILNOTE_IGNORE_SYSTEM_FONTS=true
ENV TYPST_BIN=typst

RUN pnpm build

# Fail the build if any required font family is missing from the image (loud,
# never silent). All 19 required families are bundled in fonts/.
RUN pnpm fonts:verify

ENTRYPOINT ["node", "dist/cli.js"]
