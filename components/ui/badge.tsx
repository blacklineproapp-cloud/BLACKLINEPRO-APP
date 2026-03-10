import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
    'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black'

  const variants = {
    // Primário — indigo sólido
    default:
      'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 ' +
      'hover:bg-indigo-500/20 focus:ring-indigo-500',

    // Secundário — superfície neutra
    secondary:
      'bg-zinc-800 text-zinc-300 border border-zinc-700 ' +
      'hover:bg-zinc-700 focus:ring-zinc-600',

    // Destrutivo — vermelho
    destructive:
      'bg-red-500/15 text-red-400 border border-red-500/25 ' +
      'hover:bg-red-500/20 focus:ring-red-500',

    // Outline — apenas borda
    outline:
      'border border-zinc-700 bg-transparent text-zinc-300 ' +
      'hover:border-zinc-600 hover:text-white focus:ring-zinc-600',

    // Sucesso — verde
    success:
      'bg-green-500/15 text-green-400 border border-green-500/25 ' +
      'hover:bg-green-500/20 focus:ring-green-500',

    // Alerta — âmbar
    warning:
      'bg-amber-500/15 text-amber-400 border border-amber-500/25 ' +
      'hover:bg-amber-500/20 focus:ring-amber-500',
  }

  return (
    <div
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export { Badge }
