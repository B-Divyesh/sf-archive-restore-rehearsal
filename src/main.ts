import './styles.css';
import { deleteVolume, exportBundle, getDrills, getFiles, getVolumes, importBundle, putDrill, putVolume } from './db';
import { countNoun, formatBytes, formatDate, escapeHtml } from './format';
import { hashFile, shortHash } from './hash';
import { captureLicenseFromUrl, checkoutUrl, initialLicenseState, removeLicense, saveLicense, verifyLicense } from './license';
import { drillSummary, proposeSamples } from './sample';
import { getFileFromHandle, scanDirectory, scanFileList, type ScanProgress } from './scanner';
import type { ArchiveVolume, Drill, DrillSample, ExportBundle, LicenseState, SampleResult } from './types';

type View = 'map' | 'drill' | 'history' | 'settings';

class ArchiveApp {
  private root = document.querySelector<HTMLElement>('#app')!;
  private volumes: ArchiveVolume[] = [];
  private drills: Drill[] = [];
  private view: View = 'map';
  private currentDrill?: Drill;
  private license: LicenseState = initialLicenseState();
  private loading = true;
  private error?: string;
  private toast?: string;
  private scanProgress?: ScanProgress;
  private modal?: 'add' | 'preview';
  private previewHtml = '';
  private pendingMetadata?: { label: string; location: string; notes: string };
  private objectUrl?: string;

