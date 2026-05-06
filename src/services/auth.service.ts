import api from '@/lib/api';
import { AuthResponse, ForgotPasswordRequestResponse, ForgotPasswordVerifyResponse, ProfileOverview, ResetPasswordResponse, User } from '@/types';
import { clearAuthCookies, getCookie, setAuthTokens } from '@/lib/cookies';

export const authService = {
  async register(data: any): Promise<User> {
    const response = await api.post('/auth/register/', data);
    return response.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login/', data);

    // Extract tokens from response
    const accessToken = response.data.access_token || response.data.access;
    const refreshToken = response.data.refresh_token || response.data.refresh;

    if (accessToken) {
      // Store in secure cookies
      setAuthTokens(accessToken, refreshToken);

      // Keep localStorage as fallback during migration
      localStorage.setItem('token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }

    return response.data;
  },

  async logout() {
    try {
      // Get refresh token for backend logout
      const refreshToken = getCookie('refresh_token') || localStorage.getItem('refreshToken');

      if (refreshToken) {
        // Call backend logout endpoint to blacklist the token
        await api.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with client-side cleanup even if backend fails
    } finally {
      // Clear all auth data from client
      clearAuthCookies();
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  },

  async getCurrentUser() {
    const response = await api.get<User>('/auth/me/');
    return response.data;
  },

  async getProfileOverview() {
    const response = await api.get<ProfileOverview>('/auth/profile/overview/');
    return response.data;
  },

  async refreshToken() {
    const refreshToken = getCookie('refresh_token') || localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh/', { refresh: refreshToken });
    const newAccessToken = response.data.access || response.data.access_token;

    if (newAccessToken) {
      setAuthTokens(newAccessToken, refreshToken);
      localStorage.setItem('token', newAccessToken);
    }

    return response.data;
  },

  async updateProfile(data: { full_name?: string; avatar_url?: string; preferred_llm?: string }) {
    const response = await api.put<User>('/auth/profile/update/', data);
    return response.data;
  },

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<User>('/auth/avatar/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async changePassword(data: { old_password: string; new_password: string; new_password_confirm: string }) {
    const response = await api.post('/auth/password/change/', data);
    return response.data;
  },

  async requestPasswordReset(email: string) {
    const response = await api.post<ForgotPasswordRequestResponse>('/auth/password/forgot/', { email });
    return response.data;
  },

  async verifyPasswordResetOtp(email: string, otp: string) {
    const response = await api.post<ForgotPasswordVerifyResponse>('/auth/password/forgot/verify/', { email, otp });
    return response.data;
  },

  async resetPassword(resetToken: string, new_password: string, new_password_confirm: string) {
    const response = await api.post<ResetPasswordResponse>('/auth/password/forgot/reset/', {
      reset_token: resetToken,
      new_password,
      new_password_confirm,
    });
    return response.data;
  }
};
