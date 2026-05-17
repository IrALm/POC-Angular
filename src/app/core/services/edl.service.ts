import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { EtatDesLieuxDTO, EtatDesLieuxFormDTO, EdlPageDTO, EdlSearchDTO } from '../models/edl.models';
import { SignatureDTO } from '../models/contrat.models';

@Injectable({ providedIn: 'root' })
export class EdlService {
  private readonly API = `${environment.apiUrl}/etats-des-lieux`;

  constructor(private http: HttpClient) {}

  create(dto: EtatDesLieuxFormDTO) {
    return this.http.post<void>(this.API, dto);
  }

  signerProprietaire(id: number, dto: SignatureDTO) {
    return this.http.post<void>(`${this.API}/${id}/signer-proprietaire`, dto);
  }

  getByToken(token: string) {
    return this.http.get<EtatDesLieuxDTO>(`${this.API}/signer/${token}`);
  }

  signerParToken(token: string, dto: SignatureDTO) {
    return this.http.post<void>(`${this.API}/signer/${token}`, dto);
  }

  search(dto: EdlSearchDTO) {
    return this.http.post<EdlPageDTO>(`${this.API}/search`, dto);
  }
}
