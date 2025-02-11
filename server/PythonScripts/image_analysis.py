import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflow as tf
tf.get_logger().setLevel('ERROR')  
import numpy as np
from PIL import Image
import io
import json
import sys

class ImageAnalyzer:
    def __init__(self):
        self.model = tf.keras.applications.MobileNetV2(
            include_top=True,
            weights='imagenet'
        )
        self.labels = self.load_imagenet_labels()
    
    def load_imagenet_labels(self):
        labels_path = 'PythonScripts/ImageNetLabels.txt'
        with open(labels_path, 'r') as f:
            labels = [line.strip() for line in f.readlines()]
        return labels
    
    def preprocess_image(self, image_bytes):
        # Open and preprocess image
        image = Image.open(io.BytesIO(image_bytes))
        image = image.convert('RGB')
        image = image.resize((224, 224))
        image = tf.keras.preprocessing.image.img_to_array(image)
        image = tf.keras.applications.mobilenet_v2.preprocess_input(image)
        return tf.expand_dims(image, 0)
    
    def analyze_image(self, image_bytes):
        image = self.preprocess_image(image_bytes)

        predictions = self.model.predict(image, verbose=0) 
        top_predictions = tf.keras.applications.mobilenet_v2.decode_predictions(predictions)[0]  

        image_array = np.array(Image.open(io.BytesIO(image_bytes)).convert('RGB'))
        brightness = np.mean(image_array) / 255.0
        saturation = np.std(image_array) / 255.0

        mood_mapping = self.get_mood_mapping(brightness, saturation, top_predictions)
        
        return {
            'predictions': [
                {'label': label, 'confidence': float(score)} 
                for _, label, score in top_predictions[:3]
            ],
            'mood': mood_mapping['mood'],
            'genre_hints': mood_mapping['genres'],
            'energy_level': mood_mapping['energy'],
            'valence': mood_mapping['valence']
        }
    
    def get_mood_mapping(self, brightness, saturation, predictions):
        energy = saturation * 0.7 + brightness * 0.3
        valence = brightness

        if brightness > 0.6 and saturation > 0.5:
            mood = "upbeat"
            genres = ["pop", "dance", "electronic"]
        elif brightness > 0.6:
            mood = "peaceful"
            genres = ["acoustic", "folk", "indie"]
        elif saturation > 0.5:
            mood = "intense"
            genres = ["rock", "alternative", "electronic"]
        else:
            mood = "melancholic"
            genres = ["ambient", "classical", "indie"]

        nature_keywords = ["sky", "sunset", "beach", "mountain", "forest", "flower"]
        urban_keywords = ["city", "building", "street", "car", "people"]
        
        for _, label, _ in predictions:
            if any(keyword in label.lower() for keyword in nature_keywords):
                genres.extend(["acoustic", "folk"])
            if any(keyword in label.lower() for keyword in urban_keywords):
                genres.extend(["electronic", "pop"])
        
        return {
            'mood': mood,
            'genres': list(set(genres)), 
            'energy': energy,
            'valence': valence
        }

def main():
    sys.stderr.write("Python script started\n")
    image_bytes = sys.stdin.buffer.read()
    analyzer = ImageAnalyzer()
    result = analyzer.analyze_image(image_bytes)
    print(json.dumps(result))

if __name__ == "__main__":
    main()