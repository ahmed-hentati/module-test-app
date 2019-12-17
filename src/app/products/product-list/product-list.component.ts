import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductService } from '../shared/product.service';
import { Product } from '../shared/product.model'

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit, OnDestroy {
  products : Observable<Product[]>;
  subscription : Subscription;
  constructor( private productService : ProductService ) { }

  ngOnInit() {
    this.products = this.productService.getProducts()
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}
