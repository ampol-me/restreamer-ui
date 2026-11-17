import type * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = gold fill (one per view), secondary = outlined, ghost = text only */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** md = 44px touch target (default), sm = 32px for dense toolbars */
  size?: 'md' | 'sm';
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visible label — always required */
  label: string;
  /** Helper text under the input */
  hint?: string;
  /** Error text; replaces hint and marks the field invalid */
  error?: string;
}
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface CardProps {
  /** Small uppercase line above the title (gold-text) */
  eyebrow?: string;
  title?: string;
  children?: React.ReactNode;
  /** Actions row under a hairline */
  footer?: React.ReactNode;
  className?: string;
}
export declare function Card(props: CardProps): React.ReactElement;

export interface TallyBadgeProps {
  /** live = Program/ON AIR, preview = PVW, ready = armed, off = idle */
  state?: 'live' | 'preview' | 'ready' | 'off';
  /** Override the default word (LIVE / PVW / READY / OFF) — never leave it empty */
  label?: string;
  className?: string;
}
export declare function TallyBadge(props: TallyBadgeProps): React.ReactElement;

export interface LowerThirdProps {
  name: string;
  title?: string;
  /** Adds a red LIVE flag */
  live?: boolean;
  className?: string;
}
export declare function LowerThird(props: LowerThirdProps): React.ReactElement;

declare global {
  interface Window {
    Phila: {
      Button: typeof Button;
      TextField: typeof TextField;
      Card: typeof Card;
      TallyBadge: typeof TallyBadge;
      LowerThird: typeof LowerThird;
    };
  }
}
