from flask import Flask, request, jsonify
from PIL import Image
import io

app = Flask(__name__)

@app.route('/resize', methods=['POST'])
def resize_image():
    if 'image' not in request.files:
        return "No file uploaded.", 400

    file = request.files['image']
    width = int(request.form['width'])
    height = int(request.form['height'])

    image = Image.open(file.stream)
    resized_image = image.resize((width, height))
    img_byte_arr = io.BytesIO()
    resized_image.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    return jsonify({'resizedImage': f"data:image/png;base64,{base64.b64encode(img_byte_arr.getvalue()).decode()}"})

if __name__ == '__main__':
    app.run(port=3001)
