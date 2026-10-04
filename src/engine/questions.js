import encounters from '../data/encounters.p1.json';
import products from '../data/products.json';

const productById = new Map(products.map((product) => [product.id, product]));

export function questionForDay(day) {
  const encounter = encounters[(day - 1) % encounters.length];
  const product = productById.get(encounter.expect?.productId) || products[0];
  return {
    id: encounter.id,
    speaker: encounter.speaker,
    line: encounter.lines[0]?.ms || '',
    translation: encounter.lines[0]?.zh || '',
    prompt: `顧客想要${product.zh}。請用馬來語回答：`,
    productId: product.id,
    productName: product.zh,
    buyPrice: product.buyPrice,
    sellPrice: product.refPrice,
    acceptedAnswers: [product.ms, ...(product.msVariants || [])],
    vocab: encounter.vocab || [product.id],
    success: encounter.success,
    fail: encounter.fail,
  };
}
