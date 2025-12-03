import { Component, input, computed, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyValuePipe } from '../../pipes/empty-value.pipe'; // Ton pipe
import { ArchiveItem } from '../../models/archive.model';

@Component({
  selector: 'app-archive-table',
  standalone: true,
  imports: [CommonModule, EmptyValuePipe],
  templateUrl: './archive-table.component.html',
})
export class ArchiveTableComponent {
  title = input.required<string>();
  data = input.required<ArchiveItem[]>(); 
  initialPageSize = input<number>(10); // Valeur par défaut 10

  isCollapsed = signal(false);
  
  currentLimit = signal(10); 

  sortedData = computed(() => {
    const rawData = this.data();
    // On copie le tableau avec [...rawData] pour éviter de muter l'input
    return [...rawData].sort((a, b) => {
      return new Date(b.archiveDate).getTime() - new Date(a.archiveDate).getTime();
    });
  });

  displayedData = computed(() => {
    return this.sortedData().slice(0, this.currentLimit());
  });

  // Calculs pour l'UI
  totalArchives = computed(() => this.data().length);
  
  paginationLabel = computed(() => {
    const limit = this.initialPageSize(); // ou currentLimit() selon le besoin texte
    const total = this.totalArchives();
    // Texte exact demandé : "Show 10 (or less...) out of X"
    return `Show ${limit} (or less if there is less) out of ${total}`;
  });

  canShowMore = computed(() => {
    return this.displayedData().length < this.totalArchives();
  });

  // --- 4. Constructor / Effects ---
  constructor() {
    // RESET LOGIC : 
    // Si l'input "data" change complètement (ex: on change de contrepartie),
    // on veut remettre la pagination à zéro (initialPageSize).
    effect(() => {
      // On lit les dépendances qui déclenchent l'effet
      const newData = this.data(); 
      const initSize = this.initialPageSize();

      // untracked évite une boucle infinie si on lit currentLimit ici
      untracked(() => {
        this.currentLimit.set(initSize);
      });
    }, { allowSignalWrites: true }); 
    // allowSignalWrites est nécessaire car on modifie un signal dans un effect
  }

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
  }

  showMore(): void {
    this.currentLimit.update(limit => limit + this.initialPageSize());
  }
}


<div class="card mb-4">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h5 class="m-0">
      ARCHIVE {{ title() | uppercase }} ({{ totalArchives() }})
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

      @if (canShowMore()) {
        <div class="card-footer text-center">
            <button class="btn btn-link" (click)="showMore()">
                + {{ paginationLabel() }} {{ title() }} Archives
            </button>
        </div>
      }
    </div>
  }
</div>

// src/app/pages/archive-page/archive-page.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArchiveTableComponent } from '../../components/archive-table/archive-table.component';
import { ArchiveService } from '../../services/archive.service';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import { CounterpartyArchives } from '../../models/archive.model';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-archive-page',
  standalone: true,
  imports: [CommonModule, ArchiveTableComponent, HttpClientModule],
  providers: [ArchiveService], // Fourni ici ou en root
  template: `
    <div class="container-fluid mt-3">
      
      @if (archives()) {
          <div class="d-flex align-items-center mb-3">
            <h3 class="me-3">Archive</h3>
            <span class="badge bg-secondary">{{ archives()!.counterpartyName }}</span>
          </div>
    
          <app-archive-table
            [title]="'Counterparty Rating'"
            [data]="archives()!.ratingArchives"
            [initialPageSize]="10">
          </app-archive-table>
    
          <app-archive-table
            [title]="'GRR Facility'"
            [data]="archives()!.grrArchives"
            [initialPageSize]="20">
          </app-archive-table>
      } @else if (archives() === undefined) {
          <div class="text-center mt-5">Loading archives...</div>
      } @else {
          <div class="text-center mt-5">Error fetching archives or ID missing.</div>
      }
    </div>
  `
})
export class ArchivePageComponent implements OnInit {
  // Récupère l'ID de la route, puis appelle l'API. 
  // Le résultat est transformé en signal (toSignal) pour une utilisation facile dans le template.
  archives = toSignal<CounterpartyArchives | undefined>(
    this.route.paramMap.pipe(
      // Récupère l'ID 'id' de la route (ex: /archive/123)
      switchMap(params => {
        const id = params.get('id');
        return id ? this.archiveService.getArchives(id) : [undefined];
      })
    )
  );
  
