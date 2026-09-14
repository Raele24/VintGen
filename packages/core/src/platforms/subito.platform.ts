/**
 * Subito / Classifieds Platform Adapter
 * 
 * Formats listings for classifieds platforms with pickup and shipping options.
 */

import { FormattedListing, ListingResult, ItemCondition } from '../types';
import { PlatformAdapter } from './platform.interface';

export class SubitoPlatform implements PlatformAdapter {
  public readonly id = 'subito';
  public readonly name = 'Subito';
  public readonly shortLabel = 'Subito';
  public readonly description = 'Clear classifieds format with condition summary, handover, and shipping terms.';

  public static readonly CONDITION_MAP: Record<ItemCondition, string> = {
    new_with_tags: 'Nuovo con etichetta / sigillato',
    new_without_tags: 'Nuovo senza etichetta / mai usato',
    very_good: 'Ottime condizioni / pari al nuovo',
    good: 'Buone condizioni / normali segni di utilizzo',
    satisfactory: 'Condizioni discrete',
  };

  public format(result: ListingResult): FormattedListing {
    return SubitoPlatform.format(result);
  }

  public static format(result: ListingResult): FormattedListing {
    const conditionText = SubitoPlatform.CONDITION_MAP[result.condition] || result.condition;

    let body = (result.description || '').trim();
    body = body.replace(/(?:\r?\n\s*)*\r?\n\s*#(?:[a-zA-Z0-9_\-\s#]+)$/g, '').trim();

    const sections: string[] = [body];
    sections.push('');

    sections.push('DETTAGLI ARTICOLO:');
    sections.push(`- Marca / Brand: ${result.brand}`);
    if (result.size) sections.push(`- Taglia / Versione: ${result.size}`);
    if (result.color) sections.push(`- Colore: ${result.color}`);
    if (result.material) sections.push(`- Materiale: ${result.material}`);
    sections.push(`- Stato / Condizione: ${conditionText}`);
    if (result.fitNotes) sections.push(`- Note su vestibilita: ${result.fitNotes}`);

    if (result.flaws && result.flaws.length > 0) {
      sections.push('');
      sections.push('NOTE SULLO STATO:');
      for (const flaw of result.flaws) {
        sections.push('- ' + flaw.trim().replace(/^[-*]\s*/, ''));
      }
    }

    sections.push('');
    sections.push('CONSEGNA E SPEDIZIONE:');
    sections.push('- Disponibile per ritiro a mano in zona o spedizione tracciata.');
    sections.push('- Per qualsiasi informazione o foto aggiuntiva, contattatemi.');

    const description = sections.join('\n');
    const priceString = result.price.suggested.toFixed(2);

    const fullBundle = [
      `=== ANNUNCIO SUBITO ===`,
      `TITOLO: ${result.title}`,
      `PREZZO: EUR ${priceString}`,
      `STATO: ${conditionText}`,
      '',
      `=== DESCRIZIONE ===`,
      description,
    ].join('\n');

    return {
      title: result.title,
      description,
      tagsText: '',
      priceString,
      fullBundleText: fullBundle,
      tableMarkdown: '',
    };
  }
}