  async init(): Promise<void> {
    captureLicenseFromUrl();
    this.license = initialLicenseState();
    this.bindEvents();
    this.registerServiceWorker();
    try {
      [this.volumes, this.drills] = await Promise.all([getVolumes(), getDrills()]);
      this.drills.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      this.error = `Your local archive map could not be opened. ${error instanceof Error ? error.message : ''}`;
    }
    this.loading = false;
    this.render();
    if (localStorage.getItem('sb_license:archive-restore-rehearsal')) {
      this.license = await verifyLicense();
      this.render();
    }
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('submit', (event) => this.handleSubmit(event));
    this.root.addEventListener('change', (event) => this.handleChange(event));
    window.addEventListener('online', () => this.setToast('Back online. Your local work stayed safe.'));
    window.addEventListener('offline', () => this.setToast('Offline. Scans, drills, and exports still work.'));
  }

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            this.setToast('An update is ready. Reload when convenient.');
          }
        });
      });
    } catch {
      // The app remains fully usable without installation support.
    }
  }

  private setToast(message: string): void {
    this.toast = message;
    this.render();
    window.setTimeout(() => {
      if (this.toast === message) {
        this.toast = undefined;
        this.render();
      }
    }, 5000);
  }

  private render(): void {
    if (this.loading) return;
    const content = this.error ? this.renderFatal() : this.renderView();
    this.root.innerHTML = `
      <header class="masthead">
        <a class="wordmark" href="#map" data-view="map" aria-label="Archive Restore Rehearsal home">
          <span class="wordmark-mark" aria-hidden="true">A/R</span><span>Archive Restore<br>Rehearsal</span>
        </a>
        <span class="local-badge"><span aria-hidden="true">●</span> ${navigator.onLine ? 'Local only' : 'Offline · local'}</span>
      </header>
      <div class="app-frame">
        <nav class="section-nav" aria-label="Workspace">
          ${this.navItem('map', '⌂', 'Archive map')}
          ${this.navItem('drill', '↻', 'Rehearse')}
          ${this.navItem('history', '✓', 'Evidence')}
          ${this.navItem('settings', '⚙', 'Data & unlock')}
        </nav>
        <main id="main" tabindex="-1">${content}</main>
      </div>
      <footer><p>Files and paths stay in this browser. Source media is read, never changed.</p><p><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · Generated artwork disclosed in the <a href="#settings" data-view="settings">about section</a>.</p></footer>
      ${this.toast ? `<div class="toast" role="status">${escapeHtml(this.toast)}</div>` : ''}
      ${this.renderDialog()}
      <input class="visually-hidden" id="folder-input" type="file" webkitdirectory multiple aria-label="Choose archive folder">
    `;
    if (this.modal) window.setTimeout(() => {
      const dialog = this.root.querySelector<HTMLDialogElement>('dialog');
      if (dialog && !dialog.open) dialog.showModal();
      if (this.modal === 'add') dialog?.querySelector<HTMLInputElement>('#drive-label')?.focus();
    }, 0);
  }

  private navItem(view: View, icon: string, label: string): string {
    return `<a href="#${view}" data-view="${view}" ${this.view === view ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span><span>${label}</span></a>`;
  }

  private renderFatal(): string {
    return `<section class="fatal"><p class="eyebrow">Local database error</p><h1>Your archive map is still on this device.</h1><p>${escapeHtml(this.error!)}</p><p>Try reloading. If the problem continues, check that private browsing is off and local storage is allowed.</p><button data-action="reload">Reload app</button></section>`;
  }

  private renderView(): string {
    if (this.view === 'drill') return this.renderDrill();
    if (this.view === 'history') return this.renderHistory();
    if (this.view === 'settings') return this.renderSettings();
    return this.renderMap();
  }

  private renderMap(): string {
    const totalFiles = this.volumes.reduce((sum, volume) => sum + volume.fileCount, 0);
    const totalBytes = this.volumes.reduce((sum, volume) => sum + volume.totalBytes, 0);
    return `
      <section class="page-head">
        <div><p class="eyebrow">Archive map / ${this.volumes.length || 'no'} locations</p><h1>Know where it lives.<br><span>Prove it opens.</span></h1><p class="lede">Catalogue folders on removable disks, then rehearse a rotating sample. Nothing is copied or uploaded.</p></div>
        ${this.volumes.length ? `<button class="primary" data-action="open-add">+ Add archive location</button>` : ''}
      </section>
      <section class="summary-strip" aria-label="Archive totals">
        <div><strong>${this.volumes.length}</strong><span>labelled locations</span></div>
        <div><strong>${totalFiles.toLocaleString()}</strong><span>files catalogued</span></div>
        <div><strong>${formatBytes(totalBytes)}</strong><span>mapped, not copied</span></div>
        <div><strong>${this.drills.filter((drill) => drill.completedAt).length}</strong><span>completed rehearsals</span></div>
      </section>
      ${this.volumes.length ? this.renderVolumes() : this.renderEmptyMap()}
    `;
  }

  private renderEmptyMap(): string {
    return `<section class="welcome-sheet">
      <div class="welcome-copy"><span class="stamp">Start here · about 5 minutes</span><h2>Turn the labels on your drives into a recovery plan.</h2><ol><li><b>Label</b> the physical drive and where you keep it.</li><li><b>Choose</b> its mounted folder. We read and hash each file.</li><li><b>Rehearse</b> a random sample and record what really opens.</li></ol><button class="primary big" data-action="open-add">Choose your first archive folder</button><p class="fineprint">Read-only by design. Folder access is requested only when you choose it.</p></div>
      <figure><img src="/assets/recovery-bench.webp" width="768" height="512" fetchpriority="high" alt="Risograph collage of three labelled archive drives, folders, and a magnifying glass checking a file"><figcaption>Inventory is a map. A rehearsal is evidence.</figcaption></figure>
    </section>`;
  }

  private renderVolumes(): string {
    return `<section aria-labelledby="locations-title" class="locations"><div class="section-title"><div><p class="eyebrow">Your physical archive</p><h2 id="locations-title">Location cards</h2></div><p>Drive identity is fallible. Match the physical label, folder name, capacity, and fingerprint before trusting it.</p></div><div class="volume-grid">${this.volumes.map((volume, index) => this.renderVolume(volume, index)).join('')}</div></section>`;
  }

  private renderVolume(volume: ArchiveVolume, index: number): string {
    const status = volume.scanState === 'error' ? ['attention', 'Needs attention'] : volume.fileCount === 0 ? ['unscanned', 'Empty or unscanned'] : ['verified', 'Catalogued'];
    return `<article class="volume-card">
      <div class="volume-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
      <div class="volume-body"><div class="volume-top"><div><span class="status ${status[0]}">${status[1]}</span><h3>${escapeHtml(volume.label)}</h3><p>${escapeHtml(volume.location || 'Location not recorded')}</p></div><div class="drive-sketch" aria-hidden="true"><span></span></div></div>
      <dl><div><dt>Mounted name</dt><dd>${escapeHtml(volume.rootName || '—')}</dd></div><div><dt>Contents</dt><dd>${countNoun(volume.fileCount, 'file')} · ${formatBytes(volume.totalBytes)}</dd></div><div><dt>Last scan</dt><dd>${formatDate(volume.lastScannedAt)}</dd></div><div><dt>Fingerprint</dt><dd class="hash">${volume.fingerprint ? shortHash(volume.fingerprint) : 'Not created'}</dd></div></dl>
      ${volume.notes ? `<p class="note">Note: ${escapeHtml(volume.notes)}</p>` : ''}${volume.scanError ? `<p class="inline-error" role="alert">${escapeHtml(volume.scanError)} Choose the folder again to retry.</p>` : ''}
      ${volume.scanState === 'scanning' && this.scanProgress ? `<div class="scan-progress" role="status"><b>Hashing file ${this.scanProgress.count.toLocaleString()}</b><span>${formatBytes(this.scanProgress.bytes)} read</span><small>${escapeHtml(this.scanProgress.currentPath)}</small></div>` : ''}
      <div class="card-actions"><button data-action="rescan" data-id="${volume.id}">${volume.fileCount ? 'Scan again' : 'Choose folder'}</button><button class="quiet danger-text" data-action="remove-volume" data-id="${volume.id}">Remove map</button></div></div>
    </article>`;
  }

  private renderDrill(): string {
    if (!this.currentDrill) {
      const canStart = this.volumes.some((volume) => volume.fileCount > 0);
      return `<section class="page-head compact"><div><p class="eyebrow">Restore rehearsal</p><h1>Test a few files.<br><span>Learn before loss.</span></h1><p class="lede">The sample favors files not checked recently and spans your mapped archive.</p></div></section>
        <section class="drill-start"><div class="drill-mark" aria-hidden="true">↻</div><div><h2>Ready for a ${this.license.unlocked ? 'custom' : 'three-file'} spot check?</h2><p>Reconnect each named drive, open the proposed file, and record whether its hash and contents still match.</p>
        ${this.license.unlocked ? `<label for="sample-count">Sample size</label><select id="sample-count"><option>1</option><option selected>3</option><option>5</option><option>10</option></select>` : `<p class="lock-note">Free plan: 3 files per drill. <button class="link-button" data-view="settings">Unlock more sample sizes</button>.</p>`}
        <button class="primary big" data-action="start-drill" ${canStart ? '' : 'disabled'}>Start restore rehearsal</button>${canStart ? '' : '<p class="inline-error">Catalogue at least one non-empty archive folder first.</p>'}</div></section>`;
    }
    const pendingIndex = this.currentDrill.samples.findIndex((sample) => sample.result === 'pending');
    const index = pendingIndex === -1 ? this.currentDrill.samples.length - 1 : pendingIndex;
    const sample = this.currentDrill.samples[index];
    const volume = this.volumes.find((item) => item.id === sample.volumeId);
    const summary = drillSummary(this.currentDrill);
    return `<section class="page-head compact"><div><p class="eyebrow">Live rehearsal / ${index + 1} of ${this.currentDrill.samples.length}</p><h1>Reconnect. Open.<br><span>Record the truth.</span></h1></div><button class="quiet" data-action="end-drill">Save & leave</button></section>
      <div class="progress-rule" aria-label="${summary.passed + summary.attention} of ${this.currentDrill.samples.length} checked"><span style="width:${((summary.passed + summary.attention) / this.currentDrill.samples.length) * 100}%"></span></div>
      <section class="sample-sheet"><div class="sample-meta"><span class="stamp">Sample ${index + 1}</span><span>${formatBytes(sample.size)}</span></div><p class="eyebrow">Find this on</p><h2>${escapeHtml(volume?.label || 'Unknown archive')}</h2><p class="location-line">${escapeHtml(volume?.location || 'Physical location not recorded')}</p><div class="path-block"><span>Path</span><strong>${escapeHtml(sample.path)}</strong><button data-action="copy-path" data-path="${escapeHtml(sample.path)}">Copy</button></div><dl class="sample-details"><div><dt>Recorded SHA-256</dt><dd>${shortHash(sample.sha256)}</dd></div><div><dt>Recorded size</dt><dd>${formatBytes(sample.size)}</dd></div></dl>
      ${sample.result === 'pending' ? `<button class="primary big" data-action="open-sample" data-index="${index}">Open and verify file</button><div class="result-actions"><button data-action="mark-result" data-index="${index}" data-result="missing">File is missing</button><button data-action="mark-result" data-index="${index}" data-result="skipped">Skip this sample</button></div>` : `<div class="recorded-result ${sample.result}"><b>${sample.result === 'pass' ? '✓ Opened and matched' : '△ Needs attention'}</b><span>${escapeHtml(sample.note || '')}</span></div>${pendingIndex === -1 ? `<button class="primary big" data-action="complete-drill">Complete rehearsal</button>` : `<button data-action="next-pending">Next unchecked file</button>`}`}
      </section><section class="sample-list" aria-labelledby="sample-list-title"><h2 id="sample-list-title">This sample</h2><ol>${this.currentDrill.samples.map((item) => `<li class="${item.result}"><span aria-hidden="true">${item.result === 'pass' ? '✓' : item.result === 'pending' ? '○' : '△'}</span><span>${escapeHtml(item.name)}<small>${escapeHtml(this.volumes.find((volume) => volume.id === item.volumeId)?.label || '')}</small></span><b>${item.result}</b></li>`).join('')}</ol></section>`;
  }

  private renderHistory(): string {
    const completed = this.drills.filter((drill) => drill.completedAt);
    return `<section class="page-head compact"><div><p class="eyebrow">Recovery evidence</p><h1>Keep proof<br><span>beside the drives.</span></h1><p class="lede">Print this recovery card after each rehearsal, or save it as PDF from the print dialog.</p></div><button class="primary" data-action="print">Print recovery card</button></section>
      <section class="recovery-card" aria-labelledby="card-title"><div class="card-head"><div><p class="eyebrow">Archive restore card</p><h2 id="card-title">${countNoun(this.volumes.length, 'location')} · ${countNoun(this.volumes.reduce((sum, volume) => sum + volume.fileCount, 0), 'file')}</h2></div><div class="stamp">Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}</div></div>
      <table><thead><tr><th>Physical label</th><th>Where kept</th><th>Files / size</th><th>Last scan</th></tr></thead><tbody>${this.volumes.map((volume) => `<tr><td><b>${escapeHtml(volume.label)}</b><small>${escapeHtml(volume.rootName)}</small></td><td>${escapeHtml(volume.location || '—')}</td><td>${volume.fileCount.toLocaleString()} / ${formatBytes(volume.totalBytes)}</td><td>${formatDate(volume.lastScannedAt)}</td></tr>`).join('') || '<tr><td colspan="4">No archive locations mapped yet.</td></tr>'}</tbody></table><p class="identity-warning"><b>Before restoring:</b> match the physical label, mounted folder name, approximate size, and fingerprint. A removable drive name alone is not proof of identity.</p></section>
      <section class="history-list"><div class="section-title"><div><p class="eyebrow">Drill log</p><h2>Past rehearsals</h2></div></div>${completed.length ? completed.map((drill) => { const summary = drillSummary(drill); return `<article><div class="date-block"><b>${new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(new Date(drill.completedAt!))}</b><span>${new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(drill.completedAt!))}</span></div><div><h3>${summary.attention ? `${countNoun(summary.attention, 'item')} ${summary.attention === 1 ? 'needs' : 'need'} attention` : 'All sampled files opened'}</h3><p>${summary.passed} passed · ${drill.samples.length} sampled · ${formatDate(drill.completedAt)}</p></div><span class="status ${summary.attention ? 'attention' : 'verified'}">${summary.attention ? 'Review' : 'Passed'}</span></article>`; }).join('') : '<div class="empty-inline"><p>No completed rehearsals yet.</p><button data-view="drill">Start your first spot check</button></div>'}</section>`;
  }

  private renderSettings(): string {
    return `<section class="page-head compact"><div><p class="eyebrow">Data & ownership</p><h1>Your map.<br><span>Your evidence.</span></h1><p class="lede">Everything is stored in this browser. Export a portable copy before clearing site data or moving devices.</p></div></section>
      <div class="settings-grid"><section><p class="eyebrow">Portable backup</p><h2>Export or restore your archive map</h2><p>The JSON export contains labels, paths, hashes, and drill history. Treat it as sensitive. Folder permissions are never exported.</p><div class="button-row"><button class="primary" data-action="export-json">Export archive data</button><label class="button-like" for="import-file">Import archive data</label><input class="visually-hidden" type="file" id="import-file" accept="application/json"></div><button class="quiet danger-text" data-action="clear-data">Erase local map…</button></section>
      <section class="unlock-sheet"><span class="stamp">One-time · $29</span><h2>Archive keeper unlock</h2><p>Keep the full free workflow forever. Unlock unlimited archive locations and 1, 3, 5, or 10-file rehearsal sizes on this device.</p>${this.license.unlocked ? `<div class="license-active"><b>✓ Unlock active</b><span>${escapeHtml(this.license.notice || 'Verified for this device.')}</span></div><button class="quiet" data-action="remove-license">Remove license from device</button>` : `<a class="primary button-link" href="${checkoutUrl}">Buy the one-time unlock</a><form id="license-form"><label for="license-token">Already bought it? Paste your license</label><div class="inline-form"><input id="license-token" name="license" required autocomplete="off" spellcheck="false"><button type="submit">Verify license</button></div></form>${this.license.notice ? `<p class="inline-error">${escapeHtml(this.license.notice)}</p>` : ''}`}<p class="fineprint">Secure checkout by Sociobot/Dodo, the merchant of record. Refunds are handled there and revoke the license. See <a href="/terms/">terms</a> and <a href="/privacy/">privacy</a>.</p></section>
      <section><p class="eyebrow">About the object</p><h2>Built to leave the network</h2><p>This installable app has no analytics, ads, accounts, or cloud sync. Generated hero artwork is original to this product, created with the factory image model on 28 August 2026. Source and prompt provenance ship with the project.</p><p><b>Browser support:</b> Chromium browsers can retain read-only folder handles. Firefox and Safari can catalogue a selected folder but may ask you to choose it again for a rehearsal.</p></section></div>`;
  }

  private renderDialog(): string {
    if (this.modal === 'add') return `<dialog aria-labelledby="add-title"><form id="add-form"><p class="eyebrow">Physical archive label</p><h2 id="add-title">Map an archive location</h2><p>Use the label you can see on the drive. After this, your browser will ask which mounted folder to read.</p><label for="drive-label">Label on drive <span aria-hidden="true">*</span></label><input id="drive-label" name="label" required autofocus maxlength="80" placeholder="e.g. Blue WD · Family photos"><label for="drive-location">Where do you keep it?</label><input id="drive-location" name="location" maxlength="120" placeholder="e.g. Hall cupboard · red case"><label for="drive-notes">Recovery note</label><textarea id="drive-notes" name="notes" maxlength="240" placeholder="Cable type, encryption reminder, or who has the key"></textarea><div class="safety-note"><b>Read-only promise</b><span>We request read access and calculate hashes in this browser. No source file is renamed, edited, or copied.</span></div><button class="primary big" type="submit">Continue to choose folder</button><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close">×</button></form></dialog>`;
    if (this.modal === 'preview') return `<dialog class="preview-dialog" aria-labelledby="preview-title"><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close">×</button>${this.previewHtml}</dialog>`;
    return '';
  }

  private async handleClick(event: Event): Promise<void> {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action], [data-view]');
    if (!target) return;
    const view = target.dataset.view as View | undefined;
    if (view) {
      event.preventDefault();
      this.view = view;
      this.render();
      this.root.querySelector<HTMLElement>('#main')?.focus();
      return;
    }
    const action = target.dataset.action;
    if (action === 'open-add') {
      if (!this.license.unlocked && this.volumes.length >= 3) {
        this.view = 'settings'; this.setToast('The free plan includes three archive locations.'); return;
      }
      this.modal = 'add'; this.render();
    } else if (action === 'close-dialog') this.closeDialog();
    else if (action === 'reload') location.reload();
    else if (action === 'rescan') await this.rescan(target.dataset.id!);
    else if (action === 'remove-volume') await this.removeVolume(target.dataset.id!);
    else if (action === 'start-drill') await this.startDrill();
    else if (action === 'open-sample') await this.openSample(Number(target.dataset.index));
    else if (action === 'mark-result') await this.markResult(Number(target.dataset.index), target.dataset.result as SampleResult);
    else if (action === 'complete-drill') await this.completeDrill();
    else if (action === 'end-drill') { if (this.currentDrill) await putDrill(this.currentDrill); this.currentDrill = undefined; this.render(); }
    else if (action === 'next-pending') this.render();
    else if (action === 'copy-path') { await navigator.clipboard.writeText(target.dataset.path!); this.setToast('Path copied.'); }
    else if (action === 'print') window.print();
    else if (action === 'export-json') await this.exportJson();
    else if (action === 'clear-data') await this.clearData();
    else if (action === 'remove-license') { removeLicense(); this.license = initialLicenseState(); this.render(); }
    else if (action === 'confirm-pass') await this.confirmPreviewResult(true);
    else if (action === 'confirm-fail') await this.confirmPreviewResult(false);
  }

  private async handleSubmit(event: SubmitEvent): Promise<void> {
    const form = event.target as HTMLFormElement;
    event.preventDefault();
    if (form.id === 'add-form') {
      const data = new FormData(form);
      this.pendingMetadata = { label: String(data.get('label')), location: String(data.get('location')), notes: String(data.get('notes')) };
      if (window.showDirectoryPicker) {
        try {
          const handle = await window.showDirectoryPicker({ mode: 'read' });
          this.closeDialog(false);
          await this.addAndScan(handle);
        } catch (error) {
          if ((error as DOMException).name !== 'AbortError') this.setToast('That folder could not be read. Try choosing it again.');
        }
      } else {
        this.closeDialog(false);
        this.root.querySelector<HTMLInputElement>('#folder-input')?.click();
      }
    } else if (form.id === 'license-form') {
      const token = String(new FormData(form).get('license') || '');
      saveLicense(token);
      this.license = { unlocked: false, checking: true };
      this.render();
      this.license = await verifyLicense(true);
      this.render();
    }
  }

  private async handleChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.id === 'folder-input' && input.files?.length && this.pendingMetadata) {
      await this.addAndScanFiles(input.files);
      input.value = '';
    } else if (input.id === 'import-file' && input.files?.[0]) {
      try {
        const bundle = JSON.parse(await input.files[0].text()) as ExportBundle;
        if (!confirm('Replace this browser’s archive map with the imported map?')) return;
        await importBundle(bundle);
        [this.volumes, this.drills] = await Promise.all([getVolumes(), getDrills()]);
        this.setToast('Archive map imported. Reconnect folders before rehearsing.');
      } catch (error) {
        this.setToast(error instanceof Error ? error.message : 'The import could not be read.');
      }
    }
  }

  private closeDialog(render = true): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
    this.root.querySelector<HTMLDialogElement>('dialog')?.close();
    this.modal = undefined;
    this.previewHtml = '';
    if (render) this.render();
  }

  private async addAndScan(handle: FileSystemDirectoryHandle): Promise<void> {
    const meta = this.pendingMetadata!;
    const volume: ArchiveVolume = { id: crypto.randomUUID(), ...meta, rootName: handle.name, addedAt: new Date().toISOString(), fileCount: 0, totalBytes: 0, scanState: 'ready', handle };
    this.volumes.push(volume); this.pendingMetadata = undefined;
    await this.runScan(volume, () => scanDirectory(volume, handle, (progress) => this.updateScan(progress)));
  }

  private async addAndScanFiles(files: FileList): Promise<void> {
    const meta = this.pendingMetadata!;
    const volume: ArchiveVolume = { id: crypto.randomUUID(), ...meta, rootName: '', addedAt: new Date().toISOString(), fileCount: 0, totalBytes: 0, scanState: 'ready' };
    this.volumes.push(volume); this.pendingMetadata = undefined;
    await this.runScan(volume, () => scanFileList(volume, files, (progress) => this.updateScan(progress)));
  }

  private updateScan(progress: ScanProgress): void {
    this.scanProgress = progress;
    const volume = this.volumes.find((item) => item.scanState === 'scanning');
    if (volume) { volume.fileCount = progress.count; volume.totalBytes = progress.bytes; }
    this.render();
  }

  private async runScan(volume: ArchiveVolume, scan: () => Promise<ArchiveVolume>): Promise<void> {
    volume.scanState = 'scanning'; this.view = 'map'; this.render();
    try {
      const finished = await scan();
      this.volumes = this.volumes.map((item) => item.id === finished.id ? finished : item);
      this.setToast(`Catalogued ${finished.fileCount.toLocaleString()} files from ${finished.label}.`);
    } catch (error) {
      this.volumes = await getVolumes();
      this.setToast(`Scan stopped. ${error instanceof Error ? error.message : 'Reconnect the folder and retry.'}`);
    }
    this.scanProgress = undefined; this.render();
  }

  private async rescan(id: string): Promise<void> {
    const volume = this.volumes.find((item) => item.id === id)!;
    let handle = volume.handle;
    try {
      if (handle?.queryPermission && await handle.queryPermission({ mode: 'read' }) !== 'granted') {
        if (await handle.requestPermission?.({ mode: 'read' }) !== 'granted') handle = undefined;
      }
      if (!handle) {
        if (!window.showDirectoryPicker) { this.setToast('Choose the folder using Add archive location in this browser.'); return; }
        handle = await window.showDirectoryPicker({ mode: 'read' });
        if (volume.rootName && handle.name !== volume.rootName && !confirm(`This folder is named “${handle.name}”, not “${volume.rootName}”. Scan it into ${volume.label} anyway?`)) return;
      }
      await this.runScan(volume, () => scanDirectory(volume, handle!, (progress) => this.updateScan(progress)));
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') this.setToast('The folder could not be read. Check the connection and try again.');
    }
  }

  private async removeVolume(id: string): Promise<void> {
    const volume = this.volumes.find((item) => item.id === id)!;
    if (!confirm(`Remove “${volume.label}” and its catalogue from this browser? Files on the drive will not be touched.`)) return;
    await deleteVolume(id); this.volumes = this.volumes.filter((item) => item.id !== id); this.setToast('Local catalogue removed. Source files were not changed.');
  }

  private async startDrill(): Promise<void> {
    const files = await getFiles();
    if (!files.length) { this.setToast('Catalogue at least one file first.'); return; }
    const selected = this.root.querySelector<HTMLSelectElement>('#sample-count');
    const count = this.license.unlocked ? Number(selected?.value || 3) : 3;
    this.currentDrill = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), samples: proposeSamples(files, this.drills, count) };
    await putDrill(this.currentDrill); this.render();
  }

  private async openSample(index: number): Promise<void> {
    const sample = this.currentDrill!.samples[index];
    const volume = this.volumes.find((item) => item.id === sample.volumeId);
    if (!volume?.handle) { this.setToast(`Reconnect “${volume?.label || 'the archive'}” with Scan again, then return to this sample.`); return; }
    try {
      if (volume.handle.queryPermission && await volume.handle.queryPermission({ mode: 'read' }) !== 'granted') {
        if (await volume.handle.requestPermission?.({ mode: 'read' }) !== 'granted') throw new Error('Folder permission was not granted.');
      }
      this.setToast(`Reading and hashing ${sample.name}…`);
      const file = await getFileFromHandle(volume.handle, sample.path);
      const currentHash = await hashFile(file);
      const matches = currentHash === sample.sha256 && file.size === sample.size;
      this.objectUrl = URL.createObjectURL(file);
      const safeName = escapeHtml(sample.name);
      let preview = `<div class="binary-preview"><span aria-hidden="true">FILE</span><a href="${this.objectUrl}" target="_blank" rel="noopener">Open ${safeName} in a new tab</a></div>`;
      if (file.type.startsWith('image/')) preview = `<img class="file-preview" src="${this.objectUrl}" alt="Preview of ${safeName}">`;
      else if (file.type.startsWith('audio/')) preview = `<audio class="media-preview" src="${this.objectUrl}" controls></audio>`;
      else if (file.type.startsWith('video/')) preview = `<video class="media-preview" src="${this.objectUrl}" controls></video>`;
      else if (file.type === 'application/pdf') preview = `<iframe class="pdf-preview" src="${this.objectUrl}" title="Preview of ${safeName}"></iframe>`;
      else if (file.type.startsWith('text/') || /\.(txt|md|csv|json|log)$/i.test(file.name)) preview = `<pre class="text-preview">${escapeHtml((await file.slice(0, 300_000).text()).slice(0, 20_000))}</pre>`;
      this.previewHtml = `<p class="eyebrow">Readability check</p><h2 id="preview-title">${safeName}</h2><div class="integrity ${matches ? 'matched' : 'changed'}"><b>${matches ? '✓ Size and SHA-256 match the catalogue' : '△ Contents differ from the catalogue'}</b><span>${matches ? 'Now confirm that the content itself opens and makes sense.' : 'Do not mark this as restored. The file may have changed or be damaged.'}</span></div>${preview}<div class="button-row"><button class="primary" data-action="confirm-pass" data-index="${index}" ${matches ? '' : 'disabled'}>Mark as opened</button><button data-action="confirm-fail" data-index="${index}">Content is unreadable</button></div>`;
      this.modal = 'preview'; this.render();
    } catch (error) {
      await this.markResult(index, 'missing', error instanceof Error ? error.message : 'The file could not be read.');
    }
  }

  private async confirmPreviewResult(passed: boolean): Promise<void> {
    const button = this.root.querySelector<HTMLElement>('[data-action="confirm-pass"], [data-action="confirm-fail"]');
    const index = Number(button?.dataset.index || 0);
    this.closeDialog(false);
    await this.markResult(index, passed ? 'pass' : 'fail', passed ? 'Hash matched and content opened.' : 'File read, but the content did not open correctly.');
  }

  private async markResult(index: number, result: SampleResult, note?: string): Promise<void> {
    const sample = this.currentDrill!.samples[index];
    sample.result = result; sample.note = note || (result === 'missing' ? 'File was not found at the recorded path.' : 'Skipped during this rehearsal.'); sample.checkedAt = new Date().toISOString();
    await putDrill(this.currentDrill!); this.render();
  }

  private async completeDrill(): Promise<void> {
    this.currentDrill!.completedAt = new Date().toISOString(); await putDrill(this.currentDrill!);
    this.drills.unshift(this.currentDrill!); this.currentDrill = undefined; this.view = 'history'; this.setToast('Rehearsal recorded. Print the recovery card for your drive box.');
  }

  private async exportJson(): Promise<void> {
    const data = JSON.stringify(await exportBundle(), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `archive-map-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
    this.setToast('Archive data exported. Store it somewhere safe.');
  }

  private async clearData(): Promise<void> {
    if (!confirm('Erase all archive labels, hashes, and drill history stored in this browser? Source files will not be touched. Export first if you need a copy.')) return;
    const { clearAll } = await import('./db'); await clearAll(); this.volumes = []; this.drills = []; this.currentDrill = undefined; this.view = 'map'; this.setToast('Local archive map erased. Source files were not changed.');
  }
}

void new ArchiveApp().init();
