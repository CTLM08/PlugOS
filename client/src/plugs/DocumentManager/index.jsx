import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ConfirmModal from '../../components/ConfirmModal';
import CustomSelect from '../../components/CustomSelect';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

export default function DocumentManager() {
  const { currentOrg, isAdmin, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [permissionsFolder, setPermissionsFolder] = useState(null);
  const isManager = isAdmin;

  useEffect(() => {
    if (currentOrg) {
      fetchData();
    }
  }, [currentOrg, currentFolder]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = currentFolder ? `?folderId=${currentFolder.id}` : '';
      const [docsRes, foldersRes] = await Promise.all([
        api.get(`/documents/org/${currentOrg.id}${params}`),
        api.get(`/documents/org/${currentOrg.id}/folders`)
      ]);
      setDocuments(docsRes.data);
      setFolders(foldersRes.data);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e, type, item = null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, item });
  };

  const handleUpload = async (file, content) => {
    try {
      await api.post(`/documents/org/${currentOrg.id}`, {
        name: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: content,
        folderId: currentFolder?.id || null
      });
      setShowUploadModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to upload document:', error);
      alert(error.response?.data?.error || 'Failed to upload document');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { data } = await api.get(`/documents/${doc.id}/download`);
      const byteCharacters = atob(data.content.split(',')[1] || data.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.fileType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const canDeleteDocument = (doc) => isManager || doc.uploaded_by === user?.id;

  const confirmDeleteDocument = (doc) => {
    setConfirmModal({
      title: 'Delete Document',
      message: `Are you sure you want to delete "${doc.name}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/documents/${doc.id}`);
          fetchData();
          setConfirmModal(null);
        } catch (error) {
          alert(error.response?.data?.error || 'Failed to delete');
        }
      }
    });
  };

  const handleCreateFolder = async (name) => {
    try {
      await api.post(`/documents/org/${currentOrg.id}/folders`, {
        name,
        parentId: currentFolder?.id || null
      });
      setShowFolderModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const confirmDeleteFolder = (folder) => {
    setConfirmModal({
      title: 'Delete Folder',
      message: `Delete "${folder.name}"? Documents will move to parent folder.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/documents/folders/${folder.id}`);
          if (currentFolder?.id === folder.id) setCurrentFolder(null);
          fetchData();
          setConfirmModal(null);
        } catch (error) {
          console.error('Failed to delete folder:', error);
        }
      }
    });
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return 'mdi:file';
    if (fileType.includes('pdf')) return 'mdi:file-pdf-box';
    if (fileType.includes('image')) return 'mdi:file-image';
    if (fileType.includes('word')) return 'mdi:file-word';
    if (fileType.includes('excel')) return 'mdi:file-excel';
    return 'mdi:file';
  };

  const getFileIconColor = (fileType) => {
    if (!fileType) return 'text-gray-400';
    if (fileType.includes('pdf')) return 'text-red-400';
    if (fileType.includes('image')) return 'text-purple-400';
    if (fileType.includes('word')) return 'text-blue-400';
    if (fileType.includes('excel')) return 'text-green-400';
    return 'text-amber-400';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subfolders = folders.filter(f => 
    currentFolder ? f.parent_id === currentFolder.id : !f.parent_id
  );

  const getBreadcrumbs = () => {
    const crumbs = [];
    let folder = currentFolder;
    while (folder) {
      crumbs.unshift(folder);
      folder = folders.find(f => f.id === folder.parent_id);
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Icon icon="mdi:folder-multiple" className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Document Manager</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Organize and manage your organization's files</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Icon icon="mdi:folder-outline" className="w-5 h-5 text-amber-400" />
                Folders
              </h3>
              {isManager && (
                <button onClick={() => setShowFolderModal(true)} className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors" title="New Folder">
                  <Icon icon="mdi:folder-plus" className="w-5 h-5 text-amber-400" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setCurrentFolder(null)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${!currentFolder ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30' : 'hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'}`}
              >
                <Icon icon="mdi:folder-home" className="w-5 h-5" />
                All Documents
              </button>
              
              {/* Show subfolders in sidebar */}
              {folders.filter(f => !f.parent_id).map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${currentFolder?.id === folder.id ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/30' : 'hover:bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'}`}
                >
                  <Icon icon="mdi:folder" className="w-5 h-5" />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0" onContextMenu={(e) => { if (!e.target.closest('.item-card')) handleContextMenu(e, 'empty'); }}>
          {/* Content Header Card */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm mb-4">
              <button onClick={() => setCurrentFolder(null)} className="flex items-center gap-1 text-[var(--color-text-muted)] hover:text-amber-400 transition-colors">
                <Icon icon="mdi:home" className="w-4 h-4" />
                Home
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-2">
                  <Icon icon="mdi:chevron-right" className="w-4 h-4 text-[var(--color-text-muted)]" />
                  <button onClick={() => setCurrentFolder(crumb)} className={`transition-colors ${i === breadcrumbs.length - 1 ? 'text-amber-400 font-medium' : 'text-[var(--color-text-muted)] hover:text-amber-400'}`}>
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>

            {/* Title & Actions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-1">{currentFolder ? currentFolder.name : 'All Documents'}</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {subfolders.length > 0 && <span>{subfolders.length} folder{subfolders.length !== 1 ? 's' : ''}</span>}
                  {subfolders.length > 0 && filteredDocuments.length > 0 && <span> • </span>}
                  {filteredDocuments.length > 0 && <span>{filteredDocuments.length} file{filteredDocuments.length !== 1 ? 's' : ''}</span>}
                  {subfolders.length === 0 && filteredDocuments.length === 0 && <span>Empty folder</span>}
                </p>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Search */}
                <div className="relative">
                  <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-amber-500/50 w-44 transition-colors"
                  />
                </div>
                
                {/* View Toggle */}
                <div className="flex bg-[var(--color-bg-elevated)] rounded-lg p-1">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400' : 'text-[var(--color-text-muted)] hover:text-white'}`}>
                    <Icon icon="mdi:view-grid" className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-amber-500/20 text-amber-400' : 'text-[var(--color-text-muted)] hover:text-white'}`}>
                    <Icon icon="mdi:view-list" className="w-4 h-4" />
                  </button>
                </div>

                {/* Action Buttons */}
                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg shadow-lg shadow-amber-500/20 transition-all">
                  <Icon icon="mdi:cloud-upload" className="w-4 h-4" />
                  Upload
                </button>
                {isManager && (
                  <button onClick={() => setShowFolderModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-elevated)] hover:bg-amber-500/10 text-amber-400 font-medium rounded-lg border border-amber-500/30 transition-all">
                    <Icon icon="mdi:folder-plus" className="w-4 h-4" />
                    New Folder
                  </button>
                )}
                {isManager && (
                  <Link to="/documents/permissions" className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] hover:text-white font-medium rounded-lg border border-[var(--color-border)] transition-all">
                    <Icon icon="mdi:shield-account" className="w-4 h-4" />
                    Permissions
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Icon icon="mdi:loading" className="w-10 h-10 text-amber-500 animate-spin" />
                <p className="text-sm text-[var(--color-text-muted)]">Loading documents...</p>
              </div>
            </div>
          ) : subfolders.length === 0 && filteredDocuments.length === 0 ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-16 text-center">
              <div className="w-20 h-20 bg-[var(--color-bg-elevated)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Icon icon="mdi:folder-open-outline" className="w-10 h-10 text-[var(--color-text-muted)]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No files yet</h3>
              <p className="text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">Upload documents or create folders to organize your files</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg">
                  <Icon icon="mdi:cloud-upload" className="w-5 h-5" />
                  Upload File
                </button>
                {isManager && (
                  <button onClick={() => setShowFolderModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-bg-elevated)] text-amber-400 font-medium rounded-lg border border-amber-500/30">
                    <Icon icon="mdi:folder-plus" className="w-5 h-5" />
                    Create Folder
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subfolders */}
              {subfolders.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Icon icon="mdi:folder-multiple" className="w-4 h-4" />
                    Folders
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {subfolders.map(folder => (
                      <div
                        key={folder.id}
                        className="item-card bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer transition-all group"
                        onClick={() => setCurrentFolder(folder)}
                        onContextMenu={(e) => handleContextMenu(e, 'folder', folder)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Icon icon="mdi:folder" className="w-7 h-7 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate group-hover:text-amber-400 transition-colors">{folder.name}</h4>
                            <p className="text-xs text-[var(--color-text-muted)]">{folder.document_count || 0} files</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files */}
              {filteredDocuments.length > 0 && (
                <div>
                  {subfolders.length > 0 && (
                    <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Icon icon="mdi:file-multiple" className="w-4 h-4" />
                      Files
                    </h3>
                  )}
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredDocuments.map(doc => (
                        <div key={doc.id} className="item-card group bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all" onContextMenu={(e) => handleContextMenu(e, 'document', doc)}>
                          <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[var(--color-bg-elevated)] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                              <Icon icon={getFileIcon(doc.file_type)} className={`w-9 h-9 ${getFileIconColor(doc.file_type)}`} />
                            </div>
                            <h4 className="font-semibold text-sm truncate w-full mb-1">{doc.name}</h4>
                            <p className="text-xs text-[var(--color-text-muted)]">{formatFileSize(doc.file_size)}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">by {doc.uploaded_by_name || 'Unknown'}</p>
                          </div>
                          <div className="flex justify-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} className="p-2.5 bg-[var(--color-bg-elevated)] hover:bg-amber-500/20 rounded-lg transition-colors">
                              <Icon icon="mdi:download" className="w-4 h-4 text-amber-400" />
                            </button>
                            {canDeleteDocument(doc) && (
                              <button onClick={(e) => { e.stopPropagation(); confirmDeleteDocument(doc); }} className="p-2.5 bg-[var(--color-bg-elevated)] hover:bg-red-500/20 rounded-lg transition-colors">
                                <Icon icon="mdi:trash-can-outline" className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                            <th className="text-left px-5 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Name</th>
                            <th className="text-left px-5 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Size</th>
                            <th className="text-left px-5 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Uploaded By</th>
                            <th className="text-right px-5 py-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocuments.map(doc => (
                            <tr key={doc.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)] transition-colors" onContextMenu={(e) => handleContextMenu(e, 'document', doc)}>
                              <td className="px-5 py-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-[var(--color-bg-elevated)] rounded-lg flex items-center justify-center">
                                  <Icon icon={getFileIcon(doc.file_type)} className={`w-5 h-5 ${getFileIconColor(doc.file_type)}`} />
                                </div>
                                <span className="font-medium">{doc.name}</span>
                              </td>
                              <td className="px-5 py-4 text-sm text-[var(--color-text-muted)]">{formatFileSize(doc.file_size)}</td>
                              <td className="px-5 py-4 text-sm text-[var(--color-text-muted)]">{doc.uploaded_by_name || 'Unknown'}</td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => handleDownload(doc)} className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors"><Icon icon="mdi:download" className="w-4 h-4 text-amber-400" /></button>
                                  {canDeleteDocument(doc) && <button onClick={() => confirmDeleteDocument(doc)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"><Icon icon="mdi:trash-can-outline" className="w-4 h-4 text-red-400" /></button>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          item={contextMenu.item}
          isManager={isManager}
          canDelete={contextMenu.item ? canDeleteDocument(contextMenu.item) : false}
          onUpload={() => { setShowUploadModal(true); setContextMenu(null); }}
          onCreateFolder={() => { setShowFolderModal(true); setContextMenu(null); }}
          onDownload={() => { if (contextMenu.item) handleDownload(contextMenu.item); setContextMenu(null); }}
          onDelete={() => {
            if (contextMenu.type === 'document') confirmDeleteDocument(contextMenu.item);
            else if (contextMenu.type === 'folder') confirmDeleteFolder(contextMenu.item);
            setContextMenu(null);
          }}
          onOpen={() => { if (contextMenu.item) setCurrentFolder(contextMenu.item); setContextMenu(null); }}
          onManagePermissions={() => { if (contextMenu.item) setPermissionsFolder(contextMenu.item); setContextMenu(null); }}
        />
      )}

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onUpload={handleUpload} />}
      {showFolderModal && <FolderModal onClose={() => setShowFolderModal(false)} onCreate={handleCreateFolder} />}
      {confirmModal && <ConfirmModal title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onClose={() => setConfirmModal(null)} />}
      {permissionsFolder && <FolderPermissionsModal folder={permissionsFolder} orgId={currentOrg.id} onClose={() => setPermissionsFolder(null)} />}
    </div>
  );
}

function ContextMenu({ x, y, type, item, isManager, canDelete, onUpload, onCreateFolder, onDownload, onDelete, onOpen, onManagePermissions }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setPos({
        x: x + rect.width > window.innerWidth ? x - rect.width : x,
        y: y + rect.height > window.innerHeight ? y - rect.height : y
      });
    }
  }, [x, y]);

  return (
    <div ref={menuRef} className="fixed bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl py-2 min-w-[180px] z-50" style={{ left: pos.x, top: pos.y }} onClick={(e) => e.stopPropagation()}>
      {type === 'empty' && (
        <>
          <button onClick={onUpload} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] text-left">
            <Icon icon="mdi:upload" className="w-5 h-5 text-amber-400" /><span>Upload Document</span>
          </button>
          {isManager && (
            <button onClick={onCreateFolder} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] text-left">
              <Icon icon="mdi:folder-plus" className="w-5 h-5 text-amber-400" /><span>Create Folder</span>
            </button>
          )}
        </>
      )}
      {type === 'document' && (
        <>
          <button onClick={onDownload} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] text-left">
            <Icon icon="mdi:download" className="w-5 h-5 text-amber-400" /><span>Download</span>
          </button>
          {canDelete && (
            <button onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-400 text-left">
              <Icon icon="mdi:trash-can-outline" className="w-5 h-5" /><span>Delete</span>
            </button>
          )}
        </>
      )}
      {type === 'folder' && (
        <>
          <button onClick={onOpen} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] text-left">
            <Icon icon="mdi:folder-open" className="w-5 h-5 text-amber-400" /><span>Open</span>
          </button>
          {isManager && (
            <>
              <button onClick={onManagePermissions} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] text-left">
                <Icon icon="mdi:shield-account" className="w-5 h-5 text-amber-400" /><span>Manage Permissions</span>
              </button>
              <button onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-500/10 text-red-400 text-left">
                <Icon icon="mdi:trash-can-outline" className="w-5 h-5" /><span>Delete Folder</span>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function UploadModal({ onClose, onUpload }) {
  useBodyScrollLock();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
  const handleFile = (file) => { if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; } setSelectedFile(file); };
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => { await onUpload(selectedFile, e.target.result); setUploading(false); };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 animate-modal-slide-up shadow-2xl">
        <div className="flex justify-between mb-6">
          <h3 className="text-lg font-semibold">Upload Document</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white"><Icon icon="mdi:close" className="w-6 h-6" /></button>
        </div>
        <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${dragActive ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--color-border)]'}`}>
          <input ref={fileInputRef} type="file" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
          {selectedFile ? (
            <div><Icon icon="mdi:file-check" className="w-12 h-12 text-amber-400 mx-auto mb-3" /><p>{selectedFile.name}</p></div>
          ) : (
            <div><Icon icon="mdi:cloud-upload" className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" /><p>Drop file or click to browse</p></div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg">Cancel</button>
          <button onClick={handleUpload} disabled={!selectedFile || uploading} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FolderModal({ onClose, onCreate }) {
  useBodyScrollLock();
  const [name, setName] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); if (name.trim()) onCreate(name.trim()); };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-sm p-6 animate-modal-slide-up shadow-2xl">
        <div className="flex justify-between mb-6">
          <h3 className="text-lg font-semibold">New Folder</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white"><Icon icon="mdi:close" className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Folder name" className="w-full px-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg" autoFocus />
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-lg">Cancel</button>
            <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FolderPermissionsModal({ folder, orgId, onClose }) {
  useBodyScrollLock();
  const [permissions, setPermissions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addType, setAddType] = useState('department');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p, d, e] = await Promise.all([
        api.get(`/documents/folders/${folder.id}/permissions`),
        api.get(`/departments/org/${orgId}`),
        api.get(`/employees/org/${orgId}`)
      ]);
      setPermissions(p.data);
      setDepartments(d.data);
      setEmployees(e.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!selectedId) return;
    try {
      await api.post(`/documents/folders/${folder.id}/permissions`, addType === 'department' ? { departmentId: selectedId } : { userId: selectedId });
      fetchData();
      setSelectedId('');
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleRemove = async (id) => {
    try { await api.delete(`/documents/folders/${folder.id}/permissions/${id}`); fetchData(); } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-overlay">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 animate-modal-slide-up shadow-2xl">
        <div className="flex justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Folder Permissions</h3>
            <p className="text-sm text-[var(--color-text-muted)]">{folder.name}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white"><Icon icon="mdi:close" className="w-6 h-6" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Icon icon="mdi:loading" className="w-8 h-8 text-amber-500 animate-spin" /></div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Add Access</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => { setAddType('department'); setSelectedId(''); }} className={`px-3 py-1.5 text-sm rounded-lg ${addType === 'department' ? 'bg-amber-600 text-white' : 'bg-[var(--color-bg-elevated)]'}`}>Department</button>
                <button onClick={() => { setAddType('user'); setSelectedId(''); }} className={`px-3 py-1.5 text-sm rounded-lg ${addType === 'user' ? 'bg-amber-600 text-white' : 'bg-[var(--color-bg-elevated)]'}`}>Individual</button>
              </div>
              <div className="flex gap-2">
                <CustomSelect
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  placeholder={`Select ${addType === 'department' ? 'department' : 'employee'}...`}
                  options={[
                    { value: '', label: 'Select...' },
                    ...(addType === 'department' 
                      ? departments.map(d => ({ value: d.id, label: d.name }))
                      : employees.map(e => ({ value: e.user_id, label: e.name })))
                  ]}
                  className="flex-1"
                />
                <button onClick={handleAdd} disabled={!selectedId} className="px-4 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">Add</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Current Access</label>
              {permissions.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4 bg-[var(--color-bg-elevated)] rounded-lg">No restrictions - all can access</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {permissions.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-elevated)] rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon icon={p.department_id ? 'mdi:account-group' : 'mdi:account'} className="w-5 h-5 text-amber-400" />
                        <span className="text-sm">{p.department_name || p.user_name || 'Unknown'}</span>
                      </div>
                      <button onClick={() => handleRemove(p.id)} className="p-1 hover:bg-red-500/20 rounded"><Icon icon="mdi:close" className="w-4 h-4 text-red-400" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-[var(--color-bg-elevated)] rounded-lg">Close</button>
        </div>
      </div>
    </div>
  );
}
