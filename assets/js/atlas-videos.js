export function youtubeLinks(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(value => {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && !url.port
        && ['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname);
    } catch { return false; }
  }))];
}

export function renderDiagramVideos(container, diagram) {
  container.replaceChildren();
  const urls = youtubeLinks(diagram?.videos);
  container.hidden = urls.length === 0;
  urls.forEach((url, index) => {
    const link = document.createElement('a');
    link.className = 'detail__video';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Watch video ${index + 1} about ${diagram.title || 'this diagram'} on YouTube (opens in a new tab)`);
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="5"/><path d="m10 8 6 4-6 4Z"/></svg><span><small>WATCH ON YOUTUBE</small><strong></strong></span><svg class="detail__video-external" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6"/></svg>';
    link.querySelector('strong').textContent = urls.length === 1 ? 'Guided explanation' : `Guided explanation ${index + 1}`;
    container.append(link);
  });
}
