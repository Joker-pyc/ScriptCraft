const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileManager {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }

    async createDirectory(dirPath) {
        const fullPath = path.join(this.baseDir, dirPath);
        await fs.mkdir(fullPath, { recursive: true });
    }

    async saveFile(filePath, data) {
        const fullPath = path.join(this.baseDir, filePath);
        await this.createDirectory(path.dirname(fullPath));
        await fs.writeFile(fullPath, data);
    }

    async readFile(filePath) {
        const fullPath = path.join(this.baseDir, filePath);
        return await fs.readFile(fullPath, 'utf8');
    }

    async deleteFile(filePath) {
        const fullPath = path.join(this.baseDir, filePath);
        await fs.unlink(fullPath);
    }

    async listFiles(dirPath) {
        const fullPath = path.join(this.baseDir, dirPath);
        const files = await fs.readdir(fullPath);
        return Promise.all(files.map(async (file) => {
            const filePath = path.join(fullPath, file);
            const stats = await fs.stat(filePath);
            return {
                name: file,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            };
        }));
    }

    async moveFile(oldPath, newPath) {
        const fullOldPath = path.join(this.baseDir, oldPath);
        const fullNewPath = path.join(this.baseDir, newPath);
        await this.createDirectory(path.dirname(fullNewPath));
        await fs.rename(fullOldPath, fullNewPath);
    }

    async copyFile(sourcePath, destPath) {
        const fullSourcePath = path.join(this.baseDir, sourcePath);
        const fullDestPath = path.join(this.baseDir, destPath);
        await this.createDirectory(path.dirname(fullDestPath));
        await fs.copyFile(fullSourcePath, fullDestPath);
    }

    async getFileHash(filePath) {
        const fullPath = path.join(this.baseDir, filePath);
        const fileBuffer = await fs.readFile(fullPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }

    async searchFiles(dirPath, searchTerm) {
        const fullPath = path.join(this.baseDir, dirPath);
        const allFiles = await this.listFiles(dirPath);
        return allFiles.filter(file => file.name.includes(searchTerm));
    }

    async getFileMetadata(filePath) {
        const fullPath = path.join(this.baseDir, filePath);
        const stats = await fs.stat(fullPath);
        return {
            name: path.basename(filePath),
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isDirectory: stats.isDirectory()
        };
    }

    async compressFile(filePath, destPath) {
        const zlib = require('zlib');
        const { promisify } = require('util');
        const gzip = promisify(zlib.gzip);

        const fullSourcePath = path.join(this.baseDir, filePath);
        const fullDestPath = path.join(this.baseDir, destPath);

        const input = await fs.readFile(fullSourcePath);
        const compressed = await gzip(input);
        await fs.writeFile(fullDestPath, compressed);
    }

    async decompressFile(filePath, destPath) {
        const zlib = require('zlib');
        const { promisify } = require('util');
        const gunzip = promisify(zlib.gunzip);

        const fullSourcePath = path.join(this.baseDir, filePath);
        const fullDestPath = path.join(this.baseDir, destPath);

        const input = await fs.readFile(fullSourcePath);
        const decompressed = await gunzip(input);
        await fs.writeFile(fullDestPath, decompressed);
    }
}

module.exports = FileManager;
