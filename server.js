const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'data/handwriting_samples/');
    },
    filename: (req, file, cb) => {
        cb(null, `${req.body.styleName}/${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/save-style', upload.single('styleData'), async (req, res) => {
    try {
        const { styleName, char } = req.body;
        const filePath = path.join('data', 'handwriting_samples', styleName, `${char}.svg`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, req.file.buffer);
        res.json({ success: true, message: 'Style saved successfully' });
    } catch (error) {
        console.error('Error saving style:', error);
        res.status(500).json({ success: false, message: 'Failed to save style' });
    }
});

app.get('/api/styles', async (req, res) => {
    try {
        const styles = await getStyles();
        res.json(styles);
    } catch (error) {
        console.error('Error getting styles:', error);
        res.status(500).json({ success: false, message: 'Failed to get styles' });
    }
});

app.get('/api/style/:styleName/:char', async (req, res) => {
    try {
        const { styleName, char } = req.params;
        const filePath = path.join('data', 'handwriting_samples', styleName, `${char}.svg`);
        const data = await fs.readFile(filePath, 'utf8');
        res.send(data);
    } catch (error) {
        console.error('Error getting character data:', error);
        res.status(404).json({ success: false, message: 'Character not found' });
    }
});

app.delete('/api/style/:styleName', async (req, res) => {
    try {
        const { styleName } = req.params;
        const dirPath = path.join('data', 'handwriting_samples', styleName);
        await fs.rmdir(dirPath, { recursive: true });
        res.json({ success: true, message: 'Style deleted successfully' });
    } catch (error) {
        console.error('Error deleting style:', error);
        res.status(500).json({ success: false, message: 'Failed to delete style' });
    }
});

app.post('/api/train-model', async (req, res) => {
    try {
        const { styleName } = req.body;
        // Implement model training logic here
        res.json({ success: true, message: 'Model trained successfully' });
    } catch (error) {
        console.error('Error training model:', error);
        res.status(500).json({ success: false, message: 'Failed to train model' });
    }
});

app.post('/api/export-model', async (req, res) => {
    try {
        const { styleName } = req.body;
        const modelPath = path.join('models', 'trained_models', `${styleName}_model.json`);
        const modelData = await fs.readFile(modelPath, 'utf8');
        res.json({ success: true, modelData });
    } catch (error) {
        console.error('Error exporting model:', error);
        res.status(500).json({ success: false, message: 'Failed to export model' });
    }
});

// Helper function to get styles
async function getStyles() {
    const stylesDir = path.join('data', 'handwriting_samples');
    const styles = [];
    const styleDirs = await fs.readdir(stylesDir);
    
    for (const styleName of styleDirs) {
        const styleDir = path.join(stylesDir, styleName);
        const files = await fs.readdir(styleDir);
        const characters = files.map(file => path.parse(file).name);
        styles.push({ name: styleName, characters });
    }
    
    return styles;
}

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
