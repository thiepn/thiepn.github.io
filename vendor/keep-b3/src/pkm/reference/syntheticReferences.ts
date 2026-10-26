import { Reference, ReferenceType } from './referenceTypes';
import { generateCitationKey } from './citationKeys';

const SAMPLE_AUTHORS = [
  { family: 'Vaswani', given: 'Ashish' },
  { family: 'Bengio', given: 'Yoshua' },
  { family: 'LeCun', given: 'Yann' },
  { family: 'Hinton', given: 'Geoffrey' },
  { family: 'Sutskever', given: 'Ilya' },
  { family: 'Goodfellow', given: 'Ian' },
  { family: 'Silver', given: 'David' },
  { family: 'Hassabis', given: 'Demis' },
  { family: 'Devlin', given: 'Jacob' },
  { family: 'Brown', given: 'Tom' },
  { family: 'Radford', given: 'Alec' },
  { family: 'Kaplan', given: 'Jared' },
  { family: 'Touvron', given: 'Hugo' },
  { family: 'Chowdhery', given: 'Aakanksha' },
  { family: 'OpenAI', literal: 'OpenAI' },
  { family: 'Google DeepMind', literal: 'Google DeepMind' },
];

const SAMPLE_TOPICS = [
  'Attention Mechanisms',
  'Transformers',
  'Deep Residual Learning',
  'Generative Adversarial Networks',
  'Reinforcement Learning',
  'Diffusion Models',
  'Mixture of Experts',
  'Retrieval Augmented Generation',
  'Constitutional AI',
  'Scaling Laws',
  'Self-Supervised Learning',
  'Neurosymbolic Reasoning',
];

const SAMPLE_JOURNALS = [
  'Advances in Neural Information Processing Systems (NeurIPS)',
  'International Conference on Machine Learning (ICML)',
  'International Conference on Learning Representations (ICLR)',
  'Nature',
  'Science',
  'Journal of Machine Learning Research (JMLR)',
  'IEEE Transactions on Pattern Analysis and Machine Intelligence',
  'arXiv preprint',
];

/**
 * Generates synthetic reference records for benchmark and testing
 */
export function generateSyntheticReferences(count: number): Reference[] {
  const references: Reference[] = [];
  const existingKeys = new Set<string>();
  const now = new Date().toISOString();

  const types: ReferenceType[] = ['article', 'conference', 'preprint', 'book', 'chapter', 'report'];

  for (let i = 1; i <= count; i++) {
    const author1 = SAMPLE_AUTHORS[(i * 3) % SAMPLE_AUTHORS.length];
    const author2 = SAMPLE_AUTHORS[(i * 7 + 1) % SAMPLE_AUTHORS.length];
    const authors = [author1, author2];

    const topic1 = SAMPLE_TOPICS[i % SAMPLE_TOPICS.length];
    const topic2 = SAMPLE_TOPICS[(i + 3) % SAMPLE_TOPICS.length];
    const title = `${topic1} and ${topic2} for Large Scale Knowledge Reasoning`;

    const year = 2015 + (i % 12);
    const type = types[i % types.length];
    const journal = SAMPLE_JOURNALS[i % SAMPLE_JOURNALS.length];
    const doi = `10.1000/synth.${year}.${i.toString().padStart(5, '0')}`;
    const arxivId = `23${(i % 12 + 1).toString().padStart(2, '0')}.${i.toString().padStart(5, '0')}`;

    const citationKey = generateCitationKey({ title, authors, year }, existingKeys);
    existingKeys.add(citationKey);

    references.push({
      id: `ref-synth-${i}-${Date.now().toString(36)}`,
      type,
      title,
      authors,
      year,
      journal,
      doi,
      arxivId: type === 'preprint' ? arxivId : undefined,
      citationKey,
      abstract: `This synthetic study investigates ${topic1} integrated with ${topic2} to optimize precision, recall, and computational efficiency across multi-modal benchmarks.`,
      tags: ['synthetic', topic1.toLowerCase().replace(/\s+/g, '-'), 'ai'],
      createdAt: now,
      updatedAt: now,
    });
  }

  return references;
}
