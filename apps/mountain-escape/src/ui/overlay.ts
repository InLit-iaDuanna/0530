export class Overlay {
  private readonly root: HTMLElement;
  private readonly hud = document.createElement('div');
  private readonly panel = document.createElement('div');
  private readonly vignette = document.createElement('div');
  private flashTimer = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.className = 'overlay-root';
    this.hud.className = 'hud';
    this.panel.className = 'panel hidden';
    this.vignette.className = 'vignette';
    this.root.append(this.hud, this.panel, this.vignette);
  }

  showStory(title: string, lines: string[], actions: { label: string; onClick: () => void }[]): void {
    this.panel.className = 'panel';
    this.panel.innerHTML = '';
    const heading = document.createElement('h1');
    heading.textContent = title;
    this.panel.append(heading);

    for (const line of lines) {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      this.panel.append(paragraph);
    }

    const row = document.createElement('div');
    row.className = 'actions';
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      row.append(button);
    }
    this.panel.append(row);
  }

  showChoice(title: string, options: { label: string; onClick: () => void }[]): void {
    this.panel.className = 'panel compact';
    this.panel.innerHTML = '';
    const heading = document.createElement('h1');
    heading.textContent = title;
    const row = document.createElement('div');
    row.className = 'actions';
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option.label;
      button.addEventListener('click', option.onClick);
      row.append(button);
    }
    this.panel.append(heading, row);
  }

  hidePanel(): void {
    this.panel.className = 'panel hidden';
    this.panel.innerHTML = '';
  }

  setHud(lines: string[]): void {
    this.hud.innerHTML = '';
    for (const line of lines) {
      const item = document.createElement('div');
      item.textContent = line;
      this.hud.append(item);
    }
  }

  setDanger(value: number): void {
    this.vignette.style.opacity = String(Math.max(0, Math.min(1, value)));
  }

  flashHit(): void {
    this.flashTimer = 0.2;
    this.root.classList.add('hit');
  }

  update(dt: number): void {
    if (this.flashTimer <= 0) {
      return;
    }

    this.flashTimer -= dt;
    if (this.flashTimer <= 0) {
      this.root.classList.remove('hit');
    }
  }

  clear(): void {
    this.hidePanel();
    this.setHud([]);
    this.setDanger(0);
    this.root.classList.remove('hit');
  }
}
