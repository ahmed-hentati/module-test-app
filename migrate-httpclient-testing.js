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



// src/app/components/archive-table/archive-table.component.ts

import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ArchiveItem } from '../../models/archive.model';
import { EmptyValuePipe } from '../../pipes/empty-value.pipe';
import { CustomPaginatorComponent } from '../custom-paginator/custom-paginator.component'; 

@Component({
  selector: 'app-archive-table',
  standalone: true,
  // Ajout du Paginator Custom aux imports
  imports: [CommonModule, EmptyValuePipe, DatePipe, CustomPaginatorComponent],
  templateUrl: './archive-table.component.html',
  styleUrls: ['./archive-table.component.scss']
})
export class ArchiveTableComponent {
  // --- INPUTS & OUTPUTS ---
  title = input.required<string>();
  // Input 1: Reçoit TOUTES les données de la part du Parent (Chargement Unique)
  data = input.required<ArchiveItem[]>(); 
  // Input 2: L'index de la page courante (géré par le Parent)
  currentPage = input.required<number>(); 
  // Input 3: La taille de la page (10 ou 20 selon la section)
  pageSize = input.required<number>();
  
  // Output: Émet la demande de changement de page au composant Parent
  pageChange = output<number>(); 

  // --- ÉTAT LOCAL ---
  isCollapsed = signal(false);

  // --- COMPUTED (Logique réactive) ---
  
  // 1. Total des éléments
  totalElements = computed(() => this.data().length);

  // 2. Tri des données complètes (exécuté une seule fois par changement de 'data')
  sortedData = computed(() => {
    const rawData = this.data();
    if (!rawData || rawData.length === 0) return [];
    
    // BR01/BR02: Tri par date la plus récente
    return [...rawData].sort((a, b) => {
      return new Date(b.archiveDate).getTime() - new Date(a.archiveDate).getTime();
    });
  });

  // 3. Découpage Côté Client (Slicing) : Données à afficher
  displayedData = computed<ArchiveItem[]>(() => {
    const data = this.sortedData();
    const pageIndex = this.currentPage(); 
    const size = this.pageSize();

    const start = pageIndex * size;
    const end = start + size;
    
    // La clé de la pagination client
    return data.slice(start, end);
  });
  
  // --- ACTIONS ---

  toggleCollapse() {
    this.isCollapsed.update(v => !v);
  }

  /**
   * Reçoit l'index de la nouvelle page émis par le CustomPaginator.
   * Transfère l'événement au composant parent pour la mise à jour de l'état.
   * @param newPageIndex L'index de la nouvelle page (0-based)
   */
  handlePageChange(newPageIndex: number): void {
    this.pageChange.emit(newPageIndex);
  }
}


<div class="card mb-4">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h5 class="m-0">
      ARCHIVE {{ title() | uppercase }} ({{ totalElements() }})
    </h5>
    <button class="btn btn-sm btn-link" (click)="toggleCollapse()">
      {{ isCollapsed() ? '+' : '-' }}
    </button>
  </div>

  @if (!isCollapsed()) {
    <div class="card-body p-0">
      <div class="table-responsive">
        <table class="table table-striped m-0">
          <thead>
            <tr>
              <th>PDF</th>
              <th>Workflow ID</th>
              <th>Archive ID</th>
              <th>Workflow Status</th>
              <th>Specific Rating Policy</th>
              <th>IR Approved</th>
              <th>CR Approved</th>
              <th>SU GRR Approved (%)</th>
              <th>Rating Date</th>
            </tr>
          </thead>
          <tbody>
            @for (item of displayedData(); track item.archiveId) {
              <tr>
                <td><a [href]="item.pdfLink"><i class="fa fa-file-pdf-o"></i></a></td>
                <td>{{ item.workflowId | emptyValue }}</td>
                <td>{{ item.archiveId | emptyValue }}</td>
                <td>
                  {{ item.workflowStatus | emptyValue }} <br>
                  <small class="text-muted">{{ item.archiveDate | date:'dd/MM/yyyy' }}</small>
                </td>
                <td>{{ item.specificRatingPolicy | emptyValue }}</td>
                <td>{{ item.irApproved | emptyValue }}</td>
                <td>{{ item.crApproved | emptyValue }}</td>
                <td>{{ item.suGrrApproved | emptyValue }}</td>
                <td>{{ item.ratingDate | date:'dd/MM/yyyy' | emptyValue }}</td>
              </tr>
            }
            @empty {
              <tr>
                 <td colspan="9" class="text-center">No archives found.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalElements() > pageSize()) {
        <div class="card-footer p-2">
            <app-custom-paginator
                [totalElements]="totalElements()"
                [currentPage]="currentPage()"
                [pageSize]="pageSize()"
                (pageChange)="handlePageChange($event)"> 
            </app-custom-paginator>
        </div>
      }
    </div>
  }
</div>


/* src/app/components/archive-table/archive-table.component.scss */

/* Styles généraux du tableau */
.table small.text-muted {
    font-size: 0.7rem;
    display: block; 
}

/* Assurez-vous que le footer a le bon padding pour le paginator */
.card-footer {
    border-top: 1px solid #eee;
}


// src/app/pages/archive-page/archive-page.component.ts

