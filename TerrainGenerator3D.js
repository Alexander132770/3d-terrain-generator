
/**
 * 3D Terrain Generator - Laboratory Work #1
 * Web application for building and visualizing three-dimensional landscape from height maps
 * 
 * Technologies: Three.js, React, TypeScript
 * Author: [Your name]
 * Date: June 23, 2025
 */

// ===== MAIN COMPONENTS =====

// 1. TERRAIN GENERATOR (terrainGenerator.js)
class TerrainGenerator {
    constructor() {
        this.defaultResolution = 128;
        this.defaultHeightScale = 10;
    }

    // Process height map from image
    async processHeightmap(imageUrl, resolution = 128, heightScale = 10) {
        console.log(`Processing heightmap: ${imageUrl} at ${resolution}x${resolution} resolution`);
        
        const heightData = await this.loadHeightmapData(imageUrl, resolution);
        const result = this.generateTerrainGeometry(heightData, resolution, heightScale);
        
        console.log(`Generated terrain with ${result.vertexCount} vertices and ${result.faceCount} faces`);
        return result;
    }

    // Load and convert image to height data
    async loadHeightmapData(imageUrl, resolution) {
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
                canvas.width = resolution;
                canvas.height = resolution;
                ctx.drawImage(img, 0, 0, resolution, resolution);
                
                const imageData = ctx.getImageData(0, 0, resolution, resolution);
                const data = imageData.data;
                const heightData = new Float32Array(resolution * resolution);
                
                // Image analysis
                let minBrightness = 255;
                let maxBrightness = 0;
                let totalBrightness = 0;
                
                for (let i = 0; i < data.length; i += 4) {
                    const pixelIndex = i / 4;
                    
                    // Convert RGB to grayscale (improved formula)
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const grayscale = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    
                    minBrightness = Math.min(minBrightness, grayscale);
                    maxBrightness = Math.max(maxBrightness, grayscale);
                    totalBrightness += grayscale;
                    
                    heightData[pixelIndex] = grayscale / 255;
                }
                
                // Calculate contrast
                const contrast = (maxBrightness - minBrightness) / 255;
                const avgBrightness = totalBrightness / (resolution * resolution);
                
                console.log(`Image analysis: contrast=${contrast.toFixed(3)}, avg brightness=${(avgBrightness/255).toFixed(3)}`);
                
                // Normalize for optimal terrain generation
                console.log('Normalizing height data for optimal terrain generation...');
                for (let i = 0; i < heightData.length; i++) {
                    const normalized = (heightData[i] * 255 - minBrightness) / (maxBrightness - minBrightness);
                    heightData[i] = Math.max(0, Math.min(1, normalized));
                }
                
                // Smoothing for high contrast images
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

    // Generate 3D terrain geometry
    generateTerrainGeometry(heightData, resolution, heightScale) {
        console.log('Generating terrain geometry...');
        
        const geometry = new THREE.BufferGeometry();
        const terrainSize = 100; // Terrain size in world units
        const stepSize = terrainSize / (resolution - 1);
        
        const vertices = [];
        const colors = [];
        const uvs = [];
        const indices = [];
        
        // Generate vertices
        for (let z = 0; z < resolution; z++) {
            for (let x = 0; x < resolution; x++) {
                const index = z * resolution + x;
                const height = heightData[index] * heightScale;
                
                const worldX = (x - resolution / 2) * stepSize;
                const worldZ = (z - resolution / 2) * stepSize;
                
                // Add vertex (raise base height)
                vertices.push(worldX, height + 5, worldZ);
                
                // UV coordinates
                uvs.push(x / (resolution - 1), z / (resolution - 1));
                
                // Color based on height
                const normalizedHeight = height / heightScale;
                const color = this.getTerrainColor(normalizedHeight);
                colors.push(color.r, color.g, color.b);
            }
        }
        
        // Generate indices for triangles
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
        geometry.computeVertexNormals();
        
        const vertexCount = vertices.length / 3;
        const faceCount = indices.length / 3;
        
        return {
            geometry,
            colors: new Float32Array(colors),
            vertexCount,
            faceCount
        };
    }

    // Generate terrain color based on height
    getTerrainColor(normalizedHeight) {
        if (normalizedHeight < 0.2) {
            return new THREE.Color(0x1e40af); // Water - blue
        } else if (normalizedHeight < 0.4) {
            return new THREE.Color(0xfbbf24); // Beach - yellow
        } else if (normalizedHeight < 0.7) {
            return new THREE.Color(0x16a34a); // Grass - green
        } else if (normalizedHeight < 0.9) {
            return new THREE.Color(0x6b7280); // Rocks - gray
        } else {
            return new THREE.Color(0xffffff); // Snow - white
        }
    }
}

// ===== TERRAIN VISUALIZATION COMPONENT =====
class TerrainViewer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.terrainMesh = null;
        this.terrainGenerator = new TerrainGenerator();
        
