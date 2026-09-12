import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
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

  // Clipboard Feedback
  public copiedTarget = signal<string | null>(null);

  // Custom User Set Price
  public customPrice = signal<string>('');
  public selectedHistoryId = signal<string | null>(null);

  // Theme Management (Light / Dark)
  public theme = signal<'dark' | 'light'>('dark');

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
    this.tempApiKey.set(this.storage.apiKey());
    this.keyTestResult.set(null);
    this.showKeyModal.set(true);
  }

  public closeKeyModal(): void {
    this.showKeyModal.set(false);
  }

  public toggleKeyVisibility(): void {
    this.keyInputType.update((curr) => (curr === 'password' ? 'text' : 'password'));
  }

  public async testCandidateKey(): Promise<void> {
    const key = this.tempApiKey().trim();
    if (!key) {
      this.keyTestResult.set({ success: false, message: 'Please enter an API key first.' });
      return;
    }
    const result = await this.generator.testKey(key);
    this.keyTestResult.set(result);
  }

  public saveApiKeyModal(): void {
    this.storage.setApiKey(this.tempApiKey());
    this.showKeyModal.set(false);
  }

  public removeApiKey(): void {
    this.tempApiKey.set('');
    this.storage.clearApiKey();
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
}
