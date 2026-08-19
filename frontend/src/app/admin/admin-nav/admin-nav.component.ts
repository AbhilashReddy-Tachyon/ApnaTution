import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-admin-nav',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './admin-nav.component.html',
    styleUrl: './admin-nav.component.css'
})
export class AdminNavComponent { }