        this.init();
        this.createDefaultTerrain();
        this.animate();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(50, 30, 50);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.setScalar(2048);
        this.scene.add(directionalLight);
        
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.6);
        this.scene.add(hemisphereLight);
        
        // Camera controls (requires OrbitControls)
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enablePan = true;
            this.controls.enableZoom = true;
            this.controls.enableRotate = true;
            this.controls.maxPolarAngle = Math.PI / 2;
            this.controls.minDistance = 10;
            this.controls.maxDistance = 200;
        }
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    createDefaultTerrain() {
        const width = 128;
        const height = 128;
        const geometry = new THREE.BufferGeometry();
        
        const vertices = [];
        const uvs = [];
        const indices = [];
        const terrainSize = 100;
        const stepSize = terrainSize / (width - 1);
        
        // Generate vertices for horizontal terrain
        for (let z = 0; z < height; z++) {
            for (let x = 0; x < width; x++) {
                const worldX = (x - width / 2) * stepSize;
                const worldZ = (z - height / 2) * stepSize;
                
                // Sinusoidal pattern for demonstration
                const heightValue = Math.sin(worldX * 0.05) * Math.cos(worldZ * 0.05) * 8;
                
                vertices.push(worldX, heightValue + 5, worldZ);
                uvs.push(x / (width - 1), z / (height - 1));
            }
        }
        
        // Generate indices
        for (let z = 0; z < height - 1; z++) {
            for (let x = 0; x < width - 1; x++) {
                const topLeft = z * width + x;
                const topRight = z * width + x + 1;
                const bottomLeft = (z + 1) * width + x;
                const bottomRight = (z + 1) * width + x + 1;
                
                indices.push(topLeft, bottomLeft, topRight);
                indices.push(topRight, bottomLeft, bottomRight);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        // Materials
        const solidMaterial = new THREE.MeshLambertMaterial({
            color: 0x4CAF50,
            side: THREE.DoubleSide
        });
        
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            side: THREE.DoubleSide
        });
        
        // Create mesh
        this.terrainMesh = new THREE.Mesh(geometry, solidMaterial);
        this.terrainMesh.castShadow = true;
        this.terrainMesh.receiveShadow = true;
        this.scene.add(this.terrainMesh);
        
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x404040 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -10;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Grid
        const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x444444);
        gridHelper.position.y = -9.9;
        this.scene.add(gridHelper);
        
        console.log('Generated default terrain: 128x128 vertices');
    }

    async loadHeightmap(imageUrl, resolution = 128, heightScale = 10) {
        try {
            const result = await this.terrainGenerator.processHeightmap(imageUrl, resolution, heightScale);
            
            if (this.terrainMesh) {
                this.terrainMesh.geometry.dispose();
                this.terrainMesh.geometry = result.geometry;
                
                // Update material to display vertex colors
                const material = this.terrainMesh.material;
                if (material instanceof THREE.MeshLambertMaterial) {
                    material.vertexColors = true;
                    material.needsUpdate = true;
                }
            }
            
            return {
                vertices: result.vertexCount,
                faces: result.faceCount
            };
        } catch (error) {
            console.error('Error loading heightmap:', error);
            throw error;
        }
    }

    toggleWireframe(enabled) {
        if (this.terrainMesh) {
            const currentMaterial = this.terrainMesh.material;
            if (enabled) {
                this.terrainMesh.material = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    wireframe: true,
                    side: THREE.DoubleSide
                });
            } else {
                this.terrainMesh.material = new THREE.MeshLambertMaterial({
                    color: 0x4CAF50,
                    side: THREE.DoubleSide,
                    vertexColors: currentMaterial.vertexColors || false
                });
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// ===== CONTROL INTERFACE =====
class TerrainControls {
    constructor(terrainViewer) {
        this.terrainViewer = terrainViewer;
        this.isWireframe = false;
        this.terrainSize = 128;
        this.heightScale = 10;
        this.isProcessing = false;
        
        this.createUI();
    }

    createUI() {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'ui-overlay';
        controlsContainer.innerHTML = `
            <h3>🏔️ 3D Terrain Generator</h3>
            
            <div class="control-group">
                <label>Upload Custom Heightmap:</label>
                <input type="file" id="heightmapInput" accept="image/*" />
                <small style="color: #888; font-size: 11px; margin-top: 5px; display: block;">
                    <strong>Tip:</strong> For better results, use grayscale images.<br/>
                    The program automatically converts color images to height maps.
                </small>
            </div>

            <div class="control-group">
                <label>Terrain Resolution: <span id="resolutionValue">${this.terrainSize}</span>x<span id="resolutionValue2">${this.terrainSize}</span></label>
                <input type="range" id="resolutionSlider" min="64" max="256" step="32" value="${this.terrainSize}" />
            </div>

            <div class="control-group">
                <label>Height Scale: <span id="scaleValue">${this.heightScale}</span>x</label>
                <input type="range" id="scaleSlider" min="1" max="50" step="1" value="${this.heightScale}" />
            </div>

            <div class="control-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="wireframeCheck" />
                    <label for="wireframeCheck">Wireframe Mode</label>
                </div>
            </div>

            <div class="control-group">
                <button id="generateBtn">Update Terrain</button>
            </div>

            <div id="stats" class="stats" style="display: none;">
                <div><strong>Terrain Statistics:</strong></div>
                <div id="verticesCount"></div>
                <div id="facesCount"></div>
                <div id="processingTime"></div>
            </div>

            <div class="stats">
                <div><strong>Height Map Examples:</strong></div>
                <div>• Mountains: white peaks, black valleys</div>
                <div>• Hills: gray tones for smoothness</div>
                <div>• Canyons: sharp black-white transitions</div>
                <br/>
                <div><strong>Controls:</strong></div>
                <div>• Mouse: Rotate camera</div>
                <div>• Wheel: Zoom</div>
                <div>• Right click + drag: Pan</div>
            </div>
        `;
        
        document.body.appendChild(controlsContainer);
        this.bindEvents();
    }

    bindEvents() {
        // File upload
        document.getElementById('heightmapInput').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
        
        // Resolution
        document.getElementById('resolutionSlider').addEventListener('input', (e) => {
            this.terrainSize = parseInt(e.target.value);
            document.getElementById('resolutionValue').textContent = this.terrainSize;
            document.getElementById('resolutionValue2').textContent = this.terrainSize;
        });
        
        // Height scale
        document.getElementById('scaleSlider').addEventListener('input', (e) => {
            this.heightScale = parseFloat(e.target.value);
            document.getElementById('scaleValue').textContent = this.heightScale;
        });
        
        // Wireframe
        document.getElementById('wireframeCheck').addEventListener('change', (e) => {
            this.isWireframe = e.target.checked;
            this.terrainViewer.toggleWireframe(this.isWireframe);
        });
        
        // Generation
        document.getElementById('generateBtn').addEventListener('click', () => {
            // Generation logic can be added here
        });
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
                alert('File is too large. Please select an image smaller than 5MB.');
                return;
            }
            
            const url = URL.createObjectURL(file);
            console.log(`Loading custom heightmap: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
            
            this.isProcessing = true;
            const startTime = performance.now();
            
            try {
                const stats = await this.terrainViewer.loadHeightmap(url, this.terrainSize, this.heightScale);
                
                const endTime = performance.now();
                const processingTime = Math.round(endTime - startTime);
                
                this.updateStats(stats.vertices, stats.faces, processingTime);
                console.log(`Heightmap processed in ${processingTime}ms`);
                
            } catch (error) {
                console.error('Error processing heightmap:', error);
                alert('Error loading height map. Please check the file format.');
            } finally {
                this.isProcessing = false;
            }
        } else {
            alert('Please select a valid image file.');
        }
    }

    updateStats(vertices, faces, processingTime) {
        const statsDiv = document.getElementById('stats');
        statsDiv.style.display = 'block';
        
        document.getElementById('verticesCount').textContent = `Vertices: ${vertices.toLocaleString()}`;
        document.getElementById('facesCount').textContent = `Faces: ${faces.toLocaleString()}`;
        document.getElementById('processingTime').textContent = `Processing time: ${processingTime}ms`;
    }
}

// ===== APPLICATION INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Create container
    const container = document.getElementById('container') || document.body;
    
    // Initialize application
    const terrainViewer = new TerrainViewer(container);
    const terrainControls = new TerrainControls(terrainViewer);
    
    console.log('3D Terrain Generator initialized successfully!');
});

// ===== CSS STYLES (add to HTML) =====
const css = `
<style>
body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    background: #000;
}

.ui-overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    padding: 20px;
    color: white;
    font-size: 14px;
    min-width: 300px;
}

.ui-overlay h3 {
    margin: 0 0 15px 0;
    color: #4CAF50;
}

.control-group {
    margin-bottom: 15px;
}

.control-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}

.control-group input, .control-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #444;
    border-radius: 5px;
    background: #222;
    color: white;
    font-size: 14px;
}

.control-group button {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 5px;
    background: #4CAF50;
    color: white;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.3s;
}

.control-group button:hover {
    background: #45a049;
}

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.checkbox-group input[type="checkbox"] {
    width: auto;
}

.stats {
    font-size: 12px;
    color: #aaa;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #444;
}
</style>
`;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TerrainGenerator,
        TerrainViewer,
        TerrainControls
    };
}
