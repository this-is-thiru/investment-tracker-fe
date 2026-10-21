export interface RedriveResult {
  succeeded: string[];
  failed: Record<string, string>;
  stillFiltered: string[];
  filteredOut: string[];
  message: string;
}
