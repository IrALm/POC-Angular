import { Component } from '@angular/core';

@Component({
  selector: 'app-profil',
  template: `
    <div class="flex items-center justify-center min-h-64">
      <div class="text-center">
        <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">&#x1F6A7;</span>
        </div>
        <h2 class="text-lg font-semibold text-gray-700 mb-1">Mon profil</h2>
        <p class="text-gray-400 text-sm">En cours d'implementation...</p>
      </div>
    </div>
  `,
})
export class ProfilComponent {}