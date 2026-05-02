/**
 * NoteFlow 后端入口
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');
const aiRoutes = require('./ai/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api', apiRoutes);
app.use('/api', aiRoutes);

// 生产模式：托管 Vue 构建产物
const distPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`NoteFlow server running at http://localhost:${PORT}`);
});
