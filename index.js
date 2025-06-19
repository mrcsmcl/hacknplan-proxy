require('dotenv').config();
const express = require('express');
const axios   = require('axios');

const app     = express();
const PORT    = process.env.PORT || 4765;
const API_KEY = process.env.HNP_API_KEY;
const BASE    = 'https://api.hacknplan.com/v0/projects';

if (!API_KEY) {
  console.error('❌ HNP_API_KEY is not defined!');
  process.exit(1);
}

async function fetchAllWorkItems(projectId) {
  const limit = 100;
  let offset = 0;
  let allItems = [];

  while (true) {
    const resp = await axios.get(
      `${BASE}/${projectId}/workitems`,
      {
        headers: { Authorization: `ApiKey ${API_KEY}` },
        params:  { limit, offset }
      }
    );
    let items = resp.data;
    if (!Array.isArray(items) && resp.data.items) {
      items = resp.data.items;
    }
    if (!Array.isArray(items)) {
      throw new Error(`Unexpected response: got ${typeof resp.data}`);
    }
    if (items.length === 0) break;
    allItems.push(...items);
    offset += limit;
  }

  return allItems;
}

app.get('/projects/:projectId/tasks', async (req, res) => {
  try {
    const tasks = await fetchAllWorkItems(req.params.projectId);
    res.json({ count: tasks.length, tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching tasks', detail: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Proxy running at http://0.0.0.0:${PORT}`)
);