  constructor(
    private route: ActivatedRoute,
    private archiveService: ArchiveService
  ) {}

  ngOnInit(): void {
    // Le toSignal gère la subscription, rien à faire ici
  }
}


// src/app/pipes/empty-value.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'emptyValue',
  standalone: true
})
export class EmptyValuePipe implements PipeTransform {
  transform(value: any): string | any {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    // Formatter les pourcentages ou autres ici si nécessaire
    if (typeof value === 'number' && isNaN(value)) {
        return '-';
    }
    return value;
  }
}


// src/app/models/archive.model.ts

export interface ArchiveItem {
  pdfLink: string;
  workflowId: string;
  archiveId: string;
  workflowStatus: string;
  user: string;
  archiveDate: string; // ISO string pour un tri fiable
  specificRatingPolicy: string | null;
  irApproved: string | null;
  crApproved: string | null;
  suGrrApproved: number | null; // Pourcentage
  ratingDate: string; // ISO string
}

export interface CounterpartyArchives {
  counterpartyName: string;
  ratingArchives: ArchiveItem[];
  grrArchives: ArchiveItem[];
}



// src/app/services/archive.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { CounterpartyArchives } from '../models/archive.model';

@Injectable({ providedIn: 'root' })
export class ArchiveService {
  private apiUrl = '/api/archives'; 

  constructor(private http: HttpClient) {}

  getArchives(counterpartyId: string): Observable<CounterpartyArchives> {
    // --- STRATÉGIE "FETCH ALL" CÔTÉ CLIENT ---
    // Remplacez 'of(this.mockData)' par :
    // return this.http.get<CounterpartyArchives>(`${this.apiUrl}/${counterpartyId}`);
    
    // Ceci est une donnée de MOCK pour le développement, à supprimer
    return of(this.mockData); 
  }
  
  // Données de mock pour simuler une réponse API
  private mockData: CounterpartyArchives = {
      counterpartyName: 'BNP PARIBAS SA',
      ratingArchives: [
          // Ajoutez ici plus de 10 éléments pour tester le "Load More"
          {
            pdfLink: '#', workflowId: 'W003', archiveId: 'A003', workflowStatus: 'Approved', user: 'Admin',
            archiveDate: '2025-11-20T10:00:00Z', specificRatingPolicy: 'Policy B', irApproved: 'Yes',
            crApproved: 'No', suGrrApproved: 50, ratingDate: '2025-11-20T00:00:00Z'
          },
          // ... 9 autres éléments ...
      ],
      grrArchives: [
          // Ajoutez ici plus de 20 éléments pour tester le "Load More" GRR
          // ...
      ]
  };
}




// archive.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ArchiveScreenResponse } from './archive.model';

@Injectable({ providedIn: 'root' })
export class ArchiveService {
  constructor() {}

  // À remplacer par un vrai HttpClient.get(...)
  getArchiveScreen(counterpartyId: string): Observable<ArchiveScreenResponse> {
    console.log('Mock call for counterpartyId =', counterpartyId);

    const response: ArchiveScreenResponse = {
      counterpartyName: 'PADDYB REKOLB',
      ratingArchives: this.buildMockEntries(20),      // 20 ratings
      grrFacilityArchives: this.buildMockEntries(30), // 30 facilities
    };

    return of(response);
  }

  private buildMockEntries(count: number) {
    const entries = [];
    for (let i = 0; i < count; i++) {
      entries.push({
        pdfUrl: '/assets/mock/archive-' + (i + 1) + '.pdf',
        workflowId: '113456',
        archiveId: '887409873' + ((i % 5) + 1),
        archiveStatus: {
          code: 'APPROVED',
          label: 'Approved',
          user: 'Camille DUPONT',
          date: '2025-04-30',
        },
        archiveDate: '2025-04-30',
        specificRatingPolicy: 'P D',
        irApproved: i % 3 === 0 ? null : true, // pour tester le "-"
        crApproved: '6+',
        suGrrApproved: 60.35,
        ratingDate: '2025-04-30',
      });
    }
    return entries;
  }
}
