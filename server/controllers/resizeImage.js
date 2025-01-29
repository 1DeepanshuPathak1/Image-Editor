const tmp = require('tmp');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

async function ResizeImage(req, res) {
    const { width, height, size, format } = req.query;

    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    tmp.file({ postfix: '.png' }, (err, tempPath) => {
        if (err) {
            return res.status(500).send('Error creating temp file.');
        }

        fs.writeFile(tempPath, req.file.buffer, (err) => {
            if (err) {
                return res.status(500).send('Error saving file.');
            }

            const pythonScriptPath = path.join(__dirname, '..', 'PythonScripts', 'resize.py');
            const pythonProcess = spawn('python', [pythonScriptPath, tempPath, width, height, size, format]);

            let output = '';
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Python Error: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    return res.status(500).send('Error resizing image.');
                }

                const outputLines = output.trim().split('\n');
                const lastLine = outputLines[outputLines.length - 1];
                const [resizedImage, actualSize] = lastLine.split(',');

                res.json({ resizedImage, actualSize: parseFloat(actualSize) });
            });
        });
    });
}

module.exports = { ResizeImage };