import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'basic-site' });
});

<<<<<<< HEAD
=======
app.get('/api/status', (_req, res, next) => {
  res.json({ status:'healthy', service: 'testing' });
})

>>>>>>> main
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`basic-site running on http://localhost:${port}`);
});
