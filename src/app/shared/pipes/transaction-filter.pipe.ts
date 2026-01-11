import { Pipe, PipeTransform } from '@angular/core';
import { TransactionsResponse } from '../../models/TranscationsResponse';

@Pipe({
  name: 'transactionFilter',
  standalone: true,
  pure: true,
})
export class TransactionFilterPipe implements PipeTransform {
  transform(
    list: TransactionsResponse[] | null | undefined,
    query: string,
  ): TransactionsResponse[] {
    if (!list || list.length === 0) return [];
    if (!query) return list;

    const q = query.toLowerCase();
    return list.filter(
      (t) =>
        (t.stockCode && t.stockCode.toLowerCase().includes(q)) ||
        (t.stockName && t.stockName.toLowerCase().includes(q)) ||
        (t.transactionType && t.transactionType.toLowerCase().includes(q)),
    );
  }
}
