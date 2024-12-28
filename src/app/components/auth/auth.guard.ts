import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
    providedIn: 'root',
})

export class authGuard implements CanActivate {
    constructor(private router: Router) {
    }

    canActivate(): boolean {
        if (typeof localStorage !== 'undefined') {
            const token = localStorage.getItem('jwtToken');
            if (token) {
                // User is authenticated
                return true;
            }
        }
        // User is not authenticated, redirect to login page
        this.router.navigate(['/auth']);
        return false;
    }
}

