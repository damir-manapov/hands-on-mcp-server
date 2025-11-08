#!/usr/bin/env bash

set -e

echo "Formatting code..."
pnpm format

echo "Checking code formatting..."
pnpm format:check

echo "Checking linting errors..."
pnpm lint

echo "Type checking..."
pnpm typecheck

echo "Running tests..."
pnpm test --run

echo "All checks passed!"

