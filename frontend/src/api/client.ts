import {
  AuthResponse,
  EnrichedShiftRow,
  House,
  Organization,
  Professional,
  ShiftPeriod,
  ShiftType,
  SummaryData,
  User
} from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')
).replace(/\/$/, '');

let currentAuthToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  currentAuthToken = token;
}

export function getApiAuthToken(): string | null {
  return currentAuthToken;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers ? (options.headers as Record<string, string>) : {})
    }
  });

  if (!response.ok) {
    let errorMessage = `Erro na comunicação com o servidor (HTTP ${response.status}).`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorMessage = errData.error;
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Autenticação por empresa (Login, Cadastro e Sessão)
  getMe(): Promise<{ organization: Organization | null; user: User | null }> {
    return request<{ organization: Organization | null; user: User | null }>('/auth/me');
  },

  login(data: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  registerCompany(data: {
    organizationName: string;
    document?: string;
    plan?: string;
    userName: string;
    email: string;
    password: string;
    seedSampleData?: boolean;
  }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  logout(): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST'
    });
  },

  // Resumo da semana e do dia (isolado pela sessão da empresa logada)
  getSummary(params: { startDate: string; endDate: string; date: string }): Promise<SummaryData> {
    const qs = new URLSearchParams(params).toString();
    return request<SummaryData>(`/summary?${qs}`);
  },

  resetDemoData(): Promise<{ message: string }> {
    return request<{ message: string }>('/summary/reset-demo', { method: 'POST' });
  },

  clearCompanyData(scope: 'all' | 'shifts_only' = 'all'): Promise<{ message: string }> {
    return request<{ message: string }>(`/summary/clear-company-data?scope=${scope}`, {
      method: 'DELETE'
    });
  },

  // Casas / Clientes da empresa logada
  getHouses(): Promise<House[]> {
    return request<House[]>('/houses');
  },

  createHouse(data: {
    name: string;
    assisted_person: string;
    neighborhood: string;
    address: string;
    notes?: string;
    active?: number;
  }): Promise<House> {
    return request<House>('/houses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateHouse(
    id: number,
    data: {
      name: string;
      assisted_person: string;
      neighborhood: string;
      address: string;
      notes?: string;
      active?: number;
    }
  ): Promise<House> {
    return request<House>(`/houses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteHouse(id: number): Promise<{ message: string; id: number }> {
    return request<{ message: string; id: number }>(`/houses/${id}`, {
      method: 'DELETE'
    });
  },

  // Profissionais / Equipe da empresa logada
  getProfessionals(): Promise<Professional[]> {
    return request<Professional[]>('/professionals');
  },

  createProfessional(data: {
    name: string;
    role: string;
    phone?: string;
    avatar_color?: string;
    active?: number;
  }): Promise<Professional> {
    return request<Professional>('/professionals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateProfessional(
    id: number,
    data: {
      name: string;
      role: string;
      phone?: string;
      avatar_color?: string;
      active?: number;
    }
  ): Promise<Professional> {
    return request<Professional>(`/professionals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteProfessional(id: number): Promise<{ message: string; id: number }> {
    return request<{ message: string; id: number }>(`/professionals/${id}`, {
      method: 'DELETE'
    });
  },

  // Plantões / Escalas da empresa logada
  getShifts(params: {
    date?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    onlyPending?: boolean;
    visualState?: string;
    includeUnscheduledHouses?: boolean;
  }): Promise<EnrichedShiftRow[]> {
    const qs = new URLSearchParams();
    if (params.date) qs.set('date', params.date);
    if (params.startDate) qs.set('startDate', params.startDate);
    if (params.endDate) qs.set('endDate', params.endDate);
    if (params.search) qs.set('search', params.search);
    if (params.onlyPending) qs.set('onlyPending', 'true');
    if (params.visualState && params.visualState !== 'all') {
      qs.set('visualState', params.visualState);
    }
    if (params.includeUnscheduledHouses !== undefined) {
      qs.set('includeUnscheduledHouses', String(params.includeUnscheduledHouses));
    }
    return request<EnrichedShiftRow[]>(`/shifts?${qs.toString()}`);
  },

  createShift(data: {
    house_id: number;
    professional_id: number | null;
    date: string;
    shift_period: ShiftPeriod;
    start_time: string;
    end_time: string;
    shift_type: ShiftType;
    notes?: string;
  }): Promise<EnrichedShiftRow> {
    return request<EnrichedShiftRow>('/shifts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateShift(
    id: number,
    data: {
      house_id: number;
      professional_id: number | null;
      date: string;
      shift_period: ShiftPeriod;
      start_time: string;
      end_time: string;
      shift_type: ShiftType;
      notes?: string;
    }
  ): Promise<EnrichedShiftRow> {
    return request<EnrichedShiftRow>(`/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteShift(id: number): Promise<{ message: string; id: number }> {
    return request<{ message: string; id: number }>(`/shifts/${id}`, {
      method: 'DELETE'
    });
  },

  importSpreadsheet(data: {
    singleDate?: string;
    saturdayDate?: string;
    sundayDate?: string;
    mondayDate?: string;
    tuesdayDate?: string;
    wednesdayDate?: string;
    thursdayDate?: string;
    fridayDate?: string;
    mode: 'merge' | 'replace_weekend';
    rows: {
      clientName: string;
      assistedPerson: string;
      fullAddress: string;
      horario: string;
      singleDayProf?: string;
      mondayProf?: string;
      tuesdayProf?: string;
      wednesdayProf?: string;
      thursdayProf?: string;
      fridayProf?: string;
      saturdayProf?: string;
      sundayProf?: string;
    }[];
  }): Promise<{
    message: string;
    stats: { housesCreated: number; professionalsCreated: number; shiftsCreated: number };
  }> {
    return request('/shifts/import-spreadsheet', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Checagens da empresa logada
  toggleCheck(data: {
    shift_id?: number | null;
    house_id: number;
    professional_id?: number | null;
    date: string;
    shift_period: ShiftPeriod;
    status?: 'pending' | 'done';
    notes?: string;
  }): Promise<unknown> {
    return request('/checks/toggle', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
