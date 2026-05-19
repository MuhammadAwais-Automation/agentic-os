'use client'

import EmptyState from '@/components/ui/EmptyState'
import GlowCard from '@/components/ui/GlowCard'
import PageFrame from '@/components/ui/PageFrame'
import PageHeader from '@/components/ui/PageHeader'
import StatusPill from '@/components/ui/StatusPill'

export default function ApprovalsPage() {
  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="HUMAN OVERSIGHT"
        title="APPROVALS"
        subtitle="Review pending agent decisions, risky commands, and local file-change checkpoints."
      />

      <div className="auto-grid">
        <GlowCard color="teal" style={{ padding: '16px' }}>
          <div className="section-label">PENDING</div>
          <div style={valueStyle}>0</div>
          <StatusPill label="clear" tone="success" />
        </GlowCard>
        <GlowCard color="amber" style={{ padding: '16px' }}>
          <div className="section-label">RISK QUEUE</div>
          <div style={valueStyle}>0</div>
          <StatusPill label="none" tone="neutral" />
        </GlowCard>
        <GlowCard color="purple" style={{ padding: '16px' }}>
          <div className="section-label">FILE CHECKPOINTS</div>
          <div style={valueStyle}>0</div>
          <StatusPill label="waiting" tone="discovery" />
        </GlowCard>
      </div>

      <GlowCard color="amber" style={{ padding: '18px' }}>
        <EmptyState
          title="No pending approvals"
          detail="Approval items will appear here when agent runs emit structured safety events."
        />
      </GlowCard>
    </PageFrame>
  )
}

const valueStyle: React.CSSProperties = {
  marginTop: '10px',
  marginBottom: '10px',
  fontFamily: 'var(--font-display)',
  fontSize: '40px',
  color: 'var(--text-strong)',
}
