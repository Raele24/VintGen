import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageService, SavedListingItem } from './core/storage.service';
import { GeneratorService } from './core/generator.service';
import { ListingInput, VintedCondition, ListingResult } from '@vintgen/core';

interface UploadedImage {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  base64: string;
  previewUrl: string;
}

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  placement?: 'bottom' | 'top' | 'left' | 'right';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  public storage = inject(StorageService);
  public generator = inject(GeneratorService);

  // Form Inputs
  public uploadedImages = signal<UploadedImage[]>([]);
  public titleHint = signal<string>('');
  public brandHint = signal<string>('');
  public notes = signal<string>('');
  public conditionHint = signal<VintedCondition | ''>('');
  public language = signal<'en' | 'it' | 'fr' | 'es' | 'de'>('en');

  // Drag-and-drop state
  public isDragging = signal<boolean>(false);

  // API Key Modal State
  public showKeyModal = signal<boolean>(false);
  public tempApiKey = signal<string>('');
  public keyInputType = signal<'password' | 'text'>('password');
  public keyTestResult = signal<{ success: boolean; message: string } | null>(null);

  // Provider tab in modal
  public modalProvider = signal<'gemini' | 'openai' | 'claude' | 'ollama'>('gemini');
  public tempOllamaEndpoint = signal<string>('http://localhost:11434');
  public tempOllamaModel = signal<string>('llama3.2-vision');

  // Clipboard Feedback
  public copiedTarget = signal<string | null>(null);

  // Custom User Set Price
  public customPrice = signal<string>('');
  public selectedHistoryId = signal<string | null>(null);

  // Theme Management (Light / Dark)
  public theme = signal<'dark' | 'light'>('dark');

  // PWA Install State
  public deferredPrompt = signal<any>(null);
  public isAppInstalled = signal<boolean>(false);
  public isMobileMenuOpen = signal<boolean>(false);

  @HostListener('window:beforeinstallprompt', ['$event'])
  public onBeforeInstallPrompt(e: Event): void {
    e.preventDefault();
    this.deferredPrompt.set(e);
  }

  @HostListener('window:appinstalled')
  public onAppInstalled(): void {
    this.isAppInstalled.set(true);
    this.deferredPrompt.set(null);
  }

  public toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  public closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  public async installPwa(): Promise<void> {
    const prompt = this.deferredPrompt();
    if (!prompt) return;
    prompt.prompt();
    try {
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        this.isAppInstalled.set(true);
      }
    } catch {
      // Ignored
    }
    this.deferredPrompt.set(null);
  }

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vintgen_theme') as 'dark' | 'light' | null;
      if (saved === 'light' || saved === 'dark') {
        this.theme.set(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initial = prefersDark ? 'dark' : 'light';
        this.theme.set(initial);
        document.documentElement.setAttribute('data-theme', initial);
      }
    }
  }

  public toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('vintgen_theme', next);
    }
  }

  // Computed helper for canGenerate
  public hasActiveContent = computed(() => {
    return (
      !!this.generator.currentListing() ||
      this.uploadedImages().length > 0 ||
      !!this.titleHint().trim() ||
      !!this.notes().trim() ||
      !!this.brandHint().trim()
    );
  });

  public canGenerate = computed(() => {
    const hasImages = this.uploadedImages().length > 0;
    const hasNotes = this.notes().trim().length > 0;
    const notGenerating = !this.generator.isGenerating();
    return (hasImages || hasNotes) && notGenerating;
  });

  // Available condition options
  public conditionOptions = [
    { value: '', label: 'Auto-detect from photos' },
    { value: 'new_with_tags', label: 'New with tags' },
    { value: 'new_without_tags', label: 'New without tags' },
    { value: 'very_good', label: 'Very good' },
    { value: 'good', label: 'Good' },
    { value: 'satisfactory', label: 'Satisfactory' },
  ];

  // Available language options
  public languageOptions = [
    { value: 'en', label: 'English (Default)' },
    { value: 'it', label: 'Italian (Italiano)' },
    { value: 'fr', label: 'French (Français)' },
    { value: 'es', label: 'Spanish (Español)' },
    { value: 'de', label: 'German (Deutsch)' },
  ];

  /**
   * Handles files dropped onto the dropzone.
   */
  public onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files) {
      this.processFiles(event.dataTransfer.files);
    }
  }

  /**
   * Handles dragover styling.
   */
  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  /**
   * Handles dragleave.
   */
  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  /**
   * File input change handler.
   */
  public onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files);
      input.value = ''; // Reset for repeated uploads
    }
  }

  /**
   * Reads files and encodes them to base64.
   */
  private processFiles(fileList: FileList): void {
    const validImages = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/')
    );

    for (const file of validImages) {
      const reader = new FileReader();
      reader.onload = () => {
        const fullBase64 = reader.result as string;
        const cleanBase64 = fullBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
        const newImg: UploadedImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'image/jpeg',
          base64: cleanBase64,
          previewUrl: URL.createObjectURL(file),
        };
        this.uploadedImages.update((imgs) => [...imgs, newImg]);
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Removes an uploaded image thumbnail.
   */
  public removeImage(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.uploadedImages.update((imgs) => imgs.filter((img) => img.id !== id));
  }

  /**
   * Clears all uploaded images.
   */
  public clearAllImages(): void {
    this.uploadedImages.set([]);
  }

  /**
   * Triggers the AI listing generation.
   */
  public async generateListing(): Promise<void> {
    if (!this.storage.hasApiKey()) {
      this.openKeyModal();
      return;
    }

    const images = this.uploadedImages().map((img) => ({
      data: img.base64,
      mimeType: img.mimeType,
      fileName: img.name,
    }));

    const input: ListingInput = {
      images,
      titleHint: this.titleHint().trim() || undefined,
      brandHint: this.brandHint().trim() || undefined,
      notes: this.notes().trim() || undefined,
      conditionHint: (this.conditionHint() as VintedCondition) || undefined,
      language: this.language(),
    };

    const firstPreview = this.uploadedImages()[0]?.previewUrl;
    if (typeof window !== 'undefined' && window.innerWidth < 960) {
      setTimeout(() => {
        document.getElementById('output-heading')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }

    this.selectedHistoryId.set(null);
    const success = await this.generator.generate(input, firstPreview);
    if (success) {
      const listing = this.generator.currentListing();
      this.selectedHistoryId.set(this.storage.history()[0]?.id || null);
      if (listing?.price?.suggested) {
        this.customPrice.set(listing.price.suggested.toFixed(2));
      }
      if (typeof window !== 'undefined' && window.innerWidth < 960) {
        setTimeout(() => {
          document.getElementById('output-heading')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }

  /**
   * Copies specified text to system clipboard and triggers visual feedback.
   */
  public copyToClipboard(text: string, targetKey: string): void {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedTarget.set(targetKey);
      setTimeout(() => {
        if (this.copiedTarget() === targetKey) {
          this.copiedTarget.set(null);
        }
      }, 2000);
    });
  }

  /**
   * Copies the master bundle for Vinted.
   */
  public copyMasterBundle(): void {
    const bundle = this.generator.formattedListing()?.fullBundleText;
    if (bundle) {
      this.copyToClipboard(bundle, 'master');
    }
  }

  /**
   * Copies the clean single markdown table for marketplaces.
   */
  public copyMarkdownTable(): void {
    let table = this.generator.formattedListing()?.tableMarkdown;
    if (table) {
      const listing = this.generator.currentListing();
      const priceVal = this.customPrice().trim() || (listing?.price?.suggested ? listing.price.suggested.toFixed(2) : '');
      const floorVal = listing?.price?.min ? ` (Floor: €${listing.price.min.toFixed(2)})` : '';
      if (priceVal) {
        table = table.replace(/\| \*\*Price\*\* \| .* \|/, `| **Price** | €${priceVal}${floorVal} |`);
      }
      this.copyToClipboard(table, 'table');
    }
  }

  /**
   * Exports the listing as a downloadable JSON file.
   */
  public exportJson(): void {
    const listing = this.generator.currentListing();
    if (!listing) return;
    const blob = new Blob([JSON.stringify(listing, null, 2)], {
      type: 'application/json',
    });
    this.downloadBlob(blob, `vintgen_${this.sanitizeFilename(listing.title)}.json`);
  }

  /**
   * Generates live marketplace search URLs for real-time verification.
   */
  public getEbaySearchUrl(listing: ListingResult): string {
    const q = encodeURIComponent(`${listing.brand} ${listing.title}`.trim());
    return `https://www.ebay.it/sch/i.html?_nkw=${q}`;
  }

  public getVintedSearchUrl(listing: ListingResult): string {
    const q = encodeURIComponent(`${listing.brand} ${listing.title}`.trim());
    return `https://www.vinted.it/catalog?search_text=${q}`;
  }

  public getSubitoSearchUrl(listing: ListingResult): string {
    const q = encodeURIComponent(`${listing.brand} ${listing.title}`.trim());
    return `https://www.subito.it/annunci-italia/vendita/usato/?q=${q}`;
  }

  /**
   * Exports the listing as a formatted Markdown (.md) document.
   */
  public exportMarkdown(): void {
    const listing = this.generator.currentListing();
    const formatted = this.generator.formattedListing();
    if (!listing || !formatted) return;

    const md = [
      `# ${listing.title}`,
      '',
      `**Brand**: ${listing.brand} | **Size**: ${listing.size} | **Condition**: ${listing.condition}`,
      `**Suggested Price**: €${listing.price.suggested.toFixed(2)} (Min: €${listing.price.min.toFixed(2)} - Max: €${listing.price.max.toFixed(2)})`,
      '',
      '## Vinted Description',
      '```text',
      formatted.description,
      '```',
      '',
      '## Search Hashtags',
      listing.hashtags.join(' '),
      '',
      '---',
      `*Generated by VintGen on ${new Date(listing.createdAt).toLocaleDateString()}*`,
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown' });
    this.downloadBlob(blob, `vintgen_${this.sanitizeFilename(listing.title)}.md`);
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private sanitizeFilename(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  }

  // --- API Key Modal Controls ---

  public openKeyModal(): void {
    const active = this.storage.selectedProvider();
    this.modalProvider.set(active);
    if (active === 'ollama') {
      this.tempOllamaEndpoint.set(this.storage.ollamaEndpoint());
      this.tempOllamaModel.set(this.storage.ollamaModel());
      this.tempApiKey.set(this.storage.ollamaApiKey());
    } else if (active === 'claude') {
      this.tempApiKey.set(this.storage.claudeApiKey());
    } else if (active === 'openai') {
      this.tempApiKey.set(this.storage.openaiApiKey());
    } else {
      this.tempApiKey.set(this.storage.apiKey());
    }
    this.keyTestResult.set(null);
    this.showKeyModal.set(true);
  }

  public switchModalProvider(provider: 'gemini' | 'openai' | 'claude' | 'ollama'): void {
    this.modalProvider.set(provider);
    if (provider === 'ollama') {
      this.tempOllamaEndpoint.set(this.storage.ollamaEndpoint());
      this.tempOllamaModel.set(this.storage.ollamaModel());
      this.tempApiKey.set(this.storage.ollamaApiKey());
    } else if (provider === 'claude') {
      this.tempApiKey.set(this.storage.claudeApiKey());
    } else if (provider === 'openai') {
      this.tempApiKey.set(this.storage.openaiApiKey());
    } else {
      this.tempApiKey.set(this.storage.apiKey());
    }
    this.keyTestResult.set(null);
  }

  public closeKeyModal(): void {
    this.showKeyModal.set(false);
  }

  public toggleKeyVisibility(): void {
    this.keyInputType.update((curr) => (curr === 'password' ? 'text' : 'password'));
  }

  public async testCandidateKey(): Promise<void> {
    const provider = this.modalProvider();
    let result: { success: boolean; message: string };

    if (provider === 'ollama') {
      const engine = new (await import('@vintgen/core')).VintGenEngine();
      result = await engine.testProvider('ollama', {
        apiKey: this.tempApiKey().trim(),
        baseUrl: this.tempOllamaEndpoint().trim() || 'http://localhost:11434',
        model: this.tempOllamaModel().trim() || 'llama3.2-vision',
      });
    } else {
      const key = this.tempApiKey().trim();
      if (!key) {
        this.keyTestResult.set({ success: false, message: 'Please enter an API key first.' });
        return;
      }
      if (provider === 'claude' || provider === 'openai') {
        const engine = new (await import('@vintgen/core')).VintGenEngine();
        result = await engine.testProvider(provider, { apiKey: key });
      } else {
        result = await this.generator.testKey(key);
      }
    }
    this.keyTestResult.set(result);
  }

  public saveApiKeyModal(): void {
    const provider = this.modalProvider();
    if (provider === 'ollama') {
      this.storage.setOllamaEndpoint(this.tempOllamaEndpoint().trim() || 'http://localhost:11434');
      this.storage.setOllamaModel(this.tempOllamaModel().trim() || 'llama3.2-vision');
      this.storage.setOllamaKey(this.tempApiKey().trim());
    } else if (provider === 'claude') {
      this.storage.setClaudeKey(this.tempApiKey());
    } else if (provider === 'openai') {
      this.storage.setOpenAIKey(this.tempApiKey());
    } else {
      this.storage.setApiKey(this.tempApiKey());
    }
    this.storage.setProvider(provider);
    this.showKeyModal.set(false);
  }

  public removeApiKey(): void {
    this.tempApiKey.set('');
    const provider = this.modalProvider();
    if (provider === 'ollama') {
      this.storage.clearOllamaKey();
    } else if (provider === 'claude') {
      this.storage.clearClaudeKey();
    } else if (provider === 'openai') {
      this.storage.clearOpenAIKey();
    } else {
      this.storage.clearApiKey();
    }
    this.keyTestResult.set(null);
    this.showKeyModal.set(false);
  }

  // --- History & Reset Controls ---

  public clearActiveListing(): void {
    this.selectedHistoryId.set(null);
    this.generator.clearActive();
    this.customPrice.set('');
  }

  public resetAll(): void {
    this.clearAllImages();
    this.titleHint.set('');
    this.brandHint.set('');
    this.notes.set('');
    this.conditionHint.set('');
    this.clearActiveListing();
  }

  public loadHistoricalItem(item: SavedListingItem): void {
    if (this.selectedHistoryId() === item.id) {
      // Toggle off if already loaded
      this.clearActiveListing();
      return;
    }

    this.selectedHistoryId.set(item.id);
    this.generator.selectHistoricalListing(item.result);
    if (item.result?.price?.suggested) {
      this.customPrice.set(item.result.price.suggested.toFixed(2));
    }
    if (typeof window !== 'undefined' && window.innerWidth < 960) {
      setTimeout(() => {
        document.getElementById('output-heading')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }

  public clearHistory(): void {
    this.selectedHistoryId.set(null);
    this.storage.clearHistory();
  }
  // --- Guided Interactive Tour State ---
  public isTourActive = signal<boolean>(false);
  public showTourConfirmModal = signal<boolean>(false);
  public currentTourStep = signal<number>(0);
  public tourSpotlightStyle = signal<{
    top: string;
    left: string;
    width: string;
    height: string;
    borderRadius: string;
  }>({ top: '0px', left: '0px', width: '0px', height: '0px', borderRadius: '8px' });
  public tourPopoverStyle = signal<{
    top: string;
    left: string;
  }>({ top: '0px', left: '0px' });

  private tourAnimFrameId: number | null = null;

  public tourSteps: TourStep[] = [
    {
      targetSelector: '#btn-key-status',
      title: '1. AI Engine & API Keys',
      description: 'Configure your Google Gemini (100% free tier) or OpenAI ChatGPT API key. Credentials remain private and stored only in your local browser.',
      placement: 'bottom',
    },
    {
      targetSelector: '#image-dropzone',
      title: '2. Drop Item Photographs',
      description: 'Drag & drop photos of your item: front view, brand tags, size/composition labels, serial numbers, or close-ups of flaws.',
      placement: 'right',
    },
    {
      targetSelector: '#select-language',
      title: '3. Seller Notes & Target Language',
      description: 'Add optional item details, indicate condition, and select your target marketplace listing language (English, Italian, Spanish, French, German).',
      placement: 'right',
    },
    {
      targetSelector: '.panel-actions-wrapper',
      title: '4. Select AI & Generate',
      description: 'Choose between Gemini (free tier) and ChatGPT, then click Generate. The vision engine inspects details and calculates secondary market valuation in seconds.',
      placement: 'top',
    },
    {
      targetSelector: '.output-panel',
      title: '5. Pricing, Hashtags & 1-Click Copy',
      description: 'Review suggested pricing with negotiation range, 10–15 discoverability hashtags, and 1-click copy formatted descriptions or markdown tables for Vinted, eBay, or Subito.',
      placement: 'left',
    },
  ];

  public openTourConfirm(): void {
    this.showTourConfirmModal.set(true);
  }

  public cancelTourConfirm(): void {
    this.showTourConfirmModal.set(false);
  }

  public confirmAndStartTour(): void {
    this.showTourConfirmModal.set(false);
    this.currentTourStep.set(0);
    this.isTourActive.set(true);
    setTimeout(() => {
      this.updateTourPosition(false);
    }, 40);
  }

  public nextTourStep(): void {
    if (this.currentTourStep() < this.tourSteps.length - 1) {
      this.currentTourStep.update(s => s + 1);
      setTimeout(() => this.updateTourPosition(false), 40);
    } else {
      this.endTour();
    }
  }

  public prevTourStep(): void {
    if (this.currentTourStep() > 0) {
      this.currentTourStep.update(s => s - 1);
      setTimeout(() => this.updateTourPosition(false), 40);
    }
  }

  public endTour(): void {
    if (this.tourAnimFrameId) {
      cancelAnimationFrame(this.tourAnimFrameId);
      this.tourAnimFrameId = null;
    }
    this.isTourActive.set(false);
  }

  public updateTourPosition(immediate = false): void {
    if (!this.isTourActive() || typeof window === 'undefined') return;
    const step = this.tourSteps[this.currentTourStep()];
    if (!step) return;

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el) return;

    // Smooth scroll target into view
    el.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });

    const startTime = performance.now();
    const duration = immediate ? 0 : 400;

    const applyCoords = () => {
      if (!this.isTourActive()) return;
      const rect = el.getBoundingClientRect();
      const comp = window.getComputedStyle(el);
      const borderRadius = comp.borderRadius && comp.borderRadius !== '0px' ? comp.borderRadius : '8px';

      const padding = 6;
      const spotTop = Math.max(0, rect.top - padding);
      const spotLeft = Math.max(0, rect.left - padding);
      const spotWidth = rect.width + padding * 2;
      const spotHeight = rect.height + padding * 2;

      this.tourSpotlightStyle.set({
        top: `${spotTop}px`,
        left: `${spotLeft}px`,
        width: `${spotWidth}px`,
        height: `${spotHeight}px`,
        borderRadius,
      });

      const popoverWidth = Math.min(330, window.innerWidth - 32);
      const popoverHeight = 175;
      let pTop = spotTop + spotHeight + 12;
      let pLeft = spotLeft + (spotWidth / 2) - (popoverWidth / 2);

      const margin = 16;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (step.placement === 'right' && spotLeft + spotWidth + popoverWidth + margin < vw) {
        pLeft = spotLeft + spotWidth + 14;
        pTop = Math.max(margin, spotTop + (spotHeight / 2) - (popoverHeight / 2));
      } else if (step.placement === 'left' && spotLeft - popoverWidth - margin > 0) {
        pLeft = spotLeft - popoverWidth - 14;
        pTop = Math.max(margin, spotTop + (spotHeight / 2) - (popoverHeight / 2));
      } else if (step.placement === 'top' && spotTop - popoverHeight - margin > 0) {
        pTop = spotTop - popoverHeight - 14;
        pLeft = spotLeft + (spotWidth / 2) - (popoverWidth / 2);
      } else if (pTop + popoverHeight > vh - margin && spotTop - popoverHeight - margin > 0) {
        pTop = spotTop - popoverHeight - 14;
      }

      pLeft = Math.max(margin, Math.min(pLeft, vw - popoverWidth - margin));
      pTop = Math.max(margin, Math.min(pTop, vh - popoverHeight - margin));

      this.tourPopoverStyle.set({
        top: `${pTop}px`,
        left: `${pLeft}px`,
      });

      if (performance.now() - startTime < duration) {
        this.tourAnimFrameId = requestAnimationFrame(applyCoords);
      }
    };

    if (this.tourAnimFrameId) {
      cancelAnimationFrame(this.tourAnimFrameId);
    }
    applyCoords();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  public onWindowReposition(): void {
    if (this.isTourActive()) {
      this.updateTourPosition(true);
    }
  }

  @HostListener('window:keydown.escape')
  public onEscapeKey(): void {
    if (this.isMobileMenuOpen()) {
      this.closeMobileMenu();
      return;
    }
    if (this.showTourConfirmModal()) {
      this.cancelTourConfirm();
    }
    if (this.isTourActive()) {
      this.endTour();
    }
    if (this.showKeyModal()) {
      this.closeKeyModal();
    }
  }
}
