import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-custom-paginator',
  templateUrl: './custom-paginator.component.html',
  styleUrls: ['./custom-paginator.component.scss'],
})
export class CustomPaginatorComponent {
  // --- INPUTS / OUTPUTS ---

  totalElements = input.required<number>(); // nombre total d’items
  currentPage = input.required<number>();   // index de page (0-based)
  pageSize = input.required<number>();      // taille de page (ex: 10, 20)

  pageChange = output<number>();            // émet la nouvelle page (0-based)

  // --- COMPUTED ---

  totalPages = computed(() => {
    const total = this.totalElements();
    const size = this.pageSize();
    return size > 0 ? Math.ceil(total / size) : 0;
  });

  paginationLabel = computed(() => {
    const current = this.currentPage();
    const size = this.pageSize();
    const total = this.totalElements();

    if (total === 0 || size === 0) {
      return 'No entries found.';
    }

    const start = current * size + 1;
    const end = Math.min((current + 1) * size, total);

    return `Entries ${start} to ${end} of ${total}`;
  });

  /**
   * Génère la liste des pages à afficher
   * -> tableau de numbers (0-based) et de '...'
   * Règle :
   *  - on garde toujours : 0, current-1, current, current+1, last
   *  - si totalPages <= 5 : on affiche tout, sans "..."
   *  - si gap = 1 : pages consécutives
   *  - si gap = 2 : on affiche la page manquante (pas de "…")
   *  - si gap >= 3 : on insère "…" entre les deux
   */
  pagesToShow = computed<(number | string)[]>(() => {
    const current = this.currentPage();
    const total = this.totalPages();

    if (total <= 0) {
      return [];
    }

    // Cas simple : peu de pages -> on affiche toutes les pages (0,1,2,...)
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const last = total - 1;

    // Candidats "importants"
    const candidates = new Set<number>([
      0,
      current - 1,
      current,
      current + 1,
      last,
    ]);

    const base = [...candidates]
      .filter((p) => p >= 0 && p < total)
      .sort((a, b) => a - b);

    // Reduction sans boucle explicite
    const pages = base.reduce<(number | string)[]>((acc, curr, index, arr) => {
      if (index === 0) {
        // Premier élément
        return [curr];
      }

      const prev = arr[index - 1];
      const gap = curr - prev;

      // Pages consécutives
      if (gap === 1) {
        return [...acc, curr];
      }

      // 1 seule page manquante -> on l’affiche
      if (gap === 2) {
        const missing = prev + 1;
        return [...acc, missing, curr];
      }

      // Vrai trou (2+ pages manquantes) -> on insère "..."
      return [...acc, '...', curr];
    }, []);

    return pages;
  });

  // --- ACTIONS ---

  changePage(page: number | string) {
    if (typeof page !== 'number') {
      return;
    }
    const total = this.totalPages();
    if (page < 0 || page >= total) {
      return;
    }
    this.pageChange.emit(page);
  }

  goToPrevious() {
    const current = this.currentPage();
    if (current > 0) {
      this.pageChange.emit(current - 1);
    }
  }

  goToNext() {
    const current = this.currentPage();
    const last = this.totalPages() - 1;
    if (current < last) {
      this.pageChange.emit(current + 1);
    }
  }
}




<div class="d-flex justify-content-between align-items-center paginator-container">
  <div class="text-muted small paginator-label">
    {{ paginationLabel() }}
  </div>

  <nav aria-label="Page navigation">
    <ul class="pagination pagination-sm m-0 custom-buttons">

      <!-- Back -->
      <li class="page-item page-nav" [class.disabled]="currentPage() === 0">
        <button class="page-link" (click)="goToPrevious()">Back</button>
      </li>

      <!-- Pages + "..." -->
      @for (page of pagesToShow(); track page) {
        <li
          class="page-item page-num"
          [class.active]="page === currentPage()"
          [class.disabled]="page === '...'"
        >
          @if (page === '...') {
            <span class="page-link">…</span>
          } @else {
            <button class="page-link" (click)="changePage(page as number)">
              {{ (page as number) + 1 }}
            </button>
          }
        </li>
      }

      <!-- Next -->
      <li
        class="page-item page-nav"
        [class.disabled]="currentPage() === totalPages() - 1"
      >
        <button class="page-link" (click)="goToNext()">Next</button>
      </li>
    </ul>
  </nav>
</div>