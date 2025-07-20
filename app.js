// app.js

// ——————————————————————————————————
// 1. Variables globales (lee cm y convierte a m)
// ——————————————————————————————————
let scene, camera, renderer, controls;
let tankMesh, waterMesh;
const gravelGroup = new THREE.Group();
const plantGroup  = new THREE.Group();

// Recursos del usuario
let gravillaTexture = null;
let plantGltf        = null;

// Valores iniciales en cm → metros para Three.js
let tankWidth  = parseFloat(document.getElementById('width').value)  / 100;
let tankHeight = parseFloat(document.getElementById('height').value) / 100;
let tankDepth  = parseFloat(document.getElementById('depth').value)  / 100;

// ——————————————————————————————————
// 2. Inicialización de la escena
// ——————————————————————————————————
function init() {
    scene = new THREE.Scene();

    // Cámara
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(4, 3, 5);

    // Renderizador
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(window.innerWidth - 300, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('scene-container').appendChild(renderer.domElement);

    // Controles
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Iluminación
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Grupos de objetos
    scene.add(gravelGroup);
    scene.add(plantGroup);

    // Listeners para subir archivos
    setupFileInputs();

    // Crear pecera + agua y arrancar loop
    createTank();
    window.addEventListener('resize', onWindowResize);
    animate();
}

// ——————————————————————————————————
// 3. Listeners para file inputs
// ——————————————————————————————————
function setupFileInputs() {
    // Textura de gravilla
    document.getElementById('gravillaTextureInput')
        .addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            new THREE.TextureLoader().load(url, tex => {
                gravillaTexture = tex;
                gravillaTexture.wrapS = gravillaTexture.wrapT = THREE.RepeatWrapping;
            });
        });

    // Modelo de planta
    document.getElementById('plantModelInput')
        .addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const url    = URL.createObjectURL(file);
            const loader = new THREE.GLTFLoader();
            loader.load(url, gltf => {
                plantGltf = gltf.scene;
            });
        });
}

// ——————————————————————————————————
// 4. Crear / actualizar la pecera + agua
// ——————————————————————————————————
function createTank() {
    // Eliminar versiones anteriores
    if (tankMesh) {
        scene.remove(tankMesh);
        tankMesh.geometry.dispose();
        tankMesh.material.dispose();
    }
    if (waterMesh) {
        scene.remove(waterMesh);
        waterMesh.geometry.dispose();
        waterMesh.material.dispose();
    }

    // Cristal de la pecera (muy transparente)
    const geo = new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth);
    const mat = new THREE.MeshBasicMaterial({
        color:       0xffffff,
        transparent: true,
        opacity:     0.05,
        side:        THREE.DoubleSide
    });
    tankMesh = new THREE.Mesh(geo, mat);
    tankMesh.position.y = tankHeight / 2;
    scene.add(tankMesh);

    // Agua al 90% de la altura
    const waterHeight = tankHeight * 0.9;
    const geoW = new THREE.BoxGeometry(
        tankWidth * 0.98,
        waterHeight,
        tankDepth * 0.98
    );
    const matW = new THREE.MeshPhongMaterial({
        color:       0x64b5f6,
        transparent: true,
        opacity:     0.4
    });
    waterMesh = new THREE.Mesh(geoW, matW);
    waterMesh.position.y = waterHeight / 2;
    scene.add(waterMesh);
}

// ——————————————————————————————————
// 5. Añadir gravilla (usa textura si existe)
// ——————————————————————————————————
function addGravel() {
    const count  = 50;
    const radius = 0.05;
    for (let i = 0; i < count; i++) {
        const sphereGeo = new THREE.SphereGeometry(radius, 8, 8);
        const matOpts   = gravillaTexture
            ? { map: gravillaTexture }
            : { color: 0x8d6e63 };
        const sphereMat = new THREE.MeshPhongMaterial(matOpts);
        const sphere    = new THREE.Mesh(sphereGeo, sphereMat);

        // Posición aleatoria en la base
        const x = (Math.random() - 0.5) * (tankWidth  - radius * 2);
        const z = (Math.random() - 0.5) * (tankDepth  - radius * 2);
        sphere.position.set(x, radius / 2, z);

        gravelGroup.add(sphere);
    }
}

// ——————————————————————————————————
// 6. Añadir planta (usa modelo GLTF si existe)
// ——————————————————————————————————
function addPlant() {
    if (plantGltf) {
        const plant = plantGltf.clone();
        const scale = 0.5;
        plant.scale.set(scale, scale, scale);
        const x = (Math.random() - 0.5) * (tankWidth - 0.3);
        const z = (Math.random() - 0.5) * (tankDepth - 0.3);
        plant.position.set(x, 0, z);
        plantGroup.add(plant);
        return;
    }

    // Primitiva por defecto
    const stemHeight = 0.8;
    const stemGeo    = new THREE.CylinderGeometry(0.02, 0.02, stemHeight, 8);
    const stemMat    = new THREE.MeshPhongMaterial({ color: 0x2e7d32 });
    const stem       = new THREE.Mesh(stemGeo, stemMat);

    const leafGeo = new THREE.ConeGeometry(0.15, 0.3, 8);
    const leafMat = new THREE.MeshPhongMaterial({ color: 0x66bb6a });
    const leaf    = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.y = stemHeight / 2 + 0.15;

    const plant = new THREE.Group();
    stem.position.y = stemHeight / 2;
    plant.add(stem, leaf);

    const x = (Math.random() - 0.5) * (tankWidth - 0.3);
    const z = (Math.random() - 0.5) * (tankDepth - 0.3);
    plant.position.set(x, 0, z);

    plantGroup.add(plant);
}

// ——————————————————————————————————
// 7. Handlers de UI
// ——————————————————————————————————
document.getElementById('updateDimensions')
    .addEventListener('click', () => {
        tankWidth  = parseFloat(document.getElementById('width').value)  / 100;
        tankHeight = parseFloat(document.getElementById('height').value) / 100;
        tankDepth  = parseFloat(document.getElementById('depth').value)  / 100;

        createTank();
        gravelGroup.clear();
        plantGroup.clear();
    });

document.getElementById('addGravel')
    .addEventListener('click', addGravel);

document.getElementById('addPlant')
    .addEventListener('click', addPlant);

// ——————————————————————————————————
// 8. Animación y resize
// ——————————————————————————————————
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const width  = window.innerWidth - 300;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// ——————————————————————————————————
// 9. Arrancar
// ——————————————————————————————————
init();
