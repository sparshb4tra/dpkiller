import React from 'react';

interface PolicyViewProps {
  policyKey: string;
  onBack: () => void;
}

const content: Record<string, { title: string; body: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "We do not require accounts. Your room content stays in your browser (localStorage) by default.",
      "When you use AI, the prompt and current note context are sent to the AI provider only to generate a response.",
      "Anyone with the room URL can view and edit that room. Share links carefully."
    ]
  },
  cookie: {
    title: "Cookie Policy",
    body: [
      "We do not use tracking cookies.",
      "Your browser may persist localStorage data (content, theme preference) to improve your experience.",
      "Clearing site data in your browser will remove locally stored rooms on that device."
    ]
  },
  content: {
    title: "Content Policy",
    body: [
      "Do not paste illegal, harmful, or infringing content.",
      "Do not share private data without consent; room links are simple to access by design.",
      "Use AI responsibly; review outputs before relying on them for critical decisions."
    ]
  }
};

const PolicyView: React.FC<PolicyViewProps> = ({ policyKey, onBack }) => {
  const policy = content[policyKey] || content['privacy'];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[var(--bg-page)] px-6 py-12 text-center">
      <div className="max-w-2xl w-full space-y-6">
        <button
          onClick={onBack}
          className="text-sm font-bold text-[var(--accent)] hover:opacity-80"
        >
          ← Back
        </button>
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl tracking-tight helvetica-bold text-[var(--text-primary)]">{policy.title}</h1>
          <p className="text-[var(--text-secondary)]">noteai — simple, no-login, URL-based collaboration.</p>
        </div>
        <div className="bg-white dark:bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-2xl shadow-sm p-6 text-left space-y-4">
          {policy.body.map((p, idx) => (
            <p key={idx} className="text-[var(--text-primary)] leading-relaxed">{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PolicyView;

