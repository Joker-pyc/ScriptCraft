// Global variables
let currentTool = 'pen';
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let ctx;
let outputCtx;
let currentColor = '#000000';
let currentWidth = 2;
let trainer;

// DOM Elements
const handwritingCanvas = document.getElementById('handwriting-canvas');
const outputCanvas = document.getElementById('output-canvas');
const clearBtn = document.getElementById('clear-canvas');
const saveBtn = document.getElementById('save-style');
const convertBtn = document.getElementById('convert-btn');
const downloadBtn = document.getElementById('download-btn');
const inputText = document.getElementById('input-text');
const colorPicker = document.getElementById('color-picker');
const strokeWidth = document.getElementById('stroke-width');
const penTool = document.getElementById('pen-tool');
const eraserTool = document.getElementById('eraser-tool');
const styleSelector = document.getElementById('handwriting-style');
const handwritingName = document.getElementById('handwriting-name');
const currentChar = document.getElementById('current-char');
const trainModelBtn = document.getElementById('train-model');
const exportModelBtn = document.getElementById('export-model');
const progressBar = document.getElementById('progress-bar');
const trainingStatus = document.getElementById('training-status');

// Initialize the app
async function init() {
    ctx = handwritingCanvas.getContext('2d');
    outputCtx = outputCanvas.getContext('2d');
    
    // Set up event listeners for mouse and touch events
    handwritingCanvas.addEventListener('mousedown', startDrawing);
    handwritingCanvas.addEventListener('mousemove', draw);
    handwritingCanvas.addEventListener('mouseup', stopDrawing);
    handwritingCanvas.addEventListener('mouseout', stopDrawing);
    
    handwritingCanvas.addEventListener('touchstart', handleTouchStart);
    handwritingCanvas.addEventListener('touchmove', handleTouchMove);
    handwritingCanvas.addEventListener('touchend', handleTouchEnd);
    
    clearBtn.addEventListener('click', clearCanvas);
    saveBtn.addEventListener('click', saveStyle);
    convertBtn.addEventListener('click', convertText);
    downloadBtn.addEventListener('click', downloadImage);
    
    colorPicker.addEventListener('change', updateColor);
    strokeWidth.addEventListener('input', updateStrokeWidth);
    penTool.addEventListener('click', () => setTool('pen'));
    eraserTool.addEventListener('click', () => setTool('eraser'));

    trainModelBtn.addEventListener('click', trainModel);
    exportModelBtn.addEventListener('click', exportModel);

    // Initialize HandwritingTrainer
    trainer = new HandwritingTrainer();
    await trainer.init();

    // Load saved styles
    updateStyleList();
    populateStyleSelector();
}

// Drawing functions
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
    draw(e);
}

function draw(e) {
    if (!isDrawing) return;
    
    e.preventDefault();
    
    const [x, y] = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.lineWidth = currentWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
    ctx.stroke();

    lastX = x;
    lastY = y;
}

function stopDrawing() {
    isDrawing = false;
}

function getCoordinates(e) {
    const rect = handwritingCanvas.getBoundingClientRect();
    const scaleX = handwritingCanvas.width / rect.width;
    const scaleY = handwritingCanvas.height / rect.height;

    if (e.type.startsWith('touch')) {
        return [
            (e.touches[0].clientX - rect.left) * scaleX,
            (e.touches[0].clientY - rect.top) * scaleY
        ];
    } else {
        return [
            (e.clientX - rect.left) * scaleX,
            (e.clientY - rect.top) * scaleY
        ];
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    startDrawing(e.touches[0]);
}

function handleTouchMove(e) {
    e.preventDefault();
    draw(e.touches[0]);
}

function handleTouchEnd(e) {
    e.preventDefault();
    stopDrawing();
}

function clearCanvas() {
    ctx.clearRect(0, 0, handwritingCanvas.width, handwritingCanvas.height);
}

// Style management functions
async function saveStyle() {
    const styleData = handwritingCanvas.toDataURL('image/svg+xml');
    const styleName = handwritingName.value;
    const char = currentChar.value;
    
    if (styleName && char) {
        const fileName = `${char}.svg`;
        const path = `data/handwriting_samples/${styleName}/${fileName}`;
        
        try {
            await saveFile(path, styleData);
            updateStyleList();
            populateStyleSelector();
            alert('Style saved successfully!');
        } catch (error) {
            console.error('Error saving style:', error);
            alert('Failed to save style. Please try again.');
        }
    } else {
        alert('Please enter a handwriting name and current character.');
    }
}

function updateStyleList() {
    const styleList = document.getElementById('style-list');
    styleList.innerHTML = '';
    
    const styles = getStyles();
    for (const style of styles) {
        const styleItem = document.createElement('div');
        styleItem.className = 'style-item';
        styleItem.innerHTML = `
            <h3>${style.name}</h3>
            <p>Characters: ${style.characters.join(', ')}</p>
            <button class="action-btn" onclick="editStyle('${style.name}')">Edit</button>
            <button class="action-btn" onclick="deleteStyle('${style.name}')">Delete</button>
        `;
        styleList.appendChild(styleItem);
    }
}

function getStyles() {
    const styles = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('data/handwriting_samples/')) {
            const [, , styleName, fileName] = key.split('/');
            const char = fileName.split('.')[0];
            
            let style = styles.find(s => s.name === styleName);
            if (!style) {
                style = { name: styleName, characters: [] };
                styles.push(style);
            }
            style.characters.push(char);
        }
    }
    return styles;
}

