import type { ArchiveFile, Drill, DrillSample } from './types';

export function proposeSamples(files: ArchiveFile[], pastDrills: Drill[], count: number, random = Math.random): DrillSample[] {
  const lastSeen = new Map<string, number>();
  for (const drill of pastDrills) {
    const time = new Date(drill.completedAt ?? drill.createdAt).getTime();
    for (const sample of drill.samples) lastSeen.set(sample.fileId, Math.max(lastSeen.get(sample.fileId) ?? 0, time));
  }
  const now = Date.now();
  return files
    .map((file) => {
      const ageDays = lastSeen.has(file.id) ? (now - lastSeen.get(file.id)!) / 86_400_000 : 3650;
      const priority = Math.log2(Math.max(file.size, 1)) + Math.min(ageDays, 365) / 20 + random() * 8;
      return { file, priority };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.min(count, files.length))
    .map(({ file }) => ({
      fileId: file.id,
      volumeId: file.volumeId,
      path: file.path,
      name: file.name,
      size: file.size,
      sha256: file.sha256,
      result: 'pending'
    }));
}

export function drillSummary(drill: Drill): { passed: number; attention: number; pending: number } {
  return drill.samples.reduce((summary, sample) => {
    if (sample.result === 'pass') summary.passed += 1;
    else if (sample.result === 'pending') summary.pending += 1;
    else summary.attention += 1;
    return summary;
  }, { passed: 0, attention: 0, pending: 0 });
}
