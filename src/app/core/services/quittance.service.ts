import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { QuittanceDTO, QuittanceFormDTO, QuittancePageDTO, QuittanceSearchDTO } from '../models/quittance.models';
import { SignatureDTO } from '../models/contrat.models';

@Injectable({ providedIn: 'root' })
export class QuittanceService {
  private readonly API = `${environment.apiUrl}/quittances`;

  constructor(private http: HttpClient) {}

  create(dto: QuittanceFormDTO) {
    return this.http.post<void>(this.API, dto);
  }

  marquerPayee(id: number, dto: SignatureDTO) {
    return this.http.post<void>(`${this.API}/${id}/marquer-payee`, dto);
  }

  getByBien(bienId: number) {
    return this.http.get<QuittanceDTO[]>(`${this.API}/bien/${bienId}`);
  }

  getMesQuittances() {
    return this.http.get<QuittanceDTO[]>(`${this.API}/mes-quittances`);
  }

  getById(id: number) {
    return this.http.get<QuittanceDTO>(`${this.API}/${id}`);
  }

  search(dto: QuittanceSearchDTO) {
    return this.http.post<QuittancePageDTO>(`${this.API}/search`, dto);
  }
}
