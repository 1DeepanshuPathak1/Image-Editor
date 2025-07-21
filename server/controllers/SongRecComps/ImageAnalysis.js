const { spawn } = require('child_process');
const path = require('path');

class ImageAnalysis {
    async analyzeImage(imageBuffer) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [
                path.join(__dirname, '../../PythonScripts/image_analysis.py')
            ]);

            let dataString = '';
            let errorString = '';

            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorString += data.toString();
                console.error(`Python error: ${data.toString()}`);
            });

            pythonProcess.on('error', (error) => {
                console.error('Failed to spawn Python process:', error);
                reject(error);
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Python process exited with code ${code}`);
                    console.error('Error output:', errorString);
                    reject(new Error(`Python process failed: ${errorString}`));
                    return;
                }

                try {
                    const jsonStartIndex = dataString.indexOf('{');
                    const jsonEndIndex = dataString.lastIndexOf('}');

                    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                        throw new Error('No valid JSON output found');
                    }

                    const jsonString = dataString.slice(jsonStartIndex, jsonEndIndex + 1);
                    const result = JSON.parse(jsonString);
                    console.log('Python Analysis:', result);
                    resolve(result);
                } catch (error) {
                    console.error('Error parsing JSON output:', error);
                    console.error('Raw output:', dataString);
                    reject(error);
                }
            });

            try {
                pythonProcess.stdin.write(imageBuffer);
                pythonProcess.stdin.end();
            } catch (error) {
                console.error('Error writing to Python process:', error);
                reject(error);
            }
        });
    }

    generateDescription(imageAnalysis) {
        const { mood, predictions, genre } = imageAnalysis;
        const mainObject = predictions?.[0]?.object || 'scene';
        const suggestedGenre = genre || 'music';

        const moodDescriptions = {
            'upbeat': 'vibrant and energetic',
            'happy': 'joyful and uplifting',
            'sad': 'melancholic and emotional',
            'relax': 'calm and serene',
            'intense': 'powerful and dynamic',
            'romantic': 'warm and passionate',
            'dark': 'mysterious and intense',
            'dreamy': 'ethereal and dreamy',
            'epic': 'grand and cinematic',
            'angry': 'fierce and aggressive'
        };

        return `This ${moodDescriptions[mood] || 'unique'} ${mainObject} suggests ${suggestedGenre} music. Finding a matching song...`;
    }
}

module.exports = { ImageAnalysis };