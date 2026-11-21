(() => {
  const { describe, it }: typeof import('node:test') = require('node:test');
  const assert: typeof import('node:assert/strict') = require('node:assert/strict');
  const { sanitizeListingResult }: typeof import('./sanitize') = require('./sanitize.ts');

  describe('sanitizeListingResult', () => {
    it('validates condition against allowed ItemCondition values and falls back to very_good', () => {
      const valid = sanitizeListingResult({ condition: 'new_with_tags' });
      assert.equal(valid.condition, 'new_with_tags');

      const normalizedCase = sanitizeListingResult({ condition: 'SATISFACTORY' });
      assert.equal(normalizedCase.condition, 'satisfactory');

      const invalid = sanitizeListingResult({ condition: 'mint_condition' });
      assert.equal(invalid.condition, 'very_good');
    });

    it('normalizes # prefixes on hashtags and trims empty entries', () => {
      const result = sanitizeListingResult({
        hashtags: ['vintage', '#streetwear', '  denim  ', ''],
      });

      assert.deepEqual(result.hashtags, ['#vintage', '#streetwear', '#denim']);
    });

    it('applies defaults cleanly when fields are missing or invalid', () => {
      const result = sanitizeListingResult(
        {},
        {
          title: 'Secondhand Item',
          description: 'No description provided.',
          category: 'Clothing',
          brand: 'Unbranded',
          size: 'Standard',
          color: 'Multi',
          material: 'Not specified',
          priceSuggested: 25,
          priceMin: 20,
          priceMax: 35,
          priceReasoning: 'Estimated secondhand marketplace valuation',
          defaultHashtags: ['#secondhand', '#fashion'],
          fitNotes: 'Standard fit',
          confidence: 0.85,
        }
      );

      assert.equal(result.title, 'Secondhand Item');
      assert.equal(result.description, 'No description provided.');
      assert.equal(result.category, 'Clothing');
      assert.equal(result.brand, 'Unbranded');
      assert.equal(result.size, 'Standard');
      assert.equal(result.condition, 'very_good');
      assert.equal(result.color, 'Multi');
      assert.equal(result.material, 'Not specified');
      assert.deepEqual(result.price, {
        suggested: 25,
        min: 20,
        max: 35,
        currency: 'EUR',
        reasoning: 'Estimated secondhand marketplace valuation',
      });
      assert.deepEqual(result.hashtags, ['#secondhand', '#fashion']);
      assert.deepEqual(result.flaws, []);
      assert.equal(result.fitNotes, 'Standard fit');
      assert.equal(result.confidence, 0.85);
      assert.ok(Date.parse(result.createdAt) > 0);
    });

    it('sanitizes nested price object and flaws array', () => {
      const result = sanitizeListingResult({
        title: '  Vintage Jacket  ',
        price: {
          suggested: '45',
          min: 35,
          max: 60,
          currency: 'USD',
          reasoning: 'Good condition',
        },
        flaws: ['  small scuff  ', '', 123],
        confidence: 0.92,
      });

      assert.equal(result.title, 'Vintage Jacket');
      assert.deepEqual(result.price, {
        suggested: 45,
        min: 35,
        max: 60,
        currency: 'USD',
        reasoning: 'Good condition',
      });
      assert.deepEqual(result.flaws, ['small scuff', '123']);
      assert.equal(result.confidence, 0.92);
    });
  });
})();
