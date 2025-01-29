const { spawn } = require('child_process');
const path = require('path');

const enhanceImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        console.log('File size:', req.file.size);
        console.log('Settings:', req.body.settings);

        const pythonScriptPath = path.join(__dirname, '..', 'PythonScripts', 'Upscale.py');
        const pythonProcess = spawn('python', [
            pythonScriptPath,
            req.body.settings
        ]);

        let output = Buffer.from([]);
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output = Buffer.concat([output, data]);
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('Python Error:', data.toString());
        });

        pythonProcess.stdin.write(req.file.buffer);
        pythonProcess.stdin.end();

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Process exited with code:', code);
                console.error('Error output:', errorOutput);
                return res.status(500).send('Image processing failed');
            }
            
            if (output.length === 0) {
                console.error('No output received from Python script');
                return res.status(500).send('No output from image processor');
            }

            res.json({ 
                image: output.toString('base64'),
                message: 'Image enhanced successfully'
            });
        });

    } catch (error) {
        console.error('Script execution error:', error);
        res.status(500).send(`Failed to process image: ${error.message}`);
    }
};

module.exports = { enhanceImage };