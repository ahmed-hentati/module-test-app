.status-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem; // équivalent à ~4px
}

.status-chip {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 6.6875rem;        // 107px → rem
  height: 1.4375rem;       // 23px → rem
  border-radius: 1.875rem; // 30px → rem

  font-family: 'Open Sans Bold', sans-serif;
  font-size: 0.75rem;
  color: white;

  gap: 0.35rem;
  padding-left: 0.625rem;  // 10px → rem
  padding-right: 0.625rem; // 10px → rem
}

.status-chip.approved {
  background-color: #45927D;
}

.status-chip.decline {
  background-color: #C64B45;
}

.status-icon {
  display: inline-flex;
  width: 0.875rem;   // 14px → rem
  height: 0.875rem;  // 14px → rem
}



<div class="status-wrapper">
  <span
    class="status-chip"
    [ngClass]="facility.status === 'APPROVED' ? 'approved' : 'decline'">
    {{ facility.status }}
    <span class="status-icon" bnppSvgIcon="check"></span>
  </span>

  <div class="metadata">
    By {{ facility.user }} {{ facility.statusDate | date:'dd/MM/yyyy' }}<br />
    Workflow status
  </div>
</div>
