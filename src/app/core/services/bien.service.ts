import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BienDTO, BienPageDTO, BienSearchDTO, BienUpdateDTO } from '../models/bien.models';
import { LocatairePageDTO, LocataireSearchDTO } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class BienService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  search(dto: BienSearchDTO) {
    return this.http.post<BienPageDTO>(`${this.API}/biens/search`, dto);
  }

  getById(id: number) {
    return this.http.get<BienDTO>(`${this.API}/biens/${id}`);
  }

  create(formData: FormData) {
    return this.http.post<void>(`${this.API}/biens`, formData);
  }

  getMesBiens() {
    return this.http.get<BienDTO[]>(`${this.API}/users/biens`);
  }

  assignLocataire(bienId: number, userId: number) {
    return this.http.post<void>(`${this.API}/biens/${bienId}/assigne-locataire/${userId}`, {});
  }

  update(id: number, dto: BienUpdateDTO) {
    return this.http.patch<BienDTO>(`${this.API}/biens/${id}`, dto);
  }

  rechercheLocataire(bienId: number, dto?: LocataireSearchDTO) {
    return this.http.post<LocatairePageDTO>(`${this.API}/users/${bienId}/recherche-locataire`, dto ?? {});
  }
}
