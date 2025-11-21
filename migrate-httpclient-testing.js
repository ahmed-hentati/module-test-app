import { NgModule, Component, Input } from '@angular/core';

@Component({
  selector: 'ngx-charts-bar-vertical',
  template: '',
})
export class MockNgxChartsBarVerticalComponent {
  @Input() results: any;
  @Input() scheme: any;
  @Input() xAxis?: boolean;
  @Input() yAxis?: boolean;
  @Input() legend?: boolean;
}

@NgModule({
  declarations: [MockNgxChartsBarVerticalComponent],
  exports: [MockNgxChartsBarVerticalComponent],
})
export class NgxChartsModule {}