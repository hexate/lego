import { LDrawViewer } from './viewer/LDrawViewer';
import { LDRAW_SYSTEM_PROMPT, buildPrompt } from './llm/systemPrompt';

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

  // LDraw mode elements
  private ldrawSection: HTMLElement;
  private textArea: HTMLTextAreaElement;
  private renderBtn: HTMLButtonElement;

  // AI mode elements
  private aiSection: HTMLElement;
  private aiPromptInput: HTMLTextAreaElement;
  private copyPromptBtn: HTMLButtonElement;
  private copyHint: HTMLElement;

  // Mode toggle
  private modeLdrawBtn: HTMLButtonElement;
  private modeAiBtn: HTMLButtonElement;

  // Step controls
  private stepControls: HTMLElement;
  private currentStepEl: HTMLElement;
  private totalStepsEl: HTMLElement;
  private stepSlider: HTMLInputElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;

  // Error/loading
  private errorDisplay: HTMLElement;
  private errorMessage: HTMLElement;
  private loading: HTMLElement;
  private loadingText: HTMLElement;

  constructor() {
    // Get DOM elements - Mode toggle
    this.modeLdrawBtn = document.getElementById('mode-ldraw') as HTMLButtonElement;
    this.modeAiBtn = document.getElementById('mode-ai') as HTMLButtonElement;

    // LDraw section
    this.ldrawSection = document.getElementById('ldraw-section') as HTMLElement;
    this.textArea = document.getElementById('ldraw-input') as HTMLTextAreaElement;
    this.renderBtn = document.getElementById('render-btn') as HTMLButtonElement;

    // AI section
    this.aiSection = document.getElementById('ai-section') as HTMLElement;
    this.aiPromptInput = document.getElementById('ai-prompt') as HTMLTextAreaElement;
    this.copyPromptBtn = document.getElementById('copy-prompt-btn') as HTMLButtonElement;
    this.copyHint = document.getElementById('copy-hint') as HTMLElement;

    // Step controls
    this.stepControls = document.getElementById('step-controls') as HTMLElement;
    this.currentStepEl = document.getElementById('current-step') as HTMLElement;
    this.totalStepsEl = document.getElementById('total-steps') as HTMLElement;
    this.stepSlider = document.getElementById('step-slider') as HTMLInputElement;
    this.prevBtn = document.getElementById('prev-step') as HTMLButtonElement;
    this.nextBtn = document.getElementById('next-step') as HTMLButtonElement;

    // Error/loading
    this.errorDisplay = document.getElementById('error-display') as HTMLElement;
    this.errorMessage = document.getElementById('error-message') as HTMLElement;
    this.loading = document.getElementById('loading') as HTMLElement;
    this.loadingText = document.getElementById('loading-text') as HTMLElement;

    // Initialize viewer
    const canvas = document.getElementById('viewer-canvas') as HTMLCanvasElement;
    this.viewer = new LDrawViewer(canvas);

    // Set up event listeners
    this.setupEventListeners();

    // Load sample model
    this.textArea.value = SAMPLE_LDRAW;
  }

  private setupEventListeners(): void {
    // Mode toggle
    this.modeLdrawBtn.addEventListener('click', () => this.setMode('ldraw'));
    this.modeAiBtn.addEventListener('click', () => this.setMode('ai'));

    // Render button (LDraw mode)
    this.renderBtn.addEventListener('click', () => this.handleRender());

    // Copy prompt button (AI mode)
    this.copyPromptBtn.addEventListener('click', () => this.handleCopyPrompt());

    // Step navigation
    this.prevBtn.addEventListener('click', () => {
      this.viewer?.prevStep();
    });

    this.nextBtn.addEventListener('click', () => {
      this.viewer?.nextStep();
    });

    // Step slider
    this.stepSlider.addEventListener('input', () => {
      const step = parseInt(this.stepSlider.value, 10);
      this.viewer?.setStep(step);
    });

    // Step change callback
    this.viewer?.onStepChange((current, total) => {
      this.updateStepUI(current, total);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't capture when typing in inputs
      if (e.target === this.textArea || e.target === this.aiPromptInput) {
        return;
      }

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

  private setMode(mode: 'ldraw' | 'ai'): void {
    if (mode === 'ldraw') {
      this.modeLdrawBtn.classList.add('active');
      this.modeAiBtn.classList.remove('active');
      this.ldrawSection.style.display = 'flex';
      this.aiSection.style.display = 'none';
    } else {
      this.modeLdrawBtn.classList.remove('active');
      this.modeAiBtn.classList.add('active');
      this.ldrawSection.style.display = 'none';
      this.aiSection.style.display = 'flex';
    }
  }

  private async handleRender(): Promise<void> {
    const ldrawText = this.textArea.value.trim();
    if (!ldrawText) {
      this.showError('Please enter LDraw code');
      return;
    }

    this.hideError();
    this.showLoading('Loading model...');
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

  private async handleCopyPrompt(): Promise<void> {
    const userPrompt = this.aiPromptInput.value.trim();
    if (!userPrompt) {
      this.showError('Please describe what you want to build');
      return;
    }

    this.hideError();

    // Build the full prompt
    const fullPrompt = `${LDRAW_SYSTEM_PROMPT}\n\n---\n\n${buildPrompt(userPrompt)}`;

    try {
      await navigator.clipboard.writeText(fullPrompt);

      // Show success hint
      this.copyHint.style.display = 'block';
      this.copyPromptBtn.textContent = 'Copied!';

      // Reset button text after 2 seconds
      setTimeout(() => {
        this.copyPromptBtn.textContent = 'Copy Prompt for Claude';
      }, 2000);
    } catch (error) {
      this.showError('Failed to copy to clipboard');
    }
  }

  private updateStepUI(current: number, total: number): void {
    this.currentStepEl.textContent = String(current);
    this.totalStepsEl.textContent = String(total);
    this.stepSlider.max = String(total);
    this.stepSlider.value = String(current);
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

  private showLoading(text: string): void {
    this.loadingText.textContent = text;
    this.loading.style.display = 'block';
  }

  private hideLoading(): void {
    this.loading.style.display = 'none';
  }
}

// Initialize app
new App();
