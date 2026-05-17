import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ContratDTO, ContratFormDTO, ContratPageDTO, ContratSearchDTO, SignatureDTO } from '../models/contrat.models';

@Injectable({ providedIn: 'root' })
export class ContratService {
  private readonly API = `${environment.apiUrl}/contrats`;

  constructor(private http: HttpClient) {}

  create(dto: ContratFormDTO) {
    return this.http.post<void>(this.API, dto);
  }

  signerProprietaire(id: number, dto: SignatureDTO) {
    return this.http.post<void>(`${this.API}/${id}/signer-proprio`, dto);
  }

  getByToken(token: string) {
    return this.http.get<ContratDTO>(`${this.API}/signer/${token}`);
  }

  signerParToken(token: string, dto: SignatureDTO) {
    return this.http.post<void>(`${this.API}/signer/${token}`, dto);
  }

  search(dto: ContratSearchDTO) {
    return this.http.post<ContratPageDTO>(`${this.API}/search`, dto);
  }
}
