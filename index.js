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

if (!API_KEY) {
  process.exit(1);
}

async function fetchAllWorkItems(projectId) {
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

  return all;
}

app.get('/projects/:projectId/tasks', async (req, res) => {
  try {
    const tasks = await fetchAllWorkItems(req.params.projectId);
    res.json({ count: tasks.length, tasks });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching tasks', detail: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Server running at http://0.0.0.0:${PORT}`)
);
