import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  data = [
    { name: 'Task 1', status: 'Completed' },
    { name: 'Task 2', status: 'In Progress' },
    { name: 'Task 3', status: 'Open' },
    { name: 'Task 4', status: 'Started' },
  ];

  editItem(item: any) {
    alert(`Editing item: ${item.name}`);
  }

  deleteItem(index: number) {
    this.data.splice(index, 1);
  }
}
