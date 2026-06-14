import { NgModule } from '@angular/core';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';


@NgModule({
exports: [
TableModule,
InputTextModule,
ButtonModule,
PaginatorModule,
SelectModule,
SkeletonModule,
],
})
export class PrimeNgModule {}