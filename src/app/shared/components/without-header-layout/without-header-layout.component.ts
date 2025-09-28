import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-without-header-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './without-header-layout.component.html',
  styleUrl: './without-header-layout.component.css'
})
export class WithoutHeaderLayoutComponent {

}
