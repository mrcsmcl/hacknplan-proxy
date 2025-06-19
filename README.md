# hacknplan-proxy

Proxy service to fetch **all** workitems from a HacknPlan project, automatically paginating.

## How it works

- Runs on Express.js
- Reads `HNP_API_KEY` from environment
- Paginates all `/workitems` (100 per call) and returns everything
- No need to pass headers on the client: just `GET /projects/{id}/tasks`

## Running locally

1. Copy and fill in `.env`:
   ```bash
   HNP_API_KEY=your_token
   PORT=3000
   ```
