import { NgModule } from '@angular/core';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { DropdownModule } from 'primeng/dropdown';
import { SkeletonModule } from 'primeng/skeleton';


@NgModule({
exports: [
TableModule,
InputTextModule,
ButtonModule,
PaginatorModule,
DropdownModule,
SkeletonModule,
],
})
export class PrimeNgModule {}