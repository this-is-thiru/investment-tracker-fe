import { NgModule } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LUCIDE_ICONS } from './lucide-icons';

@NgModule({
  imports: [LucideAngularModule.pick(LUCIDE_ICONS)],
  exports: [LucideAngularModule],
})
export class LucideIconsModule {}
