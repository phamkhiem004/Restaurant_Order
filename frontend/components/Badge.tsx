import type { ReactNode } from 'react';
import type { Tone } from '../lib/labels';

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
