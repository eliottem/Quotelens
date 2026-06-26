import { useNavigate } from 'react-router-dom';
import Icon from '@/components/Icon';
import { useStore } from '@/lib/store';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, suppliers, scenarios } = useStore();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em' }}>Projects</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
            {projects.length === 0 ? 'No projects yet' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <button className="ql-btn ql-btn-mint" onClick={() => navigate('/onboarding')}>
          <Icon name="plus" size={13}/> New project
        </button>
      </div>

      <div className="ql-scroll" style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {projects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--cobalt-soft-2)', display: 'grid', placeItems: 'center' }}>
              <Icon name="builder" size={24}/>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 6 }}>Create your first project</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 340, lineHeight: 1.6 }}>
                A project groups suppliers, quotes, and cost scenarios for a single product or collection.
              </div>
            </div>
            <button className="ql-btn ql-btn-mint" onClick={() => navigate('/onboarding')}>
              <Icon name="plus" size={13}/> Create project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {projects.map(project => {
              const projectSuppliers = suppliers.filter(s => s.projectIds.includes(project.id));
              const projectScenarios = scenarios.filter(sc => sc.projectId === project.id);
              return (
                <div
                  key={project.id}
                  className="ql-card"
                  style={{ padding: 22, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: project.color }}/>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: project.color, color: '#131623', display: 'grid', placeItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {project.code}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{project.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
                        {project.industry} · {project.stages.length} stages
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    {[
                      { label: 'SUPPLIERS', value: projectSuppliers.length },
                      { label: 'SCENARIOS', value: projectScenarios.length },
                      { label: 'STAGES', value: project.stages.length },
                    ].map(m => (
                      <div key={m.label}>
                        <div style={{ fontSize: 10, color: 'var(--text-4)', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>{m.label}</div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 500 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div
              className="ql-card"
              style={{ padding: 22, cursor: 'pointer', border: '1px dashed var(--border)', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 160 }}
              onClick={() => navigate('/onboarding')}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--cobalt-soft-2)', display: 'grid', placeItems: 'center' }}>
                <Icon name="plus" size={18}/>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>New project</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
