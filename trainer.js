class HandwritingTrainer {
    constructor() {
        this.model = null;
        this.trainingData = [];
        this.labels = [];
        this.canvas = document.createElement('canvas');
        this.canvas.width = 28;
        this.canvas.height = 28;
        this.ctx = this.canvas.getContext('2d');
    }

    async init() {
        this.model = await this.createModel();
    }

    async createModel() {
        const model = tf.sequential();
        
        model.add(tf.layers.conv2d({
            inputShape: [28, 28, 1],
            kernelSize: 3,
            filters: 32,
            activation: 'relu'
        }));
        model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
        model.add(tf.layers.conv2d({kernelSize: 3, filters: 64, activation: 'relu'}));
        model.add(tf.layers.maxPooling2d({poolSize: 2, strides: 2}));
        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({units: 128, activation: 'relu'}));
        model.add(tf.layers.dropout({rate: 0.2}));
        model.add(tf.layers.dense({units: 64, activation: 'relu'}));
        model.add(tf.layers.dense({units: 128, activation: 'softmax'}));
        
        model.compile({
            optimizer: 'adam',
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }

    async loadSamples(styleName) {
        this.trainingData = [];
        this.labels = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`data/handwriting_samples/${styleName}/`)) {
                const char = key.split('/').pop().split('.')[0];
                const svgData = localStorage.getItem(key);
                const imageData = await this.svgToImageData(svgData);
                const processedData = this.preprocessData(imageData);
                this.trainingData.push(processedData);
                this.labels.push(char.charCodeAt(0));
            }
        }
    }

    async svgToImageData(svgData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                resolve(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
            };
            img.src = svgData;
        });
    }

    preprocessData(imageData) {
        return tf.tidy(() => {
            const tensor = tf.browser.fromPixels(imageData, 1);
            const resized = tf.image.resizeBilinear(tensor, [28, 28]).toFloat();
            const offset = tf.scalar(255.0);
            const normalized = tf.scalar(1.0).sub(resized.div(offset));
            return normalized;
        });
    }

    async train(styleName, progressCallback) {
        await this.loadSamples(styleName);

        if (this.trainingData.length === 0) {
            throw new Error('No training data available');
        }

        const xs = tf.stack(this.trainingData);
        const ys = tf.oneHot(tf.tensor1d(this.labels, 'int32'), 128);

        const totalEpochs = 50;
        const batchSize = 32;

        await this.model.fit(xs, ys, {
            epochs: totalEpochs,
            batchSize: batchSize,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, accuracy = ${logs.acc.toFixed(4)}`);
                    progressCallback((epoch + 1) / totalEpochs);
                }
            }
        });

        console.log('Training complete');
    }

    async exportModel(styleName) {
        if (!this.model) {
            throw new Error('No model to export');
        }
        const modelJson = await this.model.toJSON();
        const modelPath = `models/trained_models/${styleName}_model.json`;
        
        localStorage.setItem(modelPath, JSON.stringify(modelJson));
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(new Blob([JSON.stringify(modelJson)]));
        downloadLink.download = `${styleName}_model.json`;
        downloadLink.click();
    }

    async loadModel(styleName) {
        const modelPath = `models/trained_models/${styleName}_model.json`;
        try {
            const modelJson = localStorage.getItem(modelPath);
            if (!modelJson) {
                throw new Error('Model not found');
            }
            this.model = await tf.loadLayersModel(tf.io.fromMemory(JSON.parse(modelJson)));
            console.log('Model loaded successfully');
        } catch (error) {
            console.error('Failed to load the model:', error);
        }
    }

    async generateHandwriting(inputData) {
        if (!this.model) {
            throw new Error('No model available');
        }

        const input = this.preprocessData(inputData);
        const prediction = this.model.predict(input.expandDims(0));
        return prediction.squeeze().arraySync();
    }
}
