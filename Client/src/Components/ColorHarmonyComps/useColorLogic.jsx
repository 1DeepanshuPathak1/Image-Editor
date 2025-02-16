// useColorLogic.js
import { useState } from 'react';
import ColorThief from 'colorthief';
import { rgbToHex, hexToRgb, rgbToHsl } from './ColorComp';
import { 
    generateMonochromatic,
    generateComplementary, 
    generateAnalogous, 
    generateTriadic, 
    generateSimilarPalettes, 
    generatePairsBasedPalettes 
} from './ColorGen';

const useColorLogic = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [colorPalette, setColorPalette] = useState([]);
  const [harmonies, setHarmonies] = useState([]);
  const [similarPalettes, setSimilarPalettes] = useState([]);
  const [currentDominantColorIndex, setCurrentDominantColorIndex] = useState(0);
  const [currentApproachIndex, setCurrentApproachIndex] = useState(0);
  const [dominantColors, setDominantColors] = useState([]);
  const [pairIndex, setPairIndex] = useState(0); 
  const [previousPalettes, setPreviousPalettes] = useState([]);

  const extractColorsFromImage = async (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 10, 5);
        const hexColors = palette.map(color => rgbToHex(...color));
        resolve(hexColors);
      };
      img.src = imageSrc;
    });
  };

  const generateHarmonies = (baseColor) => {
    const rgb = hexToRgb(baseColor);
    const hsl = rgbToHsl(...rgb);

    return [
      {
        name: 'Monochromatic',
        colors: generateMonochromatic(hsl)
      },
      {
        name: 'Complementary',
        colors: generateComplementary(hsl)
      },
      {
        name: 'Analogous',
        colors: generateAnalogous(hsl)
      },
      {
        name: 'Triadic',
        colors: generateTriadic(hsl)
      }
    ];
  };

  const handleRegeneratePalettes = () => {
    if (!dominantColors.length) return;

    setPreviousPalettes(prev => [...prev, similarPalettes]);

    const newApproachIndex = (currentApproachIndex + 1) % 2;
    setCurrentApproachIndex(newApproachIndex);
    
    if (newApproachIndex === 0) {
      const newPalettes = generatePairsBasedPalettes(dominantColors, pairIndex);
      setSimilarPalettes(newPalettes);
      setPairIndex((prevIndex) => prevIndex + 1);
    } else {
      const anchorColor = dominantColors[currentDominantColorIndex];
      const newPalettes = generateSimilarPalettes([anchorColor]);
      setSimilarPalettes(newPalettes);
      setCurrentDominantColorIndex((prevIndex) => (prevIndex + 1) % dominantColors.length);
    }
  };

  const handleUndoPalettes = () => {
    if (previousPalettes.length > 0) {
      const lastPalettes = previousPalettes[previousPalettes.length - 1];
      setSimilarPalettes(lastPalettes);
      setPreviousPalettes(prev => prev.slice(0, -1));
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageSrc = e.target.result;
        setSelectedImage(imageSrc);
  
        const extractedColors = await extractColorsFromImage(imageSrc);
        setColorPalette(extractedColors);
        setDominantColors(extractedColors); 
  
        const newHarmonies = generateHarmonies(extractedColors[0]);
        setHarmonies(newHarmonies);
  
        const newSimilarPalettes = generateSimilarPalettes([extractedColors[0]]);
        setSimilarPalettes(newSimilarPalettes);
      };
      reader.readAsDataURL(file);
    }
  };

  return {
    selectedImage,
    colorPalette,
    harmonies,
    similarPalettes,
    currentDominantColorIndex,
    currentApproachIndex,
    previousPalettes,
    handleImageUpload,
    handleRegeneratePalettes,
    handleUndoPalettes,
    setSelectedImage,
    setColorPalette,
    setHarmonies,
    setSimilarPalettes,
  };
};

export {useColorLogic};