import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArchiveTableComponent } from '../../components/archive-table/archive-table.component';
import { ArchiveService } from '../../services/archive.service';
import { ArchiveItem, CounterpartyArchives } from '../../models/archive.model';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-archive-page',
  standalone: true,
  imports: [CommonModule, ArchiveTableComponent, HttpClientModule],
  providers: [ArchiveService],
  template: `
    <div class="container-fluid mt-3">
      @if (archivesData()) {
          <div class="d-flex align-items-center mb-3">
            <h3 class="me-3">Archive</h3>
            <span class="badge bg-secondary">{{ archivesData()!.counterpartyName }}</span>
          </div>
          
          <app-archive-table
            title="Counterparty Rating"
            [data]="ratingArchives()"       
            [currentPage]="ratingPage()"
            [pageSize]="10"                 
            (pageChange)="ratingPage.set($event)">
          </app-archive-table>
          
          <app-archive-table
            title="GRR Facility"
            [data]="grrArchives()"
            [currentPage]="grrPage()"
            [pageSize]="20"
            (pageChange)="grrPage.set($event)">
          </app-archive-table>
          
      } @else if (archivesData() === undefined) {
          <div class="text-center mt-5">Loading archives...</div>
      } @else {
          <div class="text-center mt-5">Error fetching archives or ID missing.</div>
      }
    </div>
  `
})
export class ArchivePageComponent {
  // --- 1. SIGNALS DE DONNÉES (Chargement Unique) ---
  
  // Le résultat complet de l'API (Observable transformé en Signal)
  archivesData = toSignal<CounterpartyArchives | undefined>(
    this.route.paramMap.pipe(
      // Récupère l'ID 'id' de la route et appelle l'API une seule fois
      switchMap(params => {
        const id = params.get('id');
        // IMPORTANT: Le service doit maintenant retourner l'observable<CounterpartyArchives> complet
        return id ? this.archiveService.getArchives(id) : [undefined]; 
      })
    )
  );

  // Signaux extraits pour les listes spécifiques (utilisés dans le template)
  ratingArchives = signal<ArchiveItem[]>([]);
  grrArchives = signal<ArchiveItem[]>([]);
  
  // --- 2. SIGNALS D'ÉTAT (Pagination Côté Client) ---
  
  // Index de la page courante pour le tableau Rating (Initialisation à 0)
  ratingPage = signal(0); 
  
  // Index de la page courante pour le tableau GRR (Initialisation à 0)
  grrPage = signal(0);

  constructor(
    private route: ActivatedRoute,
    private archiveService: ArchiveService
  ) {
    // --- 3. EFFET POUR TRAITER LES DONNÉES APRÈS L'APPEL API ---
    // Cet effet s'exécute dès que archivesData() est mis à jour par le toSignal
    effect(() => {
        const data = this.archivesData();
        if (data) {
            // Mise à jour des listes spécifiques (ratingArchives et grrArchives)
            this.ratingArchives.set(data.ratingArchives || []);
            this.grrArchives.set(data.grrArchives || []);
            
            // Si les données changent, on réinitialise l'état des pages à la première page (0)
            this.ratingPage.set(0);
            this.grrPage.set(0);
        }
    });
  }
}



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
            display: inline-flex; // Pour aligner le texte et l'icône si on en ajoute
            align-items: center;
            justify-content: center;
        }
        
        // Style spécifique pour les boutons de navigation (Back/Next)
        &.page-nav .page-link {
            min-width: 60px;
            font-weight: 500;
            // On retire la bordure des boutons Back/Next pour coller au design de la capture
            border: none; 
            background-color: #f0f0f0; /* Fond gris clair pour les nav (Back/Next) */
        }
        
        // État actif (numéros de page seulement, comme '1')
        &.active .page-link {
            background-color: #4CAF50; 
            color: white;
            border-color: #4CAF50;
        }

        /* --- STYLING SPÉCIFIQUE DES BOUTONS DE NAVIGATION --- */
        
        // Bouton 'Back'
        // Nous allons ajouter un chevron '<' devant 'Back'
        &.page-nav:first-child .page-link::before {
            content: '<';
            margin-right: 5px;
            font-weight: bold;
        }

        // Bouton 'Next'
        // Nous allons ajouter un chevron '>' après 'Next'
        &.page-nav:last-child .page-link::after {
            content: '>';
            margin-left: 5px;
            font-weight: bold;
        }


        // **CORRECTION DES BOUTONS DÉSACTIVÉS (comme 'Next' à la fin)**
        // Le fond gris est déjà sur le page-nav, mais on gère l'état 'disabled'
        &.disabled {
            .page-link {
                color: #aaa; /* Texte gris clair */
                cursor: not-allowed;
                background-color: #f7f7f7; /* Fond gris très clair (BR05 désactivé) */
                border-color: #eee;
            }
            // Pour les boutons Back/Next, on réapplique un fond gris plus soutenu si désactivé (comme dans la capture)
            &.page-nav .page-link {
                 background-color: #e0e0e0; /* Gris moyen pour le bouton désactivé (Next>) */
                 color: #888;
                 
                 // On s'assure que la flèche est également en gris
                 &::before, &::after {
                    color: #888;
                 }
            }
        }

        // Les numéros de page (pour s'assurer qu'ils gardent leur style borduré)
        &.page-num .page-link {
            border: 1px solid #ccc;
            background-color: #fff;
        }

        // Les points de suspension
        .page-link.dots {
            border: none;
            background-color: transparent;
            cursor: default;
        }
    }
}
