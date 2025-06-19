const express = require('express');
const axios   = require('axios');
const cors    = require('cors');
require('dotenv').config();

const app     = express();
const PORT    = process.env.PORT || 4765;
const API_KEY = process.env.HNP_API_KEY;
const BASE    = 'https://api.hacknplan.com/v0/projects';

app.use(cors());
app.use('/static', express.static(__dirname + '/public'));
app.use('/', express.static(__dirname + '/public'));
app.disable('x-powered-by');

if (!API_KEY) {
  process.exit(1);
}

const cache = new Map();
const cacheTimestamps = new Map();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

async function fetchAllWorkItems(projectId, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache.has(projectId) && (now - cacheTimestamps.get(projectId) < CACHE_TTL_MS)) {
    return cache.get(projectId);
  }
  const limit = 100;
  let offset = 0;
  let all    = [];

  while (true) {
    const { data } = await axios.get(
      `${BASE}/${projectId}/workitems`,
      {
        headers: { Authorization: `ApiKey ${API_KEY}` },
        params:  { limit, offset }
      }
    );
    const items = Array.isArray(data) ? data : data.items || [];
    if (items.length === 0) break;
    all.push(...items);
    offset += limit;
  }
  cache.set(projectId, all);
  cacheTimestamps.set(projectId, now);
  return all;
}

app.get('/projects/:projectId/tasks', async (req, res) => {
  const projectId = req.params.projectId;
  const now = Date.now();
  let tasks = [];
  let fromCache = false;
  if (cache.has(projectId) && (now - cacheTimestamps.get(projectId) < CACHE_TTL_MS)) {
    tasks = cache.get(projectId);
    fromCache = true;
  } else {
    tasks = await fetchAllWorkItems(projectId);
    fromCache = false;
  }
  res.json({ count: tasks.length, tasks });
  // Always update cache in the background if cache is old or missing
  if (fromCache) {
    fetchAllWorkItems(projectId, true).catch(() => {});
  }
});

app.get('/projects/:projectId/cache.txt', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const tasks = await fetchAllWorkItems(projectId, true);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline');
    res.send(JSON.stringify(tasks, null, 2));
  } catch (err) {
    res.status(500).send('Error generating cache file.');
  }
});

app.listen(PORT, () =>
  console.log(`Server running at http://0.0.0.0:${PORT}`)
);
