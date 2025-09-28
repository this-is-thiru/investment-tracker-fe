import express from 'express';
import { join } from 'path';

const app = express();
const distFolder = join(process.cwd(), 'dist/browser');

// Serve static files
app.use(express.static(distFolder));

// All other routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(join(distFolder, 'index.html'));
});

// Start server
const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  console.log(`CSR Angular app running at http://localhost:${port}`);
});
