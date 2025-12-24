interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}

export default function FeatureCard({ icon, title, description, features }: FeatureCardProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-zinc-800 rounded-2xl p-8 hover:border-emerald-500/30 transition-all">
      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-emerald-500">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 mb-6">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
