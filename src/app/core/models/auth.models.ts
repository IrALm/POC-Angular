export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  accessToken: string;
  requiresRoleSelection: boolean;
}

export interface GoogleLoginDTO {
  idToken: string;
}

export interface CompleteGoogleProfileDTO {
  role: 'ROLE_PROPRIETAIRE' | 'ROLE_LOCATAIRE';
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}
