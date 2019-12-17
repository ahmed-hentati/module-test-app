import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Product } from './product.model';
import { map } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class ProductService {

  constructor(private db:AngularFirestore) { }


getProducts() : Observable<Product[]>{
  return this.db.collection<Product>('products').valueChanges().pipe(
    map(
      (products) => { return products.map( product => { return {name: product.name }}) }
    )
  )
}
}
