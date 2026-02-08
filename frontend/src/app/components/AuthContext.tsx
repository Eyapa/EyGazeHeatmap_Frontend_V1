import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';


interface User {
  email: string;
  name: string;
  id: number;
  role: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isCalibrated: boolean;
  isLoading: boolean;
  setIsCalibrated: (calibrated: boolean) => void;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeToken = (token: string) => {
  try {
    // A JWT has 3 parts separated by dots. The 2nd part [1] is the data.
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        try {
          // 1. Call a dedicated 'verify' or 'me' endpoint on your backend
          const response = await fetch(`${import.meta.env.VITE_API_URL}/verify-token`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            // 2. Token is still valid on backend
            const payload = decodeToken(token);
            setIsAuthenticated(true);
            setUser({
              id: payload.id,
              email: payload.sub,
              name: payload.sub.split('@')[0],
              role: payload.role
            });
          } else {
            // 3. Token expired or invalid
            logout(); 
          }
        } catch (error) {
          console.error("Auth initialization failed", error);
          logout();
        }
      }
      setIsLoading(false)
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
        localStorage.setItem('access_token', data.access_token);
        
        const payload = decodeToken(data.access_token);
        
        if (payload) {
          const userData = {
            id: payload.id,
            email: payload.sub,
            name: payload.sub.split('@')[0],
            role: payload.role,
          };

          setIsAuthenticated(true);
          setUser(userData);
          
          localStorage.setItem('auth_user', JSON.stringify(userData));
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Auth Error:", error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsCalibrated(false);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('isCalibrated');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isCalibrated, isLoading, setIsCalibrated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
