import { ReactNode } from 'react'

export function LoadingState(props: { label?: string }): JSX.Element
export function ErrorState(props: { message?: string | null; title?: string }): JSX.Element | null
export function EmptyResults(props: { icon?: ReactNode; title?: string; description?: string; action?: ReactNode }): JSX.Element
