@Component({
  selector: 'app-archive-ratings-page',
  templateUrl: './archive-ratings-page.component.html'
})
export class ArchiveRatingsPageComponent {
  ratingsPage$ = this.route.paramMap.pipe(
    switchMap(params => {
      const counterpartyId = params.get('id')!;
      return this.service.getArchiveRatings(counterpartyId, this.page, this.pageSize);
    })
  );

  page = 0;
  pageSize = 10;

  constructor(
    private route: ActivatedRoute,
    private service: ArchiveRatingService
  ) {}

  onPageChange(page: number) {
    this.page = page;
    // re-trigger la requête, soit via un subject, soit via router params/query params
  }
}


<!-- archive-ratings-table.component.html -->
<table class="archive-table">
  <thead>
    <tr>
      <th></th>
      <th>Workflow ID</th>
      <th>Archive ID</th>
      <th>Archive status</th>
      <th>Specific Rating Policy</th>
      <th>IR Approved</th>
      <th>CR Approved</th>
      <th>SU GRR Approved (%)</th>
      <th>Rating date</th>
    </tr>
  </thead>

  <tbody>
    <tr *ngFor="let rating of ratings">
      <td>
        <a [href]="rating.pdfUrl" target="_blank" rel="noopener">
          <!-- icône doc/pdf -->
          <i class="icon-pdf"></i>
        </a>
      </td>

      <td>{{ rating.workflowId }}</td>
      <td>{{ rating.archiveId }}</td>

      <td>
        {{ rating.archiveStatus.label }}
        by {{ rating.archiveStatus.user }}
        {{ rating.archiveStatus.date | date: 'dd/MM/yyyy' }}
      </td>

      <td>{{ rating.specificRatingPolicy }}</td>

      <td>
        <ng-container *ngIf="rating.irApproved; else notApproved">
          ✔
        </ng-container>
        <ng-template #notApproved>✖</ng-template>
      </td>

      <td>{{ rating.crApproved }}</td>
      <td>{{ rating.suGrrApproved | number:'1.2-2' }}</td>
      <td>{{ rating.ratingDate | date:'dd/MM/yyyy' }}</td>
    </tr>
  </tbody>
</table>

<div class="pagination">
  <!-- à adapter à ton design système -->
  <button (click)="pageChange.emit(page - 1)" [disabled]="page === 0">
    Prev
  </button>
  <span>Page {{ page + 1 }}</span>
  <button (click)="pageChange.emit(page + 1)"
          [disabled]="(page + 1) * pageSize >= totalItems">
    Next
  </button>
</div>


// archive-rating.service.ts
@Injectable({ providedIn: 'root' })
export class ArchiveRatingService {
  private readonly baseUrl = '/api/archive-ratings';

  constructor(private http: HttpClient) {}

  getArchiveRatings(counterpartyId: string, page = 0, pageSize = 10): Observable<ArchiveRatingPage> {
    const params = new HttpParams()
      .set('counterpartyId', counterpartyId)
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<ArchiveRatingPage>(this.baseUrl, { params });
  }
}



{
  "page": 0,
  "pageSize": 10,
  "totalItems": 20,
  "items": [
    {
      "id": "1",
      "workflowId": "113456",
      "archiveId": "8874098735",
      "pdfUrl": "/api/archive-ratings/8874098735/file",
      "archiveStatus": {
        "code": "APPROVED",
        "label": "Approved",
        "user": "Camille DUPONT",
        "date": "2025-04-30"
      },
      "archiveDate": "2025-04-30",
      "specificRatingPolicy": "PD Large Corporates",
      "irApproved": true,
      "crApproved": "6+",
      "suGrrApproved": 60.35,
      "ratingDate": "2025-04-30"
    },
    {
      "id": "2",
      "workflowId": "113456",
      "archiveId": "8874098736",
      "pdfUrl": "/api/archive-ratings/8874098736/file",
      "archiveStatus": {
        "code": "APPROVED",
        "label": "Approved",
        "user": "Camille DUPONT",
        "date": "2025-04-30"
      },
      "archiveDate": "2025-04-29",
      "specificRatingPolicy": "PD",
      "irApproved": true,
      "crApproved": "6+",
      "suGrrApproved": 60.35,
      "ratingDate": "2025-04-29"
    }
  ]


  // archive-rating.model.ts
export interface ArchiveStatus {
  code: 'APPROVED' | 'REJECTED' | 'PENDING'; // à adapter
  label: string;                              // "Approved"
  user: string;                               // "Camille DUPONT"
  date: string;                               // "2025-04-30" (ISO)
}

export interface ArchiveRating {
  id: string;                 // identifiant technique de la ligne si besoin
  workflowId: string;         // Workflow ID
  archiveId: string;          // Archive ID
  pdfUrl: string;             // PDF archive link

  archiveStatus: ArchiveStatus; // status + user + date (AC: "User embedded")

  archiveDate: string;        // Archive date (dd/mm/yyyy côté UI)

  specificRatingPolicy: string; // "PD

  irApproved: boolean;        // IR Approved (check / icon)
  crApproved: string;         // "6+" (la note CR)
  suGrrApproved: number;      // 60.35 (%)
  ratingDate: string;         // Rating date (ISO)
}

// réponse avec pagination
export interface ArchiveRatingPage {
  items: ArchiveRating[];
  totalItems: number;
  page: number;
  pageSize: number;
}

}



