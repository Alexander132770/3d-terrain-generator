import React, { useState, useRef } from 'react';
import { processHeightmap } from '../utils/terrainGenerator';

const TerrainControls: React.FC = () => {
  const [isWireframe, setIsWireframe] = useState(false);
  const [selectedHeightmap, setSelectedHeightmap] = useState('default');
  const [terrainSize, setTerrainSize] = useState(256);
  const [heightScale, setHeightScale] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    vertices: 0,
    faces: 0,
    processingTime: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available heightmap presets - used with user uploaded files
  const heightmapPresets = [
    { value: 'default', label: 'Default Terrain (Generated)' }
  ];

  // Toggle wireframe mode
  const handleWireframeToggle = () => {
    const newWireframe = !isWireframe;
    setIsWireframe(newWireframe);
    
    // Dispatch event to terrain viewer
    window.dispatchEvent(new CustomEvent('wireframeToggle', {
      detail: { wireframe: newWireframe }
    }));
  };

  // Load and process heightmap
  const processHeightmapImage = async (imageUrl: string) => {
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      console.log(`Processing heightmap: ${imageUrl}`);
      
      const result = await processHeightmap(imageUrl, terrainSize, heightScale);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Update stats
      setStats({
        vertices: result.vertexCount,
        faces: result.faceCount,
        processingTime: Math.round(processingTime)
      });
      
      // Dispatch event to terrain viewer
      window.dispatchEvent(new CustomEvent('heightmapProcessed', {
        detail: {
          geometry: result.geometry,
          colors: result.colors
        }
      }));
      
      console.log(`Heightmap processed in ${processingTime}ms`);
      
    } catch (error) {
      console.error('Error processing heightmap:', error);
      alert('Error loading heightmap. Please check the file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle preset heightmap selection
  const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    setSelectedHeightmap(selectedValue);
    
    if (selectedValue === 'default') {
      // Regenerate default terrain by dispatching empty event
      window.dispatchEvent(new CustomEvent('generateDefaultTerrain'));
    }
  };

  // Handle custom file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Check file size (limit to 5MB for performance)
      if (file.size > 5 * 1024 * 1024) {
        alert('Файл слишком большой. Пожалуйста, выберите изображение меньше 5MB.');
        return;
      }
      
      const url = URL.createObjectURL(file);
      console.log(`Loading custom heightmap: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
      processHeightmapImage(url);
    } else {
      alert('Пожалуйста, выберите корректный файл изображения.');
    }
  };

  // Handle terrain parameter changes
  const handleTerrainSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(event.target.value);
    setTerrainSize(size);
    // Re-generate terrain with new size
    if (selectedHeightmap === 'default') {
      window.dispatchEvent(new CustomEvent('generateDefaultTerrain'));
    }
  };

  const handleHeightScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const scale = parseFloat(event.target.value);
    setHeightScale(scale);
    // Re-generate terrain with new scale
    if (selectedHeightmap === 'default') {
      window.dispatchEvent(new CustomEvent('generateDefaultTerrain'));
    }
  };

  // Generate default terrain
  const generateDefaultTerrain = () => {
    if (selectedHeightmap === 'default') {
      window.dispatchEvent(new CustomEvent('generateDefaultTerrain'));
    }
  };

  return (
    <div className="ui-overlay">
      <h3>🏔️ 3D Terrain Generator</h3>
      
      {/* Heightmap Selection */}
      <div className="control-group">
        <label>Terrain Type:</label>
        <select value={selectedHeightmap} onChange={handlePresetChange}>
          {heightmapPresets.map(preset => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom File Upload */}
      <div className="control-group">
        <label>Upload Custom Heightmap:</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ fontSize: '12px' }}
        />
        <small style={{ color: '#888', fontSize: '11px', marginTop: '5px', display: 'block' }}>
          <strong>Совет:</strong> Для лучшего результата используйте изображения в градациях серого.<br/>
          Программа автоматически преобразует цветные изображения в карты высот.
        </small>
      </div>

      {/* Terrain Parameters */}
      <div className="control-group">
        <label>Terrain Resolution: {terrainSize}x{terrainSize}</label>
        <input
          type="range"
          min="128"
          max="512"
          step="64"
          value={terrainSize}
          onChange={handleTerrainSizeChange}
        />
      </div>

      <div className="control-group">
        <label>Height Scale: {heightScale}x</label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={heightScale}
          onChange={handleHeightScaleChange}
        />
      </div>

      {/* Rendering Options */}
      <div className="control-group">
        <div className="checkbox-group">
          <input
            type="checkbox"
            id="wireframe"
            checked={isWireframe}
            onChange={handleWireframeToggle}
          />
          <label htmlFor="wireframe">Wireframe Mode</label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="control-group">
        <button 
          onClick={generateDefaultTerrain}
          disabled={isProcessing}
        >
          {isProcessing ? 'Обработка...' : 'Обновить местность'}
        </button>
      </div>

      {/* Statistics */}
      {stats.vertices > 0 && (
        <div className="stats">
          <div><strong>Статистика местности:</strong></div>
          <div>Вершины: {stats.vertices.toLocaleString()}</div>
          <div>Грани: {stats.faces.toLocaleString()}</div>
          <div>Время обработки: {stats.processingTime}ms</div>
          <div style={{ color: '#4CAF50', fontSize: '12px', marginTop: '5px' }}>
            ✓ Terrain generated successfully
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="stats">
        <div><strong>Примеры карт высот:</strong></div>
        <div>• Горы: белые пики, черные долины</div>
        <div>• Холмы: серые оттенки для плавности</div>
        <div>• Каньоны: резкие переходы черный-белый</div>
        <br/>
        <div><strong>Управление:</strong></div>
        <div>• Мышь: Поворот камеры</div>
        <div>• Колесо: Масштаб</div>
        <div>• ПКМ + перетаскивание: Панорама</div>
      </div>
    </div>
  );
};

export default TerrainControls;
