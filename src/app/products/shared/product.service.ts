import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  constructor(private db:AngularFirestore) { }


getProducts() : Observable<any[]>{
  return this.db.collection('products').valueChanges();
}
}
