import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PasswordChangeModal from './PasswordChangeModal';
import notificationService from '../utils/notifications';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function Layout({ children }) {
  const { user, currentOrg, logout, isAdmin } = useAuth();
  const [enabledPlugs, setEnabledPlugs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    const saved = localStorage.getItem('collapsed-categories');
    return saved ? JSON.parse(saved) : [];
  });
  const [contextMenu, setContextMenu] = useState(null);
  const [categoryMenu, setCategoryMenu] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showPlugAssignModal, setShowPlugAssignModal] = useState(null);
  const [draggedPlug, setDraggedPlug] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const prevUnreadRef = useRef(0);
  const location = useLocation();

  // Lock scroll when modals are open
  useBodyScrollLock(showLogoutModal || showCategoryModal || showPlugAssignModal);

  useEffect(() => {
    if (currentOrg) {
      fetchCategoriesAndPlugs();
      fetchUnreadCount();
      notificationService.requestPermission();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentOrg]);

  useEffect(() => {
    localStorage.setItem('collapsed-categories', JSON.stringify(collapsedCategories));
  }, [collapsedCategories]);

  useEffect(() => {
    const handleClick = () => { setContextMenu(null); setCategoryMenu(null); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchCategoriesAndPlugs = async () => {
    try {
      const [catRes, plugRes] = await Promise.all([
        api.get(`/categories/org/${currentOrg.id}`),
        api.get(`/plugs/org/${currentOrg.id}`)
      ]);
      setCategories(catRes.data);
      setEnabledPlugs(plugRes.data);
    } catch (error) {
      console.error('Failed to fetch categories/plugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (name, icon, color) => {
    try {
      await api.post(`/categories/org/${currentOrg.id}`, { name, icon, color });
      fetchCategoriesAndPlugs();
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async (id, name, icon, color) => {
    try {
      await api.put(`/categories/org/${currentOrg.id}/${id}`, { name, icon, color });
      fetchCategoriesAndPlugs();
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await api.delete(`/categories/org/${currentOrg.id}/${id}`);
      fetchCategoriesAndPlugs();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleAssignPlugToCategory = async (plugId, categoryId) => {
    try {
      await api.put(`/categories/org/${currentOrg.id}/plug/${plugId}/category`, { categoryId });
      fetchCategoriesAndPlugs();
      setShowPlugAssignModal(null);
    } catch (error) {
      console.error('Failed to assign plug:', error);
    }
  };

  const toggleCategoryCollapse = (catId) => {
    setCollapsedCategories(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e, plug) => {
    if (!isAdmin) return;
    setDraggedPlug(plug);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', plug.id);
    // Add a slight delay to allow the drag image to be set
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedPlug(null);
    setDragOverCategory(null);
  };

  const handleDragOver = (e, categoryId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategory !== categoryId) {
      setDragOverCategory(categoryId);
    }
  };

  const handleDragLeave = (e) => {
    // Only reset if leaving the category container entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverCategory(null);
    }
  };

  const handleDrop = async (e, categoryId) => {
    e.preventDefault();
    setDragOverCategory(null);
    if (!draggedPlug || !isAdmin) return;
    
    // Only update if category changed
    if (draggedPlug.category_id !== categoryId) {
      await handleAssignPlugToCategory(draggedPlug.id, categoryId);
    }
    setDraggedPlug(null);
  };

  const getPlugsByCategory = () => {
    const categorized = {};
    const uncategorized = [];
    
    enabledPlugs.forEach(plug => {
      if (plug.category_id) {
        if (!categorized[plug.category_id]) categorized[plug.category_id] = [];
        categorized[plug.category_id].push(plug);
      } else {
        uncategorized.push(plug);
      }
    });
    
    return { categorized, uncategorized };
  };

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get(`/notifications/org/${currentOrg.id}/unread-count`);
      const newCount = data.count;
      
      // Show browser notification if new notifications arrived
      if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0) {
        const newNotifs = newCount - prevUnreadRef.current;
        notificationService.show('New Notification', {
          body: `You have ${newNotifs} new notification${newNotifs > 1 ? 's' : ''}`,
          link: '/notifications',
          tag: 'plugos-notification', // Prevents duplicate notifications
        });
      }
      
      prevUnreadRef.current = newCount;
      setUnreadNotifications(newCount);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const getPlugIcon = (icon) => {
    // Use the icon from database directly, or fallback to puzzle icon
    return icon || 'mdi:puzzle';
  };

  const getPlugRoute = (slug) => {
    const routes = {
      'employee-directory': '/employees',
      'attendance-tracker': '/attendance',
      'payroll-manager': '/payroll',
      'document-manager': '/documents',
      'education-manager': '/education',
      'task-manager': '/tasks'
    };
    return routes[slug] || '/dashboard';
  };

  const isActiveRoute = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] flex">
      {/* Left Sidebar Taskbar */}
      <aside className="w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex flex-col fixed h-full z-20 overflow-hidden">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[var(--color-border)]">
          <Link to="/dashboard" className="flex items-center">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="mdi:puzzle" className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold ml-3 whitespace-nowrap">
              Plug<span className="text-indigo-500">OS</span>
            </h1>
          </Link>
        </div>

        {/* Organization Name */}
        {currentOrg && (
          <div className="px-4 py-3 border-b border-[var(--color-border)] overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--color-bg-elevated)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:office-building" className="w-4 h-4 text-[var(--color-text-muted)]" />
              </div>
              <div className="whitespace-nowrap">
                <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Organization</span>
                <p className="text-sm font-medium">{currentOrg.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Link */}
        <div className="px-2 pt-4">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all group/item ${
              isActiveRoute('/dashboard')
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)]'
            }`}
            title="Dashboard"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              isActiveRoute('/dashboard') ? 'bg-indigo-500/30' : 'bg-[var(--color-bg-elevated)] group-hover/item:bg-indigo-500/20'
            }`}>
              <Icon icon="mdi:view-dashboard" className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium whitespace-nowrap">Dashboard</span>
          </Link>
        </div>

        {/* Plugs Section with Categories */}
        <div 
          className="flex-1 overflow-y-auto py-4 scrollbar-hide" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onContextMenu={(e) => {
            if (isAdmin) {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }
          }}
        >
          <div className="px-4 mb-3 overflow-hidden">
            <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] whitespace-nowrap">Enabled Plugs</span>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <Icon icon="mdi:loading" className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
          ) : enabledPlugs.length > 0 ? (
            <nav className="space-y-2 px-2">
              {/* Render categories with their plugs */}
              {(() => {
                const { categorized, uncategorized } = getPlugsByCategory();
                return (
                  <>
                    {categories.map((cat) => {
                      const catPlugs = categorized[cat.id] || [];
                      const isCollapsed = collapsedCategories.includes(cat.id);
                      const isDragOver = dragOverCategory === cat.id;
                      return (
                        <div 
                          key={cat.id}
                          onDragOver={(e) => handleDragOver(e, cat.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, cat.id)}
                          className={`transition-all duration-200 ${isDragOver ? 'bg-indigo-500/10 rounded-lg' : ''}`}
                        >
                          <div className="flex items-center justify-between px-2 py-1.5 group/cat">
                            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">
                              {cat.name}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategoryMenu({ id: cat.id, x: e.clientX, y: e.clientY, category: cat });
                                }}
                                className="opacity-0 group-hover/cat:opacity-100 p-1 hover:bg-[var(--color-bg-dark)] rounded transition-opacity"
                              >
                                <Icon icon="mdi:dots-vertical" className="w-4 h-4 text-[var(--color-text-muted)]" />
                              </button>
                            )}
                          </div>
                          {/* Category Plugs */}
                          <div className="space-y-1">
                              {catPlugs.map((plug) => {
                                const route = getPlugRoute(plug.slug);
                                const isActive = isActiveRoute(route);
                                return (
                                  <Link
                                    key={plug.id}
                                    to={route}
                                    draggable={isAdmin}
                                    onDragStart={(e) => handleDragStart(e, plug)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all group/item ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} ${
                                      isActive
                                        ? 'bg-indigo-500/20 text-indigo-400'
                                        : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)]'
                                    }`}
                                    title={plug.name}
                                  >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                      isActive ? 'bg-indigo-500/30' : 'bg-indigo-500/10 group-hover/item:bg-indigo-500/20'
                                    }`}>
                                      <Icon icon={getPlugIcon(plug.icon)} className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm whitespace-nowrap">{plug.name}</span>
                                  </Link>
                                );
                              })}
                            </div>
                        </div>
                      );
                    })}
                    {/* Uncategorized Plugs */}
                    {(() => {
                      const isDragOverUncategorized = dragOverCategory === 'uncategorized';
                      const showUncategorizedDropZone = draggedPlug && draggedPlug.category_id !== null;
                      return (
                        <div 
                          className={`space-y-1 transition-all duration-200 ${showUncategorizedDropZone ? 'min-h-[40px]' : ''} ${isDragOverUncategorized ? 'bg-amber-500/10 rounded-lg' : ''}`}
                          onDragOver={(e) => handleDragOver(e, 'uncategorized')}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, null)}
                        >
                          {uncategorized.map((plug) => {
                            const route = getPlugRoute(plug.slug);
                            const isActive = isActiveRoute(route);
                            return (
                              <Link
                                key={plug.id}
                                to={route}
                                draggable={isAdmin}
                                onDragStart={(e) => handleDragStart(e, plug)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all group/item ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} ${
                                  isActive
                                    ? 'bg-indigo-500/20 text-indigo-400'
                                    : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)]'
                                }`}
                                title={plug.name}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isActive ? 'bg-indigo-500/30' : 'bg-indigo-500/10 group-hover/item:bg-indigo-500/20'
                                }`}>
                                  <Icon icon={getPlugIcon(plug.icon)} className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium whitespace-nowrap">{plug.name}</span>
                              </Link>
                            );
                          })}
                          {showUncategorizedDropZone && uncategorized.length === 0 && (
                            <div className="px-2 py-3 text-xs text-center text-[var(--color-text-muted)]">
                              Drop here to uncategorize
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </nav>
          ) : (
            <div className="px-2 text-center py-4">
              <div className="w-8 h-8 bg-[var(--color-bg-elevated)] rounded-lg flex items-center justify-center mx-auto">
                <Icon icon="mdi:puzzle-outline" className="w-4 h-4 text-[var(--color-text-muted)]" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 whitespace-nowrap">No plugs enabled</p>
            </div>
          )}
        </div>

        {/* Notifications Link */}
        <div className="p-2 border-t border-[var(--color-border)]">
          <Link
            to="/notifications"
            className={`flex items-center gap-3 w-full py-2.5 px-2 rounded-lg text-sm transition-all ${
              isActiveRoute('/notifications')
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)]'
            }`}
            title="Notifications"
          >
            <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              isActiveRoute('/notifications') ? 'bg-indigo-500/30' : 'bg-[var(--color-bg-elevated)]'
            }`}>
              <Icon icon="mdi:bell" className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1 animate-pulse">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </div>
            <span className="whitespace-nowrap">
              Notifications
              {unreadNotifications > 0 && (
                <span className="ml-2 text-xs text-red-400">({unreadNotifications})</span>
              )}
            </span>
          </Link>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="p-2 border-t border-[var(--color-border)] space-y-1">
            <Link
              to="/plugs"
              className={`flex items-center gap-3 w-full py-2.5 px-2 rounded-lg font-medium text-sm transition-all ${
                isActiveRoute('/plugs')
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
              title="Manage Plugs"
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:puzzle-plus" className="w-5 h-5" />
              </div>
              <span className="whitespace-nowrap">Manage Plugs</span>
            </Link>
            <Link
              to="/settings"
              className={`flex items-center gap-3 w-full py-2.5 px-2 rounded-lg text-sm transition-all ${
                isActiveRoute('/settings')
                  ? 'bg-[var(--color-bg-elevated)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)]'
              }`}
              title="Plug Access"
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                <Icon icon="mdi:shield-key" className="w-5 h-5" />
              </div>
              <span className="whitespace-nowrap">Plug Access</span>
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64">
        {/* Top Navigation */}
        <nav className="bg-[var(--color-bg-card)] border-b border-[var(--color-border)] sticky top-0 z-10">
          <div className="px-6 lg:px-8">
            <div className="flex justify-end h-16 items-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)]">
                  <Icon icon="mdi:account-circle" className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm">{user?.name}</span>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-elevated)] transition-all"
                  title="Change Password"
                >
                  <Icon icon="mdi:lock" className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition-all"
                >
                  <Icon icon="mdi:logout" className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main key={location.pathname} className="px-6 lg:px-8 py-8 animate-page">
          {children}
        </main>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <PasswordChangeModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 w-full max-w-sm shadow-2xl animate-modal-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Icon icon="mdi:logout" className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Logout</h3>
                <p className="text-sm text-[var(--color-text-muted)]">End your session</p>
              </div>
            </div>
            
            <p className="text-[var(--color-text-muted)] mb-6">
              Are you sure you want to logout? You will need to sign in again to access your workspace.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-dark)] text-white border border-[var(--color-border)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl py-2 min-w-[180px] z-[100] animate-scaleIn"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setShowCategoryModal(true); setContextMenu(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-elevated)] text-left text-sm"
          >
            <Icon icon="mdi:folder-plus" className="w-5 h-5 text-indigo-400" />
            <span>Create Category</span>
          </button>
        </div>
      )}

      {/* Category Three-dot Menu */}
      {categoryMenu && (
        <div 
          className="fixed bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl py-2 min-w-[180px] z-[100] animate-scaleIn"
          style={{ top: categoryMenu.y, left: categoryMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setShowPlugAssignModal(categoryMenu.category); setCategoryMenu(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-elevated)] text-left text-sm"
          >
            <Icon icon="mdi:puzzle-plus" className="w-5 h-5 text-green-400" />
            <span>Add Plug</span>
          </button>
          <button
            onClick={() => { setEditingCategory(categoryMenu.category); setShowCategoryModal(true); setCategoryMenu(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-bg-elevated)] text-left text-sm"
          >
            <Icon icon="mdi:pencil" className="w-5 h-5 text-amber-400" />
            <span>Edit Category</span>
          </button>
          <button
            onClick={() => { handleDeleteCategory(categoryMenu.id); setCategoryMenu(null); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 text-red-400 text-left text-sm"
          >
            <Icon icon="mdi:delete" className="w-5 h-5" />
            <span>Delete Category</span>
          </button>
        </div>
      )}

      {/* Create/Edit Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
          onSave={(name, icon, color) => {
            if (editingCategory) {
              handleUpdateCategory(editingCategory.id, name, icon, color);
            } else {
              handleCreateCategory(name, icon, color);
            }
          }}
        />
      )}

      {/* Plug Assignment Modal */}
      {showPlugAssignModal && (
        <PlugAssignModal
          category={showPlugAssignModal}
          plugs={enabledPlugs}
          onClose={() => setShowPlugAssignModal(null)}
          onAssign={(plugId) => handleAssignPlugToCategory(plugId, showPlugAssignModal.id)}
          onRemove={(plugId) => handleAssignPlugToCategory(plugId, null)}
        />
      )}
    </div>
  );
}

// Category Create/Edit Modal Component
function CategoryModal({ category, onClose, onSave }) {
  const [name, setName] = useState(category?.name || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-modal-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{category ? 'Edit Category' : 'Create Category'}</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., HR MANAGE"
              className="w-full px-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {category ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Plug Assignment Modal Component
function PlugAssignModal({ category, plugs, onClose, onAssign, onRemove }) {
  const assignedPlugs = plugs.filter(p => p.category_id === category.id);
  const unassignedPlugs = plugs.filter(p => !p.category_id);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-modal-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Icon icon={category.icon} className="w-6 h-6" style={{ color: category.color }} />
            <h3 className="text-lg font-bold">{category.name}</h3>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white">
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Currently in category */}
        {assignedPlugs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">In this category</h4>
            <div className="space-y-2">
              {assignedPlugs.map((plug) => (
                <div key={plug.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-elevated)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon icon={plug.icon || 'mdi:puzzle'} className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm">{plug.name}</span>
                  </div>
                  <button
                    onClick={() => onRemove(plug.id)}
                    className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                  >
                    <Icon icon="mdi:close" className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available to add */}
        {unassignedPlugs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Available plugs</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {unassignedPlugs.map((plug) => (
                <div key={plug.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-elevated)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon icon={plug.icon || 'mdi:puzzle'} className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="text-sm">{plug.name}</span>
                  </div>
                  <button
                    onClick={() => onAssign(plug.id)}
                    className="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition-colors"
                  >
                    <Icon icon="mdi:plus" className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {unassignedPlugs.length === 0 && assignedPlugs.length === 0 && (
          <p className="text-center text-[var(--color-text-muted)] py-8">No plugs enabled</p>
        )}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-dark)] text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

