import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: 'default' | 'gradient' | 'destructive' | 'danger-subtle' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {

    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black ' +
      'disabled:pointer-events-none disabled:opacity-40 select-none'

    const variants: Record<string, string> = {
      // Primário — indigo sólido, glow no hover
      default:
        'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 ' +
        'shadow-sm hover:shadow-glow',

      // Gradiente — indigo→purple (CTAs premium)
      gradient:
        'bg-gradient-to-r from-indigo-600 to-purple-600 text-white ' +
        'hover:from-indigo-500 hover:to-purple-500 active:from-indigo-700 active:to-purple-700 ' +
        'shadow-sm hover:shadow-glow',

      // Destrutivo — vermelho sólido
      destructive:
        'bg-red-500/90 text-white hover:bg-red-500 active:bg-red-600 ' +
        'shadow-sm',

      // Destrutivo sutil — fundo transparente, hover vermelho
      'danger-subtle':
        'bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white ' +
        'active:bg-red-700',

      // Outline — borda zinc, fundo transparente
      outline:
        'border border-zinc-700 bg-transparent text-zinc-200 ' +
        'hover:border-indigo-500/50 hover:bg-zinc-900 hover:text-white ' +
        'active:bg-zinc-800',

      // Secundário — superfície elevada
      secondary:
        'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:bg-zinc-600 ' +
        'border border-zinc-700 hover:border-zinc-600',

      // Ghost — sem fundo, só hover
      ghost:
        'bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white ' +
        'active:bg-zinc-800',

      // Link — texto indigo sublinhado
      link:
        'bg-transparent text-indigo-400 underline-offset-4 hover:text-indigo-300 ' +
        'hover:underline p-0 h-auto',
    }

    const sizes: Record<string, string> = {
      default: 'h-10 px-4 py-2 text-sm rounded-lg',
      sm:      'h-8  px-3      text-xs rounded-md',
      lg:      'h-11 px-6      text-sm rounded-xl',
      xl:      'px-8 py-3.5    text-base font-bold rounded-xl',
      icon:    'h-10 w-10 min-h-[44px] min-w-[44px] rounded-lg',
    }

    const classes = cn(baseStyles, variants[variant], sizes[size], className)

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: classes,
        ref,
      })
    }

    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button }
