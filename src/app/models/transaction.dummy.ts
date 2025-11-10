export interface Transaction {
  id: string;
  stock: string;
  quantity: number;
  status: string; // e.g., 'Pending', 'Completed'
  actionDate: string;
}