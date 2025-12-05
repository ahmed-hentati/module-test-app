<div class="d-flex justify-content-between align-items-center paginator-container">
    
    <div class="text-muted small paginator-label">
        {{ paginationLabel() }}
    </div>

    <nav aria-label="Page navigation">
        <ul class="pagination pagination-sm m-0 custom-buttons">
            
            <li class="page-item page-nav" [class.disabled]="currentPage() === 0">
                <button class="page-link" (click)="goToPrevious()">Back</button>
            </li>

            @for (page of pagesToShow(); track page) {
                <li class="page-item page-num" [class.active]="page === currentPage()">
                    
                    @if (page !== '...') {
                      <button class="page-link" (click)="changePage(page)">
                          {{ (page as number) + 1 }} </button>
                    }
                    @else {
                      <span class="page-link dots">...</span>
                    }
                </li>
            }

            <li class="page-item page-nav" [class.disabled]="currentPage() === totalPages() - 1">
                <button class="page-link" (click)="goToNext()">Next</button>
            </li>
            
        </ul>
    </nav>
</div>


/* src/app/components/custom-paginator/custom-paginator.component.scss */

.paginator-container {
    padding: 0.5rem 0;
}

.custom-buttons {
    .page-item {
        margin: 0 2px;
        
        .page-link {
            border-radius: 4px;
            border: 1px solid #ccc;
            padding: 0.3rem 0.6rem;
            cursor: pointer;
            color: #333;
            background-color: #fff;
            font-size: 0.8rem;
            min-width: 40px; 
            text-align: center;
        }
        
        // Style spécifique pour les boutons de navigation (Back/Next)
        &.page-nav .page-link {
            min-width: 60px;
            font-weight: 500;
        }

        // État actif (Vert selon la maquette)
        &.active .page-link {
            // Couleur verte simulée (ajustez à la couleur exacte de votre charte)
            background-color: #4CAF50; 
            color: white;
            border-color: #4CAF50;
        }

        // Boutons désactivés
        &.disabled .page-link {
            color: #aaa;
            cursor: not-allowed;
            background-color: #f7f7f7;
            border-color: #eee;
        }

        // Les points de suspension
        .page-link.dots {
            border: none;
            background-color: transparent;
            cursor: default;
        }
    }
}


import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-paginator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-paginator.component.html',
  styleUrls: ['./custom-paginator.component.scss']
})
export class CustomPaginatorComponent {
  // --- INPUTS & OUTPUTS ---
  // Reçoit la quantité totale d'éléments
  totalElements = input.required<number>();
  // Reçoit l'index de page actuel (0-based)
  currentPage = input.required<number>(); 
  // Reçoit la taille de la page (10 ou 20 selon la BR05)
  pageSize = input.required<number>();
  
  // Émet l'index de la nouvelle page souhaitée vers le composant parent (ArchiveTable)
  pageChange = output<number>(); 

  // --- COMPUTED (Logique de pagination) ---
  
  // Nombre total de pages disponibles
  totalPages = computed(() => Math.ceil(this.totalElements() / this.pageSize()));

  // 1. Logique du label "Entries X to Y of Z" (BR05)
  paginationLabel = computed(() => {
    const current = this.currentPage();
    const size = this.pageSize();
    const total = this.totalElements();
    
    if (total === 0) return 'No entries found.';

    // Calcul de l'index de début et de fin (1-based)
    const start = (current * size) + 1;
    const end = Math.min((current + 1) * size, total);

    // Formatage : "Entries 1 to 25 of 79"
    return `Entries ${start} to ${end} of ${total}`;
  });

  // 2. Logique des numéros de page et des points de suspension (BR05)
  // Retourne une liste de numéros (index 0-based) ou la chaîne '...'
  pagesToShow = computed<(number | string)[]>(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const maxVisible = 7; // Max pages affichées (excluant '...')
    const pages: (number | string)[] = [];

    if (total <= maxVisible) {
      // Si peu de pages, afficher tout
      return Array.from({ length: total }, (_, i) => i);
    }

    // Afficher le début (Page 0)
    pages.push(0);

    // Déterminer la fenêtre autour de la page courante
    let start = Math.max(1, current - 1);
    let end = Math.min(total - 2, current + 1);

    // Ajouter '...' au début si la fenêtre est loin du début
    if (start > 1) {
      pages.push('...');
    }

    // Ajouter les pages dans la fenêtre
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    
    // Ajouter '...' à la fin si la fenêtre est loin de la fin
    if (end < total - 2) {
      pages.push('...');
    }

    // Afficher la fin (dernière page)
    pages.push(total - 1);
    
    // Filtre final pour enlever les doublons (si 0 est affiché et '...' aussi)
    return pages.filter((page, index, self) => 
      // Évite d'avoir deux fois le même numéro (sauf si c'est la première instance)
      index === self.findIndex((t) => t === page) 
      // Évite d'avoir '...' collé à un autre '...' ou à une extrémité.
      && (page !== '...' || self[index - 1] !== '...')
    );
  });
  
  // --- ACTIONS ---

  changePage(page: number | string) {
    // Seules les actions sur un numéro déclenchent l'événement.
    if (typeof page === 'number' && page >= 0 && page < this.totalPages()) {
      this.pageChange.emit(page);
    }
    // Cliquer sur '...' ne fait rien
  }

  goToNext() {
    this.changePage(this.currentPage() + 1);
  }

  goToPrevious() {
    this.changePage(this.currentPage() - 1);
  }
}


