interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  verse: string;
  color: string;
}

export function StatsCard({ title, value, icon, verse, color }: StatsCardProps) {
  return (
    <div className={`${color} rounded-lg p-3 text-center shadow-sm hover:shadow-md transition-shadow`}>
      <div className="text-2xl mb-1">{icon}</div>
      <h3 className="text-3xl font-bold text-gray-800">{value.toLocaleString()}</h3>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-xs text-gray-500 mt-1" title={`Versículo: ${verse}`}>
        {verse}
      </p>
    </div>
  );
}

