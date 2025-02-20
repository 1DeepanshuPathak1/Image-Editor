import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflow as tf
tf.get_logger().setLevel('ERROR')
import numpy as np
from PIL import Image
import io
import json
import sys
import math

class EnhancedImageAnalyzer:
    def __init__(self):
        try:
            self.model = tf.keras.applications.EfficientNetB2(
                include_top=True,
                weights='imagenet'
            )
        except:
            self.model = tf.keras.applications.MobileNetV2(
                include_top=True,
                weights='imagenet'
            )
        self.labels = self.load_imagenet_labels()
        
    def load_imagenet_labels(self):
        try:
            labels_path = 'PythonScripts/ImageNetLabels.txt'
            with open(labels_path, 'r') as f:
                labels = [line.strip() for line in f.readlines()]
            return labels
        except FileNotFoundError:
            return None
    
    def preprocess_image(self, image_bytes):
    
        try:
            image = Image.open(io.BytesIO(image_bytes))
            image = image.convert('RGB')
            orig_np = np.array(image)
            if hasattr(self.model, 'input_shape'):
                input_height, input_width = self.model.input_shape[1:3]
            else:
                input_height, input_width = (260, 260) if hasattr(self.model, 'name') and 'efficient' in self.model.name.lower() else (224, 224)
            image = image.resize((input_width, input_height))
            if hasattr(self.model, 'name') and 'efficient' in self.model.name.lower():
                image_array = tf.keras.preprocessing.image.img_to_array(image)
                image_array = tf.keras.applications.efficientnet.preprocess_input(image_array)
            else:
                image_array = tf.keras.preprocessing.image.img_to_array(image)
                image_array = tf.keras.applications.mobilenet_v2.preprocess_input(image_array)
            return tf.expand_dims(image_array, 0), orig_np
        except Exception as e:
            print(f"Error preprocessing image: {e}", file=sys.stderr)
            raise
    
    def find_dominant_colors(self, image_np, n_colors=5):
        pixels = image_np.reshape(-1, 3)
        quantized = (pixels // 16) * 16 
        unique_colors, counts = np.unique(quantized, axis=0, return_counts=True)
        sorted_idx = np.argsort(-counts)
        dominant_colors = unique_colors[sorted_idx[:n_colors]]
        color_percentages = counts[sorted_idx[:n_colors]] / len(pixels)
        return dominant_colors, color_percentages
    
    def extract_color_features(self, image_np):
        """Extract detailed color features from the image."""
        def rgb_to_hsv(rgb_img):
            r, g, b = rgb_img[..., 0], rgb_img[..., 1], rgb_img[..., 2]
            r, g, b = r/255.0, g/255.0, b/255.0
            maxc = np.maximum(np.maximum(r, g), b)
            minc = np.minimum(np.minimum(r, g), b)
            v = maxc
            deltac = maxc - minc
            s = np.zeros_like(deltac)
            s[maxc != 0] = deltac[maxc != 0] / maxc[maxc != 0]
            h = np.zeros_like(deltac)
            rc = np.zeros_like(deltac)
            rc[deltac != 0] = (maxc[deltac != 0] - r[deltac != 0]) / deltac[deltac != 0]
            gc = np.zeros_like(deltac)
            gc[deltac != 0] = (maxc[deltac != 0] - g[deltac != 0]) / deltac[deltac != 0]
            bc = np.zeros_like(deltac)
            bc[deltac != 0] = (maxc[deltac != 0] - b[deltac != 0]) / deltac[deltac != 0]
            h[b == maxc] = 4.0 + gc[b == maxc] - rc[b == maxc]
            h[g == maxc] = 2.0 + rc[g == maxc] - bc[g == maxc]
            h[r == maxc] = bc[r == maxc] - gc[r == maxc]
            h[deltac == 0] = 0.0
            h = (h / 6.0) % 1.0
            return np.stack((h, s, v), axis=-1)
        
        hsv_image = rgb_to_hsv(image_np.astype(np.float32))
        dominant_colors, color_percentages = self.find_dominant_colors(image_np)
        rgb_mean = np.mean(image_np, axis=(0, 1))
        rgb_std = np.std(image_np, axis=(0, 1))
        hsv_mean = np.mean(hsv_image, axis=(0, 1))
        hsv_std = np.std(hsv_image, axis=(0, 1))
        brightness = hsv_mean[2]  
        saturation = hsv_mean[1]  
        r_g_ratio = rgb_mean[0] / max(rgb_mean[1], 1)
        b_g_ratio = rgb_mean[2] / max(rgb_mean[1], 1)
        color_temp = "warm" if r_g_ratio > b_g_ratio else "cool"
        contrast = np.mean(rgb_std) / 255.0
        color_variety = min(5, len([c for c in dominant_colors if np.any(c > 50)]))
        is_vibrant = saturation > 0.6 and contrast > 0.15
        is_muted = saturation < 0.3 or (brightness < 0.3 and saturation < 0.5)
        return {
            'brightness': float(brightness),
            'saturation': float(saturation),
            'contrast': float(contrast),
            'color_temp': color_temp,
            'color_variety': int(color_variety),
            'dominant_colors': [c.tolist() for c in dominant_colors],
            'color_percentages': [float(p) for p in color_percentages],
            'is_vibrant': bool(is_vibrant),
            'is_muted': bool(is_muted)
        }
    
    def extract_texture_features(self, image_np):
        """Extract texture-related features from the image."""
        gray = np.dot(image_np[...,:3], [0.2989, 0.5870, 0.1140])
        def simple_edge_detection(gray_img):
            h, w = gray_img.shape
            gx = np.zeros((h, w))
            gy = np.zeros((h, w))
            gx[:, 1:-1] = gray_img[:, 2:] - gray_img[:, :-2]
            gy[1:-1, :] = gray_img[2:, :] - gray_img[:-2, :]
            gradient_magnitude = np.sqrt(gx**2 + gy**2)
            return gradient_magnitude
        
        edge_magnitude = simple_edge_detection(gray)
        edge_density = np.mean(edge_magnitude) / 255.0
        
        def calculate_texture_stats(gray_img, window_size=16):
            h, w = gray_img.shape
            
            
            if h > 400 or w > 400:
                scale = 400 / max(h, w)
                new_h, new_w = int(h * scale), int(w * scale)
                from PIL import Image
                gray_img = np.array(Image.fromarray(gray_img.astype(np.uint8)).resize((new_w, new_h)))
            
            h, w = gray_img.shape
            blocks_h = max(1, h // window_size)
            blocks_w = max(1, w // window_size) 
            local_std = np.zeros((blocks_h, blocks_w))
            for i in range(blocks_h):
                for j in range(blocks_w):
                    y_start = i * window_size
                    y_end = min((i + 1) * window_size, h)
                    x_start = j * window_size
                    x_end = min((j + 1) * window_size, w)
                    
                    block = gray_img[y_start:y_end, x_start:x_end]
                    local_std[i, j] = np.std(block)
            
            
            texture_contrast = np.std(local_std) / 255.0
            texture_roughness = np.mean(local_std) / 255.0
            return texture_contrast, texture_roughness
        texture_contrast, texture_roughness = calculate_texture_stats(gray)
        is_smooth = texture_roughness < 0.1 and edge_density < 0.15
        is_rough = texture_roughness > 0.2 or edge_density > 0.25
        return {
            'edge_density': float(edge_density),
            'texture_contrast': float(texture_contrast),
            'texture_roughness': float(texture_roughness),
            'is_smooth': bool(is_smooth),
            'is_rough': bool(is_rough)
        }
    
    def analyze_image(self, image_bytes):
        try:
            preprocessed_image, original_image_np = self.preprocess_image(image_bytes)
            predictions = self.model.predict(preprocessed_image, verbose=0)
            if hasattr(self.model, 'name') and 'efficient' in self.model.name.lower():
                top_predictions = tf.keras.applications.efficientnet.decode_predictions(predictions, top=5)[0]
            else:
                top_predictions = tf.keras.applications.mobilenet_v2.decode_predictions(predictions, top=5)[0]
            color_features = self.extract_color_features(original_image_np)
            texture_features = self.extract_texture_features(original_image_np)
            mood_mapping = self.get_mood_mapping(color_features, texture_features, top_predictions)
            return {
                'predictions': [
                    {'label': label, 'confidence': float(score)} 
                    for _, label, score in top_predictions[:5]
                ],
                'mood': mood_mapping['mood'],
                'mood_confidence': mood_mapping['confidence'],
                'mood_explanation': mood_mapping['explanation'],
                'genre_hints': mood_mapping['genres'],
                'energy_level': mood_mapping['energy'],
                'valence': mood_mapping['valence'],
                'image_characteristics': {
                    **{k: v for k, v in color_features.items() 
                       if k not in ['dominant_colors', 'color_percentages']},
                    'edge_density': texture_features['edge_density'],
                    'is_smooth': texture_features['is_smooth'],
                    'is_rough': texture_features['is_rough']
                }
            }
        except Exception as e:
            print(f"Error in analyze_image: {e}", file=sys.stderr)
            raise
    
    def get_mood_mapping(self, color_features, texture_features, predictions):
        """Enhanced mood mapping based on rich image features."""
       
        brightness = color_features['brightness']
        saturation = color_features['saturation']
        contrast = color_features['contrast']
        color_temp = color_features['color_temp']
        is_vibrant = color_features['is_vibrant']
        is_muted = color_features['is_muted']
        edge_density = texture_features['edge_density']
        is_smooth = texture_features['is_smooth']
        is_rough = texture_features['is_rough']
        energy = saturation * 0.4 + contrast * 0.3 + edge_density * 0.3
        valence = brightness * 0.5 + (0.3 if color_temp == 'warm' else -0.1) + (0.2 if is_vibrant else -0.1)
        energy = max(0, min(1, energy))
        valence = max(0, min(1, valence))
        mood_scores = {
            "euphoric": valence * 0.9 + energy * 0.8 if valence > 0.8 and energy > 0.7 else 0,
            "joyful": valence * 0.8 + energy * 0.6 if valence > 0.7 and energy > 0.5 else 0,
            "upbeat": valence * 0.7 + energy * 0.7 if valence > 0.6 and energy > 0.6 else 0,
            "cheerful": valence * 0.8 + energy * 0.4 if valence > 0.7 and energy > 0.3 else 0,
            "peaceful": valence * 0.7 + (1-energy) * 0.8 if valence > 0.6 and energy < 0.4 else 0,
            "relaxed": valence * 0.6 + (1-energy) * 0.7 if valence > 0.5 and energy < 0.5 else 0,
            "serene": valence * 0.7 + (1-energy) * 0.9 if valence > 0.6 and energy < 0.3 else 0,
            "nostalgic": valence * 0.5 + (is_muted * 0.4) if 0.3 < valence < 0.7 and is_muted else 0,
            "dramatic": energy * 0.7 + contrast * 0.8 if energy > 0.5 and contrast > 0.5 else 0,
            "mysterious": (1-brightness) * 0.7 + edge_density * 0.5 if brightness < 0.4 and edge_density > 0.3 else 0,
            "melancholic": (1-valence) * 0.8 + (is_muted * 0.6) if valence < 0.4 and is_muted else 0,
            "intense": energy * 0.8 + edge_density * 0.7 if energy > 0.7 and edge_density > 0.5 else 0,
            "somber": (1-valence) * 0.9 + (1-saturation) * 0.7 if valence < 0.3 and saturation < 0.4 else 0,
            "ethereal": brightness * 0.8 + (is_smooth * 0.7) if brightness > 0.7 and is_smooth else 0,
            "powerful": energy * 0.9 + contrast * 0.8 if energy > 0.8 and contrast > 0.6 else 0,
            "dark": (1-brightness) * 0.9 if brightness < 0.3 else 0,
            "vibrant": saturation * 0.9 + color_features['color_variety'] * 0.1 if saturation > 0.7 else 0,
            "tranquil": (1-edge_density) * 0.8 + (is_smooth * 0.7) if edge_density < 0.3 and is_smooth else 0,
            "chaotic": edge_density * 0.9 + (is_rough * 0.8) if edge_density > 0.7 and is_rough else 0,
            "dreamy": brightness * 0.6 + (1-contrast) * 0.7 if brightness > 0.6 and contrast < 0.4 else 0
        }
        top_mood = max(mood_scores.items(), key=lambda x: x[1])
        if top_mood[1] < 0.4:
            content_mood = self.get_content_based_mood(predictions)
            if content_mood:
                top_mood = (content_mood, 0.5)
        selected_mood = top_mood[0]
        confidence = min(1.0, top_mood[1] + 0.2)  
        explanation = self.generate_mood_explanation(selected_mood, color_features, texture_features, predictions)
        genres = self.map_genres_from_mood(selected_mood, predictions)
        
        return {
            'mood': selected_mood,
            'confidence': confidence,
            'explanation': explanation,
            'genres': genres, 
            'energy': energy,
            'valence': valence
        }
    
    def get_content_based_mood(self, predictions):
        """Fallback mood mapping based on image content."""       
        content_mood_map = {
            'sunset': 'peaceful',
            'sunrise': 'hopeful',
            'beach': 'relaxed',
            'mountain': 'majestic',
            'forest': 'mysterious',
            'flower': 'cheerful',
            'ocean': 'tranquil',
            'storm': 'dramatic',
            'city': 'vibrant',
            'ruins': 'nostalgic',
            'party': 'upbeat',
            'concert': 'energetic',
            'cemetery': 'somber',
            'fire': 'intense',
            'waterfall': 'serene',
            'desert': 'stark',
            'snow': 'peaceful',
            'night': 'mysterious'
        }
        for _, label, score in predictions:
            label = label.lower()
            for keyword, mood in content_mood_map.items():
                if keyword in label and score > 0.2:
                    return mood
        
        return None
    def generate_mood_explanation(self, mood, color_features, texture_features, predictions):
        """Generate a human-readable explanation for the mood choice."""
        brightness = color_features['brightness']
        saturation = color_features['saturation']
        explanations = {
            "euphoric": f"The image has extremely bright tones ({brightness:.2f}) and vibrant colors, creating an euphoric feeling.",
            "joyful": f"The combination of bright colors ({brightness:.2f}) and moderate energy creates a joyful atmosphere.",
            "upbeat": f"The image shows vibrant colors ({saturation:.2f} saturation) with good energy balance, suggesting an upbeat mood.",
            "cheerful": f"Bright tones ({brightness:.2f}) with gentle composition create a cheerful ambiance.",
            "peaceful": f"Soft brightness ({brightness:.2f}) with low contrast elements creates a peaceful setting.",
            "relaxed": f"The moderate brightness ({brightness:.2f}) with low energy elements suggests a relaxed mood.",
            "serene": f"The smooth textures and balanced tones create a serene atmosphere.",
            "nostalgic": f"The muted colors and soft contrasts evoke a nostalgic feeling.",
            "dramatic": f"High contrast ({color_features['contrast']:.2f}) with strong color temperature ({color_features['color_temp']}) creates drama.",
            "mysterious": f"The darker tones ({brightness:.2f}) with moderate texture complexity create mystery.",
            "melancholic": f"Low brightness ({brightness:.2f}) combined with muted colors suggests melancholy.",
            "intense": f"High edge density ({texture_features['edge_density']:.2f}) with strong contrasts creates intensity.",
            "somber": f"Very low brightness ({brightness:.2f}) with minimal saturation ({saturation:.2f}) creates a somber mood.",
            "ethereal": f"Bright, smooth textures with minimal edges create an ethereal quality.",
            "powerful": f"Strong contrasts and high energy elements create a powerful impact.",
            "dark": f"Predominantly dark tones ({brightness:.2f}) set a dark mood.",
            "vibrant": f"High color saturation ({saturation:.2f}) with {color_features['color_variety']} distinct color groups creates vibrancy.",
            "tranquil": f"Smooth textures with gentle tonal transitions create tranquility.",
            "chaotic": f"Complex edge patterns ({texture_features['edge_density']:.2f}) with rough textures create chaos.",
            "dreamy": f"Soft brightness ({brightness:.2f}) with gentle contrasts ({color_features['contrast']:.2f}) creates a dreamy atmosphere."
        }
        base_explanation = explanations.get(mood, f"The image characteristics (brightness: {brightness:.2f}, saturation: {saturation:.2f}) suggest a {mood} mood.")
        content_context = ""
        relevant_objects = [label for _, label, score in predictions[:3] if score > 0.2]
        if relevant_objects:
            objects_str = ", ".join(relevant_objects)
            content_context = f" The presence of {objects_str} reinforces this mood."
            
        return base_explanation + content_context
    def map_genres_from_mood(self, mood, predictions):
        """Map musical genres based on mood and image content."""
        mood_genre_map = {
            "euphoric": ["electronic", "trance", "edm", "future bass"],
            "joyful": ["pop", "indie pop", "folk pop", "disco"],
            "upbeat": ["pop", "dance", "electronic", "funk"],
            "cheerful": ["pop", "indie folk", "indie pop", "acoustic"],
            "peaceful": ["ambient", "acoustic", "piano", "new age"],
            "relaxed": ["chillout", "lofi", "acoustic", "indie folk"],
            "serene": ["classical", "ambient", "piano", "meditation"],
            "nostalgic": ["indie", "vintage pop", "lo-fi", "synthwave"],
            "dramatic": ["cinematic", "orchestral", "post-rock", "alternative"],
            "mysterious": ["dark ambient", "electronic", "trip-hop", "downtempo"],
            "melancholic": ["indie folk", "ambient", "slowcore", "classical"],
            "intense": ["rock", "metal", "electronic", "industrial"],
            "somber": ["dark classical", "ambient", "slowcore", "post-rock"],
            "ethereal": ["ambient", "dream pop", "shoegaze", "space music"],
            "powerful": ["epic orchestral", "rock", "cinematic", "trailer music"],
            "dark": ["dark ambient", "industrial", "post-metal", "gothic"],
            "vibrant": ["latin", "afrobeat", "pop", "funk"],
            "tranquil": ["ambient", "new age", "meditation", "minimalist"],
            "chaotic": ["experimental", "math rock", "avant-garde", "noise"],
            "dreamy": ["dream pop", "shoegaze", "ambient", "chillwave"]
        }
        content_genre_map = {
            "beach": ["tropical house", "reggae", "surf rock"],
            "city": ["hip-hop", "electronic", "indie rock"],
            "nature": ["folk", "ambient", "acoustic"],
            "sunset": ["chillwave", "ambient", "downtempo"],
            "party": ["dance", "pop", "electronic"],
            "forest": ["folk", "acoustic", "ambient"],
            "water": ["ambient", "new age", "classical"],
            "mountains": ["folk", "post-rock", "ambient"],
            "night": ["downtempo", "trip-hop", "dark jazz"],
            "vintage": ["jazz", "soul", "blues"]
        }
        genres = mood_genre_map.get(mood, ["electronic", "indie", "ambient"])
        for keyword, content_genres in content_genre_map.items():
            for _, label, score in predictions:
                if keyword in label.lower() and score > 0.15:
                    genres.extend(content_genres[:2])  
                    break
        return list(dict.fromkeys(genres))[:6]  

def main():
    sys.stderr.write("Enhanced image analysis script started\n")
    try:
        image_bytes = sys.stdin.buffer.read()
        analyzer = EnhancedImageAnalyzer()
        result = analyzer.analyze_image(image_bytes)
        print(json.dumps(result))
    except Exception as e:
        error_result = {
            "error": str(e),
            "mood": "error",
            "genre_hints": ["ambient"],
            "energy_level": 0.5,
            "valence": 0.5
        }
        print(json.dumps(error_result))
        sys.stderr.write(f"Error in script execution: {e}\n")

if __name__ == "__main__":
    main()