import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setOrganizations(data.organizations);
      
      // Set current org from localStorage or first org
      const savedOrgId = localStorage.getItem('currentOrgId');
      const org = data.organizations.find(o => o.id === savedOrgId) || data.organizations[0];
      if (org) {
        setCurrentOrg(org);
        localStorage.setItem('currentOrgId', org.id);
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentOrgId');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setOrganizations(data.organizations);
    
    if (data.organizations.length > 0) {
      setCurrentOrg(data.organizations[0]);
      localStorage.setItem('currentOrgId', data.organizations[0].id);
    }
    
    return data;
  };

  const register = async (email, password, name, orgName) => {
    const { data } = await api.post('/auth/register', { email, password, name, orgName });
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentOrgId', data.organization.id);
    setUser(data.user);
    setOrganizations([{ ...data.organization, role: 'admin' }]);
    setCurrentOrg({ ...data.organization, role: 'admin' });
    return data;
  };

  const joinOrg = async (email, password, name) => {
    const { data } = await api.post('/auth/join', { email, password, name });
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentOrgId', data.organization.id);
    setUser(data.user);
    const orgWithDept = { 
      ...data.organization, 
      department: data.department 
    };
    setOrganizations([orgWithDept]);
    setCurrentOrg(orgWithDept);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentOrgId');
    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
  };

  const switchOrg = (org) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrgId', org.id);
  };

  return (
    <AuthContext.Provider value={{
      user,
      organizations,
      currentOrg,
      loading,
      login,
      register,
      joinOrg,
      logout,
      switchOrg,
      isAdmin: currentOrg?.role === 'admin',
      isManager: ['admin', 'manager'].includes(currentOrg?.role),
      department: currentOrg?.department || null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
