import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LDrawLoader } from 'three/addons/loaders/LDrawLoader.js';

export class LDrawViewer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private loader: LDrawLoader;
  private currentModel: THREE.Group | null = null;
  private currentStep = 0;
  private totalSteps = 0;
  private materialsLoaded = false;

  private onStepChangeCallback: ((current: number, total: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2a2a);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      1,
      10000
    );
    this.camera.position.set(150, 200, 250);

    // Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-100, 100, -100);
    this.scene.add(directionalLight2);

    // Grid helper
    const gridHelper = new THREE.GridHelper(400, 20, 0x444444, 0x333333);
    this.scene.add(gridHelper);

    // LDraw Loader - use Vite proxy to avoid CORS issues
    this.loader = new LDrawLoader();
    this.loader.setPartsLibraryPath('/ldraw/');

    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this));

    // Start render loop
    this.animate();
  }

  private handleResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  async loadFromText(ldrawText: string): Promise<void> {
    // Remove existing model
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }

    // Preload materials (color definitions) on first load
    if (!this.materialsLoaded) {
      await this.loader.preloadMaterials('/ldraw/LDConfig.ldr');
      this.materialsLoaded = true;
    }

    // Create blob URL from text
    const blob = new Blob([ldrawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    try {
      const model = await this.loader.loadAsync(url);

      // LDrawLoader returns model with Y-up, but LDraw uses -Y up
      // The loader handles this, but we may need to adjust
      model.rotation.x = Math.PI;

      this.currentModel = model;
      this.scene.add(model);

      // Get step count from model
      this.totalSteps = (model.userData.numBuildingSteps as number) || 1;
      this.currentStep = this.totalSteps; // Show complete model initially

      // Center camera on model
      this.fitCameraToModel(model);

      // Update step visibility
      this.updateStepVisibility();

      // Notify callback
      if (this.onStepChangeCallback) {
        this.onStepChangeCallback(this.currentStep, this.totalSteps);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private fitCameraToModel(model: THREE.Group): void {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDistance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;

    this.camera.position.set(
      center.x + cameraDistance * 0.5,
      center.y + cameraDistance * 0.5,
      center.z + cameraDistance
    );
    this.controls.target.copy(center);
    this.controls.update();
  }

  private updateStepVisibility(): void {
    if (!this.currentModel) return;

    this.currentModel.traverse((node) => {
      if (node.isGroup && node.userData.buildingStep !== undefined) {
        node.visible = node.userData.buildingStep <= this.currentStep;
      }
    });
  }

  setStep(step: number): void {
    if (!this.currentModel) return;

    this.currentStep = Math.max(1, Math.min(step, this.totalSteps));
    this.updateStepVisibility();

    if (this.onStepChangeCallback) {
      this.onStepChangeCallback(this.currentStep, this.totalSteps);
    }
  }

  nextStep(): void {
    this.setStep(this.currentStep + 1);
  }

  prevStep(): void {
    this.setStep(this.currentStep - 1);
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getTotalSteps(): number {
    return this.totalSteps;
  }

  onStepChange(callback: (current: number, total: number) => void): void {
    this.onStepChangeCallback = callback;
  }

  resetCamera(): void {
    if (this.currentModel) {
      this.fitCameraToModel(this.currentModel);
    }
  }
}
