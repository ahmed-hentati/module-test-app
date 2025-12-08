// sort-utils.ts

// Comparateur générique : comme Array.prototype.sort
export type Comparator<T> = (a: T, b: T) => number;

export function defaultCompare<T>(a: T, b: T): number {
  if (a === b) return 0;
  // @ts-ignore – pour les types simples (number, string, Date...)
  return a < b ? -1 : 1;
}

/* ------------------------------------------------------------------ */
/* 1. Bubble Sort (comparaison, générique)                            */
/* ------------------------------------------------------------------ */

export function bubbleSort<T>(array: T[], compare: Comparator<T> = defaultCompare): T[] {
  const a = [...array];
  const n = a.length;

  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (compare(a[j], a[j + 1]) > 0) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }

  return a;
}

/* ------------------------------------------------------------------ */
/* 2. Selection Sort (comparaison, générique)                         */
/* ------------------------------------------------------------------ */

export function selectionSort<T>(array: T[], compare: Comparator<T> = defaultCompare): T[] {
  const a = [...array];
  const n = a.length;

  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;

    for (let j = i + 1; j < n; j++) {
      if (compare(a[j], a[minIndex]) < 0) {
        minIndex = j;
      }
    }

    if (minIndex !== i) {
      [a[i], a[minIndex]] = [a[minIndex], a[i]];
    }
  }

  return a;
}

/* ------------------------------------------------------------------ */
/* 3. Insertion Sort (comparaison, générique)                         */
/* ------------------------------------------------------------------ */

export function insertionSort<T>(array: T[], compare: Comparator<T> = defaultCompare): T[] {
  const a = [...array];
  const n = a.length;

  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;

    while (j >= 0 && compare(a[j], key) > 0) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }

  return a;
}

/* ------------------------------------------------------------------ */
/* 4. Merge Sort (comparaison, générique, stable)                     */
/* ------------------------------------------------------------------ */

export function mergeSort<T>(array: T[], compare: Comparator<T> = defaultCompare): T[] {
  if (array.length <= 1) {
    return [...array];
  }

  const mid = Math.floor(array.length / 2);
  const left = mergeSort(array.slice(0, mid), compare);
  const right = mergeSort(array.slice(mid), compare);

  return merge(left, right, compare);
}

function merge<T>(left: T[], right: T[], compare: Comparator<T>): T[] {
  const result: T[] = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }

  while (i < left.length) {
    result.push(left[i]);
    i++;
  }

  while (j < right.length) {
    result.push(right[j]);
    j++;
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* 5. Quick Sort (comparaison, générique)                             */
/* ------------------------------------------------------------------ */

export function quickSort<T>(array: T[], compare: Comparator<T> = defaultCompare): T[] {
  if (array.length <= 1) {
    return [...array];
  }

  const a = [...array];
  const pivot = a[Math.floor(a.length / 2)];

  const less: T[] = [];
  const equal: T[] = [];
  const greater: T[] = [];

  for (const item of a) {
    const cmp = compare(item, pivot);
    if (cmp < 0) {
      less.push(item);
    } else if (cmp > 0) {
      greater.push(item);
    } else {
      equal.push(item);
    }
  }

  return [...quickSort(less, compare), ...equal, ...quickSort(greater, compare)];
}

/* ------------------------------------------------------------------ */
/* 6. Heap Sort (comparaison, générique)                              */
/* ------------------------------------------------------------------ */

export function heapSort<T>(array: T[], compare: Comparator<T> = defaultCompare): T[] {
  const a = [...array];
  const n = a.length;

  const parent = (i: number) => Math.floor((i - 1) / 2);
  const leftChild = (i: number) => 2 * i + 1;
  const rightChild = (i: number) => 2 * i + 2;

  function siftDown(start: number, end: number): void {
    let root = start;

    while (leftChild(root) <= end) {
      let swapIndex = root;
      const left = leftChild(root);
      const right = rightChild(root);

      if (compare(a[swapIndex], a[left]) < 0) {
        swapIndex = left;
      }

      if (right <= end && compare(a[swapIndex], a[right]) < 0) {
        swapIndex = right;
      }

      if (swapIndex === root) {
        return;
      } else {
        [a[root], a[swapIndex]] = [a[swapIndex], a[root]];
        root = swapIndex;
      }
    }
  }

  // Build max-heap
  for (let start = parent(n - 1); start >= 0; start--) {
    siftDown(start, n - 1);
  }

  // Heap sort
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    siftDown(0, end - 1);
  }

  return a;
}

/* ------------------------------------------------------------------ */
/* 7. Counting Sort (numérique, valeurs entières seulement)           */
/* ------------------------------------------------------------------ */

export function countingSort(array: number[], min?: number, max?: number): number[] {
  if (array.length === 0) return [];

  let localMin = min ?? array[0];
  let localMax = max ?? array[0];

  // Calcul min / max si non fournis
  if (min === undefined || max === undefined) {
    for (let i = 1; i < array.length; i++) {
      if (array[i] < localMin) localMin = array[i];
      if (array[i] > localMax) localMax = array[i];
    }
  }

  const range = localMax - localMin + 1;
  const counts = new Array<number>(range).fill(0);

  // Compter
  for (const num of array) {
    counts[num - localMin]++;
  }

  // Reconstruire le tableau
  const result: number[] = [];
  for (let i = 0; i < range; i++) {
    const value = i + localMin;
    const count = counts[i];
    for (let c = 0; c < count; c++) {
      result.push(value);
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* 8. Radix Sort (numérique, entiers >= 0)                            */
/* ------------------------------------------------------------------ */

export function radixSort(array: number[]): number[] {
  if (array.length === 0) return [];

  // Vérif rapide : seulement des entiers >= 0
  if (!array.every((n) => Number.isInteger(n) && n >= 0)) {
    throw new Error('radixSort ne gère que les entiers >= 0');
  }

  const a = [...array];
  const maxNum = Math.max(...a);
  let exp = 1; // 1, 10, 100...

  while (Math.floor(maxNum / exp) > 0) {
    countingSortByDigit(a, exp);
    exp *= 10;
  }

  return a;
}

function countingSortByDigit(array: number[], exp: number): void {
  const n = array.length;
  const output = new Array<number>(n);
  const count = new Array<number>(10).fill(0);

  // Compter les chiffres
  for (let i = 0; i < n; i++) {
    const digit = Math.floor(array[i] / exp) % 10;
    count[digit]++;
  }

  // Cumulatif
  for (let i = 1; i < 10; i++) {
    count[i] += count[i - 1];
  }

  // Construire output (parcourir à l’envers pour stabilité)
  for (let i = n - 1; i >= 0; i--) {
    const digit = Math.floor(array[i] / exp) % 10;
    output[count[digit] - 1] = array[i];
    count[digit]--;
  }

  // Copier dans array
  for (let i = 0; i < n; i++) {
    array[i] = output[i];
  }
}

/* ------------------------------------------------------------------ */
/* EXEMPLES D'UTILISATION                                             */
/* ------------------------------------------------------------------ */

// const numbers = [5, 3, 8, 4, 2];
// const sortedQuick = quickSort(numbers);              // [2,3,4,5,8]
// const sortedMerge = mergeSort(numbers);              // [2,3,4,5,8]
// const sortedCounting = countingSort(numbers);        // [2,3,4,5,8]
// const sortedRadix = radixSort([170, 45, 75, 90]);    // [45,75,90,170]

// const users = [{ name: 'Ahmed', age: 33 }, { name: 'Wendy', age: 29 }];
// const sortedByAge = mergeSort(users, (a, b) => a.age - b.age);