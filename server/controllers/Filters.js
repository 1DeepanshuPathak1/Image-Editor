const { spawn } = require('child_process');

function Filter(buffers,type,rotate,intense){
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['image_edit.py', type, rotate.toString(), intense.toString()]);
        
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