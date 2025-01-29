import cv2
import numpy as np
import sys
import io
import json
import traceback
from PIL import Image
from PIL import ImageEnhance

def enhance_image_quality(image_data, settings):
    try:
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image")
        img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
        denoise_h = max(3, min(20, int(10 * settings['denoiseStrength'])))
        denoised = cv2.fastNlMeansDenoisingColored(img, None, denoise_h, denoise_h, 7, 21)
        sharpness = max(1, min(3, 1 + (settings['controlNetScale'])))
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]]) * (sharpness / 9)
        sharpened = cv2.filter2D(denoised, -1, kernel)
        sharpened = cv2.normalize(sharpened, None, 0, 255, cv2.NORM_MINMAX)
        sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
        enhanced = Image.fromarray(cv2.cvtColor(sharpened, cv2.COLOR_BGR2RGB))
        contrast_factor = max(0.5, min(2.0, 1 + (settings['conditionScale'] * 0.1)))
        enhancer = ImageEnhance.Contrast(enhanced)
        enhanced = enhancer.enhance(contrast_factor)
        buffer = io.BytesIO()
        enhanced.save(buffer, format='PNG', quality=100, optimize=False)
        return buffer.getvalue()
        
    except Exception as e:
        print(f"Error in enhance_image_quality: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise

if __name__ == "__main__":
    try:
        settings = json.loads(sys.argv[1])
        image_data = sys.stdin.buffer.read()
        result = enhance_image_quality(image_data, settings)
        sys.stdout.buffer.write(result)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)