import { MergeLab } from '@/components/merge-lab/MergeLab';
import { GameShell } from '@/components/GameShell';
import './style.css';

export const metadata = { title: 'Merge Lab — Discover a little life', description: 'Drop, merge and discover 44 curious life forms in a cozy evolution puzzle.' };
export default function MergeLabPage() { return <GameShell title="Merge Lab" description="Small beginnings. Curious possibilities."><MergeLab /></GameShell>; }
