import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Lynx } from './Lynx';
import Icon from './Icon';
import { useStore } from '@/lib/store';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects } = useStore();

  const currentProject = projectId ? projects.find(p => p.id === projectId) : null;
  const path = location.pathname;

  const isActive = (href: string) => path === href || path.startsWith(href + '/');

  const projectNav = currentProject
    ? [
        { label: 'Overview', icon: 'dashboard', href: `/projects/${currentProject.id}` },
        { label: 'Suppliers', icon: 'suppliers', href: `/projects/${currentProject.id}/suppliers` },
        { label: 'Cost Builder', icon: 'builder', href: `/projects/${currentProject.id}/builder` },
        { label: 'Scenarios', icon: 'scenarios', href: `/projects/${currentProject.id}/scenarios` },
      ]
    : [];

  const workspaceNav = [
    { label: 'Projects', icon: 'dashboard', href: '/projects' },
    { label: 'Supplier Network', icon: 'suppliers', href: '/network/suppliers' },
  ];

  return (
    <div className="ql-sidebar">
      <div className="ql-logo">
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--bg-tint)', border: '1px solid var(--border-strong)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Lynx size={20}/>
        </div>
        <span className="mono">quotelens</span>
      </div>

      {currentProject && (
        <>
          <div style={{ padding: '0 6px 8px', fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>PROJECT</div>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => navigate('/projects')}
            >
              <div style={{ width: 18, height: 18, borderRadius: 5, background: currentProject.color, flexShrink: 0 }}/>
              <div style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{currentProject.name}</div>
              <Icon name="chevron-down" size={12}/>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 20 }}>
            {projectNav.map(item => (
              <div
                key={item.href}
                className={`ql-nav-item ${isActive(item.href) && path !== '/projects' ? 'active' : ''}`}
                onClick={() => navigate(item.href)}
              >
                <span className="dot"><Icon name={item.icon} size={14}/></span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '0 6px 16px' }}/>
        </>
      )}

      <div style={{ padding: '0 6px 8px', fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>WORKSPACE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {workspaceNav.map(item => (
          <div
            key={item.href}
            className={`ql-nav-item ${isActive(item.href) && !currentProject ? 'active' : ''}`}
            onClick={() => navigate(item.href)}
          >
            <span className="dot"><Icon name={item.icon} size={14}/></span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, fontSize: 11.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', marginBottom: 6 }}>
          <Icon name="sparkle" size={11}/>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.05em' }}>PARSING CREDITS</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="mono" style={{ color: 'var(--text)' }}>200</span>
          <span className="mono" style={{ color: 'var(--text-4)' }}>/ 200</span>
        </div>
        <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '100%', background: 'var(--cobalt)' }}/>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--cobalt-soft)', color: 'var(--cobalt)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600 }}>
          EE
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Eliott</div>
          <div style={{ fontSize: 11, color: 'var(--text-4)' }}>Admin</div>
        </div>
        <span style={{ color: 'var(--text-4)', cursor: 'pointer' }}><Icon name="settings" size={14}/></span>
      </div>
    </div>
  );
}
