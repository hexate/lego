import { LDrawViewer } from './viewer/LDrawViewer';

// Sample LDraw model for testing
const SAMPLE_LDRAW = `0 FILE sample.ldr
0 Name: Sample Stack
0 Author: LEGO Builder

0 STEP
1 4 0 0 0 1 0 0 0 1 0 0 0 1 3001.dat

0 STEP
1 14 0 -24 0 1 0 0 0 1 0 0 0 1 3001.dat

0 STEP
1 1 0 -48 0 1 0 0 0 1 0 0 0 1 3001.dat
`;

class App {
  private viewer: LDrawViewer | null = null;
  private textArea: HTMLTextAreaElement;
  private renderBtn: HTMLButtonElement;
  private stepControls: HTMLElement;
  private currentStepEl: HTMLElement;
  private totalStepsEl: HTMLElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private errorDisplay: HTMLElement;
  private errorMessage: HTMLElement;
  private loading: HTMLElement;

  constructor() {
    // Get DOM elements
    this.textArea = document.getElementById('ldraw-input') as HTMLTextAreaElement;
    this.renderBtn = document.getElementById('render-btn') as HTMLButtonElement;
    this.stepControls = document.getElementById('step-controls') as HTMLElement;
    this.currentStepEl = document.getElementById('current-step') as HTMLElement;
    this.totalStepsEl = document.getElementById('total-steps') as HTMLElement;
    this.prevBtn = document.getElementById('prev-step') as HTMLButtonElement;
    this.nextBtn = document.getElementById('next-step') as HTMLButtonElement;
    this.errorDisplay = document.getElementById('error-display') as HTMLElement;
    this.errorMessage = document.getElementById('error-message') as HTMLElement;
    this.loading = document.getElementById('loading') as HTMLElement;

    // Initialize viewer
    const canvas = document.getElementById('viewer-canvas') as HTMLCanvasElement;
    this.viewer = new LDrawViewer(canvas);

    // Set up event listeners
    this.setupEventListeners();

    // Load sample model
    this.textArea.value = SAMPLE_LDRAW;
  }

  private setupEventListeners(): void {
    // Render button
    this.renderBtn.addEventListener('click', () => this.handleRender());

    // Step navigation
    this.prevBtn.addEventListener('click', () => {
      this.viewer?.prevStep();
    });

    this.nextBtn.addEventListener('click', () => {
      this.viewer?.nextStep();
    });

    // Step change callback
    this.viewer?.onStepChange((current, total) => {
      this.updateStepUI(current, total);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target === this.textArea) return; // Don't capture when typing

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        this.viewer?.nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.viewer?.prevStep();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        this.viewer?.resetCamera();
      }
    });
  }

  private async handleRender(): Promise<void> {
    const ldrawText = this.textArea.value.trim();
    if (!ldrawText) {
      this.showError('Please enter LDraw code');
      return;
    }

    this.hideError();
    this.showLoading();
    this.renderBtn.disabled = true;

    try {
      await this.viewer?.loadFromText(ldrawText);
      this.stepControls.style.display = 'block';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load model';
      this.showError(message);
      this.stepControls.style.display = 'none';
    } finally {
      this.hideLoading();
      this.renderBtn.disabled = false;
    }
  }

  private updateStepUI(current: number, total: number): void {
    this.currentStepEl.textContent = String(current);
    this.totalStepsEl.textContent = String(total);
    this.prevBtn.disabled = current <= 1;
    this.nextBtn.disabled = current >= total;
  }

  private showError(message: string): void {
    this.errorMessage.textContent = message;
    this.errorDisplay.style.display = 'block';
  }

  private hideError(): void {
    this.errorDisplay.style.display = 'none';
  }

  private showLoading(): void {
    this.loading.style.display = 'block';
  }

  private hideLoading(): void {
    this.loading.style.display = 'none';
  }
}

// Initialize app
new App();
