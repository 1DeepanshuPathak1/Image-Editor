const { spawn } = require('child_process');
const path = require('path');

function Filter(buffers,type,rotate,intense){
    return new Promise((resolve, reject) => {
        const pythonScriptPath = path.join(__dirname, '..', 'PythonScripts', 'image_edit.py');
        const pythonProcess = spawn('python', [pythonScriptPath, type, rotate.toString(), intense.toString()]);
        
        pythonProcess.stdin.write(buffers);
        pythonProcess.stdin.end();
        let editedImageBuffer = [];
        pythonProcess.stdout.on('data', (data) => {
            editedImageBuffer.push(data);
        });
        pythonProcess.stderr.on('data', (error) => {
            reject(`Error: ${error}`);
        });
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(`Process closed with code ${code}`);
            } else {
                resolve(Buffer.concat(editedImageBuffer));
            }
        });
    });
};  


module.exports = {Filter};