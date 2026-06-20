// Expand abbreviations and symbols so TTS reads naturally
export function cleanForSpeech(text, units = 'metric') {
  return text
    // Remove markdown
    .replace(/[*_`#•→]/g, '')
    .replace(/\[\[GO:[^\]]*\]\]/gi, '')

    // Measurements — must come before generic word cleanup
    // Fluid oz
    .replace(/(\d+)\s*fl\.?\s*oz/gi, (_, n) => units === 'metric'
      ? flOzToMetric(+n) : `${n} fluid ounces`)
    // oz (weight/volume)
    .replace(/(\d+(?:\.\d+)?)\s*oz\b/gi, (_, n) => units === 'metric'
      ? flOzToMetric(+n) : `${n} ounces`)
    // ml / mL
    .replace(/(\d+(?:\.\d+)?)\s*ml\b/gi, '$1 millilitres')
    .replace(/(\d+(?:\.\d+)?)\s*mL\b/g, '$1 millilitres')
    // L / litre
    .replace(/(\d+(?:\.\d+)?)\s*L\b/g, (_, n) => +n === 1 ? '1 litre' : `${n} litres`)
    // mg
    .replace(/(\d+(?:\.\d+)?)\s*mg\b/gi, '$1 milligrams')
    // mcg / μg
    .replace(/(\d+(?:\.\d+)?)\s*mcg\b/gi, '$1 micrograms')
    .replace(/(\d+(?:\.\d+)?)\s*μg\b/g, '$1 micrograms')
    // g (grams) — only when preceded by a number and followed by space/punctuation
    .replace(/(\d+(?:\.\d+)?)\s*g\b(?![\w-])/g, '$1 grams')
    // cups → ml if metric
    .replace(/(\d+(?:\.\d+)?)\s*cups?\b/gi, (_, n) => units === 'metric'
      ? cupsToMetric(+n) : `${n} ${+n === 1 ? 'cup' : 'cups'}`)
    // tbsp / tablespoon
    .replace(/(\d+(?:\.\d+)?)\s*tbsp\b/gi, (_, n) => `${n} ${+n === 1 ? 'tablespoon' : 'tablespoons'}`)
    .replace(/(\d+(?:\.\d+)?)\s*tbs\b/gi, (_, n) => `${n} ${+n === 1 ? 'tablespoon' : 'tablespoons'}`)
    // tsp / teaspoon
    .replace(/(\d+(?:\.\d+)?)\s*tsp\b/gi, (_, n) => `${n} ${+n === 1 ? 'teaspoon' : 'teaspoons'}`)
    // lbs / lb
    .replace(/(\d+(?:\.\d+)?)\s*lbs?\b/gi, (_, n) => units === 'metric'
      ? lbsToMetric(+n) : `${n} ${+n === 1 ? 'pound' : 'pounds'}`)

    // Common abbreviations
    .replace(/\bDr\./g, 'Doctor')
    .replace(/\bAW\b/g, 'Anthony William')
    .replace(/\bMM\b/g, 'Medical Medium')
    .replace(/\bHMDS\b/g, 'Heavy Metal Detox Smoothie')
    .replace(/\bEBV\b/g, 'Epstein-Barr virus')
    .replace(/\bHRV\b/g, 'H R V')

    // Numbers with ranges (e.g. "16–32" → "16 to 32")
    .replace(/(\d+)[–—-](\d+)/g, '$1 to $2')

    // Clean up whitespace
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function flOzToMetric(oz) {
  const ml = Math.round(oz * 29.574)
  if (ml >= 950 && ml <= 1000) return '1 litre'
  if (ml === 480 || ml === 473) return '500 millilitres'
  if (ml >= 200 && ml % 100 === 0) return `${ml} millilitres`
  // Round to nearest 50ml for natural speech
  const rounded = Math.round(ml / 50) * 50
  if (rounded >= 1000) return `${(rounded / 1000).toFixed(1).replace('.0', '')} litres`
  return `${rounded} millilitres`
}

function cupsToMetric(cups) {
  const ml = Math.round(cups * 240)
  if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.0', '')} litres`
  return `${ml} millilitres`
}

function lbsToMetric(lbs) {
  const kg = (lbs * 0.453592).toFixed(1)
  return +kg < 1 ? `${Math.round(lbs * 453.592)} grams` : `${kg} kilograms`
}
