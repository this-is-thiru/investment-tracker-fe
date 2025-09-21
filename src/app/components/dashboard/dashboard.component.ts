import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  providers: [MessageService]
})
export class DashboardComponent {
  excelData: any[] = [];
  headers: string[] = [];

  constructor(private http: HttpClient, private messageService: MessageService) {}

  // Handle Excel File Upload
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const binaryString = e.target?.result as string;
        const workbook = XLSX.read(binaryString, { type: 'binary' });
        this.loadSheetData(workbook);
        this.messageService.add({ severity: 'success', summary: 'Excel Uploaded', detail: file.name });
      };
      reader.readAsBinaryString(file);
    }
  }

  // Parse Excel and Convert to JSON
  loadSheetData(workbook: XLSX.WorkBook): void {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    if (rawData.length > 0) {
      this.headers = rawData[0]; // First row is header
      rawData.shift(); // Remove header from data

      this.excelData = rawData.map((row) => {
        const obj: any = {};
        this.headers.forEach((header, i) => {
          obj[header] = row[i] ?? '';
        });
        return obj;
      });
    }
  }

  // Delete a row from the data
  deleteRow(rowIndex: number): void {
    this.excelData.splice(rowIndex, 1);
    this.messageService.add({ severity: 'info', summary: 'Row Deleted', detail: `Row ${rowIndex + 1}` });
  }

  // Download template file from server
  downloadTemplate(): void {
    this.http
      .get('http://localhost:8080/helper/template', { responseType: 'blob' })
      .subscribe((response: Blob) => {
        const url = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Download Started', detail: 'Template.xlsx' });
      });
  }

  // Optional: Upload Excel to backend
  uploadExcelFile(file: File, email: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(
      `http://localhost:8080/portfolio/user/${email}/upload-transactions`,
      formData
    );
  }
}
