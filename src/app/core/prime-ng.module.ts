import { NgModule } from '@angular/core';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ChartModule } from 'primeng/chart';
import { TooltipModule } from 'primeng/tooltip';


@NgModule({
exports: [
TableModule,
InputTextModule,
ButtonModule,
PaginatorModule,
SelectModule,
SelectButtonModule,
SkeletonModule,
ToastModule,
ChartModule,
TooltipModule,
],
})
export class PrimeNgModule {}