function editStyle(styleName) {
    handwritingName.value = styleName;
    // Load the first character of the style for editing
    const style = getStyles().find(s => s.name === styleName);
    if (style && style.characters.length > 0) {
        currentChar.value = style.characters[0];
        const path = `data/handwriting_samples/${styleName}/${style.characters[0]}.svg`;
        const svgData = localStorage.getItem(path);
        if (svgData) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, handwritingCanvas.width, handwritingCanvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = svgData;
        }
    }
}

function deleteStyle(styleName) {
    if (confirm(`Are you sure you want to delete the style "${styleName}"?`)) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`data/handwriting_samples/${styleName}/`)) {
                localStorage.removeItem(key);
            }
        }
        updateStyleList();
        populateStyleSelector();
    }
}

function populateStyleSelector() {
    styleSelector.innerHTML = '<option value="">Select a style</option>';
    const styles = getStyles();
    for (const style of styles) {
        const option = document.createElement('option');
        option.value = style.name;
        option.textContent = style.name;
        styleSelector.appendChild(option);
    }
}

// Text conversion functions
async function convertText() {
    const text = inputText.value;
    if (!text) return;

    outputCtx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    let x = 10;
    let y = 50;

    const selectedStyle = styleSelector.value;
    if (selectedStyle) {
        for (let char of text) {
            const charData = await getCharacterData(selectedStyle, char);
            if (charData) {
                outputCtx.putImageData(charData, x, y);
                x += charData.width + 5;
                if (x > outputCanvas.width - 50) {
                    x = 10;
                    y += charData.height + 10;
                }
            }
        }
    } else {
        for (let char of text) {
            const charImageData = await generateCharImageData(char);
            const generatedChar = await trainer.generateHandwriting(charImageData);
            drawGeneratedChar(generatedChar, x, y);
            x += 30;
            if (x > outputCanvas.width - 50) {
                x = 10;
                y += 40;
            }
        }
    }
}

async function getCharacterData(styleName, char) {
    const path = `data/handwriting_samples/${styleName}/${char}.svg`;
    const svgData = localStorage.getItem(path);
    if (svgData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.width;
                tempCanvas.height = img.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(img, 0, 0);
                resolve(tempCtx.getImageData(0, 0, img.width, img.height));
            };
            img.src = svgData;
        });
    }
    return null;
}

function generateCharImageData(char) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = '24px Arial';
    tempCtx.fillText(char, 4, 22);
    return tempCtx.getImageData(0, 0, 28, 28);
}

function drawGeneratedChar(charData, x, y) {
    const imageData = new ImageData(new Uint8ClampedArray(charData.flat().map(v => v * 255)), 28, 28);
    outputCtx.putImageData(imageData, x, y);
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'scriptcraft-handwriting.png';
    link.href = outputCanvas.toDataURL();
    link.click();
}

// Utility functions
function updateColor(e) {
    currentColor = e.target.value;
}

function updateStrokeWidth(e) {
    currentWidth = e.target.value;
}

function setTool(tool) {
    currentTool = tool;
    penTool.classList.toggle('active', tool === 'pen');
    eraserTool.classList.toggle('active', tool === 'eraser');
}

// Model training and exporting functions
async function trainModel() {
    const styleName = handwritingName.value;
    if (!styleName) {
        alert('Please enter a handwriting name before training.');
        return;
    }

    trainingStatus.textContent = 'Training in progress...';
    progressBar.style.width = '0%';

    try {
        await trainer.train(styleName, updateTrainingProgress);
        trainingStatus.textContent = 'Training completed successfully!';
        progressBar.style.width = '100%';
    } catch (error) {
        console.error('Training error:', error);
        trainingStatus.textContent = 'Training failed. Please try again.';
    }
}

function updateTrainingProgress(progress) {
    progressBar.style.width = `${progress * 100}%`;
}

async function exportModel() {
    const styleName = handwritingName.value;
    if (!styleName) {
        alert('Please enter a handwriting name before exporting.');
        return;
    }

    try {
        await trainer.exportModel(styleName);
        alert('Model exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export model. Please try again.');
    }
}

// File saving function (using localStorage for simplicity)
async function saveFile(path, data) {
    localStorage.setItem(path, data);
}

// Initialize the app
init();
