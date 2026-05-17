export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  accessToken: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}
