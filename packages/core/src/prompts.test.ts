(() => {
  const { describe, it }: typeof import('node:test') = require('node:test');
  const assert: typeof import('node:assert/strict') = require('node:assert/strict');
  const { buildListingUserPrompt }: typeof import('./prompts') = require('../dist/prompts');

  describe('buildListingUserPrompt', () => {
    it('enforces English hashtags even when target language is Italian', () => {
      const prompt = buildListingUserPrompt({
        language: 'it',
        titleHint: 'Giacca vintage',
      });

      assert.match(prompt, /Italian \(Italiano\)/i);
      assert.match(prompt, /hashtags.*strictly in English/i);
      assert.match(prompt, /EXCEPT 'hashtags' which MUST ALWAYS be in English/i);
    });

    it('includes optional seller hints and rawJsonNotice when provided', () => {
      const prompt = buildListingUserPrompt(
        {
          language: 'en',
          titleHint: 'Denim Jacket',
          brandHint: 'Levis',
          conditionHint: 'very_good',
          notes: 'Minor fade on sleeves',
        },
        { rawJsonNotice: 'Output raw JSON only.' }
      );

      assert.match(prompt, /Seller Tentative Title: "Denim Jacket"/);
      assert.match(prompt, /Seller Brand Hint: "Levis"/);
      assert.match(prompt, /Expected Condition: "very_good"/);
      assert.match(prompt, /Seller Additional Notes \/ Known Details: "Minor fade on sleeves"/);
      assert.match(prompt, /Output raw JSON only\./);
    });
  });
})();
