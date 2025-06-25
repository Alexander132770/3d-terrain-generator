import * as THREE from 'three';

export interface TerrainResult {
  geometry: THREE.BufferGeometry;
  colors?: Float32Array;
  vertexCount: number;
  faceCount: number;
}

/**
 * Generate terrain geometry from heightmap image
 */
export async function processHeightmap(
  imageUrl: string, 
  resolution: number = 256, 
  heightScale: number = 10
): Promise<TerrainResult> {
  console.log(`Processing heightmap: ${imageUrl} at ${resolution}x${resolution} resolution`);
  
  // Load and process the heightmap image
  const heightData = await loadHeightmapData(imageUrl, resolution);
  
  // Generate terrain geometry
  const result = generateTerrainGeometry(heightData, resolution, heightScale);
  
  console.log(`Generated terrain with ${result.vertexCount} vertices and ${result.faceCount} faces`);
  
  return result;
}

/**
 * Load heightmap image and convert to height data
 */
async function loadHeightmapData(imageUrl: string, resolution: number): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Set canvas size to desired resolution
      canvas.width = resolution;
      canvas.height = resolution;
      
      // Draw and scale image to canvas
      ctx.drawImage(img, 0, 0, resolution, resolution);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, resolution, resolution);
      const data = imageData.data;
      
      // Convert to height data
      const heightData = new Float32Array(resolution * resolution);
      
      // Analyze image to determine if it's suitable for heightmap
      let minBrightness = 255;
      let maxBrightness = 0;
      let totalBrightness = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        
        // Convert RGB to grayscale using more accurate luminance formula
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const grayscale = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        
        minBrightness = Math.min(minBrightness, grayscale);
        maxBrightness = Math.max(maxBrightness, grayscale);
        totalBrightness += grayscale;
        
        // Normalize to 0-1 range with better contrast
        heightData[pixelIndex] = grayscale / 255;
      }
      
      // Calculate contrast and apply enhancement if needed
      const contrast = (maxBrightness - minBrightness) / 255;
      const avgBrightness = totalBrightness / (resolution * resolution);
      
      console.log(`Image analysis: contrast=${contrast.toFixed(3)}, avg brightness=${(avgBrightness/255).toFixed(3)}`);
      
      // Always normalize to full range for better terrain variation
      console.log('Normalizing height data for optimal terrain generation...');
      for (let i = 0; i < heightData.length; i++) {
        // Normalize to 0-1 range using min/max values
        const normalized = (heightData[i] * 255 - minBrightness) / (maxBrightness - minBrightness);
        heightData[i] = Math.max(0, Math.min(1, normalized));
      }
      
      // Apply smoothing for non-heightmap images
      if (contrast > 0.7) {
        console.log('High contrast detected, applying smoothing...');
        const smoothedData = new Float32Array(heightData.length);
        const smoothRadius = 1;
        
        for (let y = 0; y < resolution; y++) {
          for (let x = 0; x < resolution; x++) {
            let sum = 0;
            let count = 0;
            
            for (let dy = -smoothRadius; dy <= smoothRadius; dy++) {
              for (let dx = -smoothRadius; dx <= smoothRadius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < resolution && ny >= 0 && ny < resolution) {
                  sum += heightData[ny * resolution + nx];
                  count++;
                }
              }
            }
            
            smoothedData[y * resolution + x] = sum / count;
          }
        }
        
        // Copy smoothed data back
        for (let i = 0; i < heightData.length; i++) {
          heightData[i] = smoothedData[i];
        }
      }
      
      resolve(heightData);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load heightmap image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Generate 3D terrain geometry from height data
 */
function generateTerrainGeometry(
  heightData: Float32Array, 
  resolution: number, 
  heightScale: number
): TerrainResult {
  console.log('Generating terrain geometry...');
  
  const geometry = new THREE.BufferGeometry();
  
  // Calculate terrain dimensions
  const terrainSize = 100; // World units
  const stepSize = terrainSize / (resolution - 1);
  
  // Generate vertices
  const vertices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  
  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      const index = z * resolution + x;
      const height = heightData[index] * heightScale;
      
      // World position
      const worldX = (x - resolution / 2) * stepSize;
      const worldZ = (z - resolution / 2) * stepSize;
      
      // Add vertex (Y is up in Three.js) - поднимаем базовую высоту
      vertices.push(worldX, height + 5, worldZ);
      
      // Add UV coordinates
      uvs.push(x / (resolution - 1), z / (resolution - 1));
      
      // Generate color based on height
      const normalizedHeight = height / heightScale;
      const color = getTerrainColor(normalizedHeight);
      colors.push(color.r, color.g, color.b);
      
      // Temporary normal (will be recalculated)
      normals.push(0, 1, 0);
    }
  }
  
  // Generate indices for triangles
  const indices: number[] = [];
  
  for (let z = 0; z < resolution - 1; z++) {
    for (let x = 0; x < resolution - 1; x++) {
      const topLeft = z * resolution + x;
      const topRight = z * resolution + x + 1;
      const bottomLeft = (z + 1) * resolution + x;
      const bottomRight = (z + 1) * resolution + x + 1;
      
      // First triangle
      indices.push(topLeft, bottomLeft, topRight);
      
      // Second triangle
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }
  
  // Set geometry attributes
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  
  // Compute proper normals
  geometry.computeVertexNormals();
  
  const vertexCount = vertices.length / 3;
  const faceCount = indices.length / 3;
  
  console.log(`Generated ${vertexCount} vertices and ${faceCount} faces`);
  
  return {
    geometry,
    colors: new Float32Array(colors),
    vertexCount,
    faceCount
  };
}

/**
 * Generate terrain color based on height
 */
function getTerrainColor(normalizedHeight: number): THREE.Color {
  // Color gradient based on height
  if (normalizedHeight < 0.2) {
    // Water/Low areas - blue
    return new THREE.Color(0x1e40af);
  } else if (normalizedHeight < 0.4) {
    // Beach/Sand - yellow
    return new THREE.Color(0xfbbf24);
  } else if (normalizedHeight < 0.7) {
    // Grass/Forest - green
    return new THREE.Color(0x16a34a);
  } else if (normalizedHeight < 0.9) {
    // Rock/Mountain - gray
    return new THREE.Color(0x6b7280);
  } else {
    // Snow peaks - white
    return new THREE.Color(0xffffff);
  }
}

/**
 * Generate a simple regular grid terrain for testing
 */
export function generateRegularGrid(size: number = 10): TerrainResult {
  console.log(`Generating regular grid: ${size}x${size}`);
  
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  
  // Generate vertices in a grid pattern
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      // Position
      vertices.push(x - size/2, 0, z - size/2);
      
      // UV coordinates
      uvs.push(x / (size - 1), z / (size - 1));
      
      // Alternate colors for visualization
      const color = (x + z) % 2 === 0 ? 
        new THREE.Color(0x00ff00) : new THREE.Color(0x0000ff);
      colors.push(color.r, color.g, color.b);
    }
  }
  
  // Generate indices
  for (let z = 0; z < size - 1; z++) {
    for (let x = 0; x < size - 1; x++) {
      const topLeft = z * size + x;
      const topRight = z * size + x + 1;
      const bottomLeft = (z + 1) * size + x;
      const bottomRight = (z + 1) * size + x + 1;
      
      // Two triangles per quad
      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }
  
  // Set attributes
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return {
    geometry,
    colors: new Float32Array(colors),
    vertexCount: vertices.length / 3,
    faceCount: indices.length / 3
  };
}
