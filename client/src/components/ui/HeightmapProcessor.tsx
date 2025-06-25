import React, { useRef, useEffect } from 'react';

interface HeightmapProcessorProps {
  imageUrl: string;
  onProcessed: (heightData: Float32Array, width: number, height: number) => void;
  onError: (error: string) => void;
}

const HeightmapProcessor: React.FC<HeightmapProcessorProps> = ({
  imageUrl,
  onProcessed,
  onError
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const processHeightmap = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onError('Could not get canvas context');
        return;
      }

      try {
        // Load the image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // Set canvas size to match image
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Get image data
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          
          // Convert to height data (0-1 range)
          const heightData = new Float32Array(img.width * img.height);
          
          for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            
            // Convert RGB to grayscale (luminance formula)
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Normalize to 0-1 range
            heightData[pixelIndex] = grayscale / 255;
          }
          
          console.log(`Processed heightmap: ${img.width}x${img.height} pixels`);
          onProcessed(heightData, img.width, img.height);
        };
        
        img.onerror = () => {
          onError('Failed to load heightmap image');
        };
        
        img.src = imageUrl;
        
      } catch (error) {
        onError(`Error processing heightmap: ${error}`);
      }
    };

    processHeightmap();
  }, [imageUrl, onProcessed, onError]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
};

export default HeightmapProcessor;
